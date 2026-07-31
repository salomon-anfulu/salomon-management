/**
 * ========================================
 * GitHub Cloud Sync - 兼职填报数据云端同步
 * 
 * 解决的问题：LocalStorage 是设备隔离的，兼职在手机上填写后
 * 管理员在电脑上看不到。通过 GitHub Contents API 实现跨设备数据同步。
 *
 * 工作原理：
 *   1. 每人填写 → 存 LocalStorage + 自动推送到 GitHub 共享文件
 *   2. 任何人打开系统 → 自动从 GitHub 拉取最新共享数据 → 合并到 LocalStorage
 *   3. 合并策略：availability 按人名逐字段合并；数组类数据按 id 去重
 *
 * Token 配置：首次使用需在登录页或设置页输入 GitHub Personal Access Token
 *   - 需要权限：repo (Contents: read & write)
 *   - 推荐使用 Fine-grained token，仅授权 salomon-anfulu/salomon-management
 * ========================================
 */

// v149: 刷新风暴断路器 — 若 index.html 标记了风暴，同步层进入降级 no-op，避免任何死循环
if (window.__PANIC_SYNC__) {
  console.error('[Sync] 刷新风暴断路器触发，同步已停用（no-op）。请关闭此标签页并重新打开以恢复正常。');
  window.Sync = {
    isEnabled: function () { return false; },
    push: function () { return false; },
    pull: function () { return Promise.resolve(false); },
    init: function () {},
    _updateIndicator: function () {},
    _initRealtime: function () {}
  };
}

const Sync = {
  REPO: 'salomon-anfulu/salomon-management',
  FILE_PATH: 'data/submissions.json',
  BRANCH: 'main',
  API_BASE: 'https://api.github.com',

  /** 是否已启用同步（有 Token 且验证通过） */
  _enabled: null,
  /** 上次同部拉取时间戳 */
  _lastPull: null,
  /** 拉取间隔（毫秒），避免频繁请求 */
  PULL_INTERVAL: 15000,
  /** push 失败后标记，下次 pull 成功时清除 */
  _pendingSync: false,
  /** 上次同步（push 或 pull）成功的时间戳，用于 UI 显示 */
  _lastSyncTime: null,
  /** push 正在进行中（防止 pull 拉到旧数据覆盖本地新写入） */
  _pushInFlight: false,
  /** v51: push 队列，防止并发 push 互相覆盖 */
  _pushQueue: [],
  _pushRunning: false,
  /** v51g: 上次 push 失败的错误信息，用于 manualSync 按钮精确反馈 */
  _lastPushError: null,

  // ===== v150: Supabase 同步通道状态 =====
  /** 上次写入 Supabase 的时间戳（回声防护：自己刚写入的 Realtime 回声忽略） */
  _lastSupabaseWriteTs: 0,
  /** app_data 表不存在则永久降级 GitHub（不刷日志） */
  _supabaseTableMissing: false,
  /** Realtime 频道引用 */
  _realtimeChannel: null,
  /** Realtime 防抖定时器 */
  _realtimeDebounce: null,
  /** 渲染风暴检测窗口起点 */
  _renderWindowStart: 0,
  /** 渲染风暴检测计数 */
  _renderCount: 0,
  /** Realtime 是否已初始化（防重复订阅） */
  _supabaseInitDone: false,

  /**
   * 获取存储的 Token
   * P0-3 fix: localStorage 持久化 + base64 混淆（非明文，防遍历工具直接读取）
   * - 持久化: 关闭浏览器后仍然有效，无需每次重新输入
   * - base64: 防止 LocalStorage 遍历工具直接读到明文（非加密，仅混淆）
   * - 向后兼容: 自动迁移旧 localStorage 明文 token
   */
  _tokenKey: 'gh_sync_token_v2',

  getToken() {
    // 优先从内存变量读取
    if (this._tokenCache) return this._tokenCache;
    // 从 localStorage 读取（base64 编码）
    let raw = null;
    try { raw = localStorage.getItem(this._tokenKey); } catch(e) {}
    if (raw) {
      try {
        // base64 解码
        const decoded = decodeURIComponent(escape(atob(raw)));
        this._tokenCache = decoded;
        return decoded;
      } catch(e) {
        // 解码失败，清除脏数据
        try { localStorage.removeItem(this._tokenKey); } catch(e2) {}
      }
    }
    // 向后兼容：迁移旧的 localStorage 明文 token
    try {
      const legacyToken = localStorage.getItem('gh_sync_token');
      if (legacyToken) {
        this.setToken(legacyToken);
        localStorage.removeItem('gh_sync_token');
        return legacyToken;
      }
    } catch(e) {}
    return null;
  },

  /**
   * 保存 Token
   */
  setToken(token) {
    this._tokenCache = token;
    try {
      if (token) {
        // base64 编码后存入 localStorage（持久化）
        const encoded = btoa(unescape(encodeURIComponent(token)));
        localStorage.setItem(this._tokenKey, encoded);
      } else {
        localStorage.removeItem(this._tokenKey);
      }
    } catch(e) {
      console.error('[Sync] Token 保存失败:', e);
    }
    this._enabled = !!token;
  },

  /**
   * 清除 Token
   */
  clearToken() {
    this._tokenCache = null;
    try { localStorage.removeItem(this._tokenKey); } catch(e) {}
    try { localStorage.removeItem('gh_sync_token'); } catch(e) {} // 清理旧版
    this._enabled = false;
  },

  /**
   * 检查同步是否可用
   */
  isEnabled() {
    if (this._enabled !== null) return this._enabled;
    this._enabled = !!this.getToken();
    return this._enabled;
  },

  /**
   * API 请求封装
   */
  async _api(method, url, body) {
    const token = this.getToken();
    if (!token) throw new Error('未配置GitHub Token');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    const opts = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const resp = await fetch(url, opts);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err.message || `HTTP ${resp.status}`;
      throw new Error(`GitHub API错误: ${msg}`);
    }

    return resp.json();
  },

  /**
   * 快照当前关键数据用于比较（v51c 重写）
   * 用于 pull 后判断是否有新数据需要刷新页面
   * 关键：必须深入到实际数据内容层面，不能只看顶层 key 数量
   */
  _snapshotForCompare() {
    try {
      const parts = [];

      // availability: 遍历 months → data → 每人的 dates 数量 + 最新 _updatedAt
      const avail = Store.get('availability');
      if (avail && avail.months) {
        Object.entries(avail.months).forEach(([mk, mv]) => {
          if (!mv || !mv.data) return;
          const persons = Object.keys(mv.data);
          // 每人 dates 条数 + 最后一条的 _updatedAt
          persons.forEach(name => {
            const p = mv.data[name];
            const dateVals = p?.dates ? Object.values(p.dates) : [];
            const dateCount = dateVals.length;
            // Math.max() 无参数返回 -Infinity，用兜底 0 避免
            const ts = dateVals.length > 0 ? Math.max(...dateVals.map(d => d._updatedAt || 0)) : 0;
            parts.push(`${mk}/${name}:${dateCount}:${ts}`);
          });
        });
      }

      // staff: 每条记录的 id + name（v58: 修复遗漏——原来不追踪 staff 变化，
      // 导致 pull 合并了新 staff 后 dataChanged=false，页面不刷新，其他端看不到新人）
      const staffArr = Store.get('staff');
      if (staffArr && Array.isArray(staffArr)) {
        staffArr.forEach(s => {
          if (s) parts.push(`staff#${s.id || '?'}:${s.name || ''}`);
        });
      }

      // 数组类数据: 每条记录的 id + _updatedAt
      ['shiftChanges', 'storeSupport', 'doorSchedule', 'customerReviews'].forEach(k => {
        const arr = Store.get(k);
        if (arr && Array.isArray(arr)) {
          arr.forEach(item => {
            if (item) parts.push(`${k}#${item.id || item.date || '?'}:${item._updatedAt || 0}`);
          });
        }
      });

      return parts.join('|');
    } catch (e) {
      return '';
    }
  },

  /**
   * v52: 乱码人名守卫
   * 检测一个字符串是否是 UTF-8 编码错误产生的乱码
   * 乱码特征：包含 Latin-1 补充区字符（Ã, Â, § 等）且不包含正常中文
   * @param {string} name - 待检测的人名
   * @returns {boolean} true=有效，false=乱码
   */
  _isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    // 空字符串或纯空白
    if (name.trim().length === 0) return false;
    // v63: 扩展 Latin-1 乱码检测范围（Ã, Â, §, ©, ç, æ, ¤ 等）
    if (/[\u00a0-\u00ff]{2,}/.test(name)) return false;
    // 包含大量非打印/控制字符
    if (/[\u0000-\u001f]{3,}/.test(name)) return false;
    // v63: 名字中不该出现大量非中文/ASCII 字符
    const nonCjkAsciiCount = (name.match(/[^\u4e00-\u9fa5a-zA-Z0-9·\s\-']/g) || []).length;
    if (nonCjkAsciiCount >= 3) return false;
    return true;
  },

  /**
   * v63: 规范化 availability 数据结构
   * 历史问题：某些版本中 availability 被写成 { '2026-06': { data: {...} } }
   * 而标准结构应为 { currentMonth: '...', months: { '2026-06': { data: {...} } } }
   * 此函数自动把扁平结构迁移到标准结构，并清理乱码 key / 超大 note
   */
  _normalizeAvailabilityStructure(avail) {
    if (!avail || typeof avail !== 'object') {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return { currentMonth: defaultMonth, months: {} };
    }

    const normalized = { currentMonth: avail.currentMonth || '2026-07', months: {} };

    // 1. 先迁移标准 months 结构
    if (avail.months && typeof avail.months === 'object') {
      Object.entries(avail.months).forEach(([mk, mv]) => {
        if (mv && mv.data && typeof mv.data === 'object') {
          normalized.months[mk] = { data: this._cleanPersonMap(mv.data) };
        }
      });
    }

    // 2. 迁移扁平结构（旧格式）
    Object.entries(avail).forEach(([mk, mv]) => {
      if (mk === 'currentMonth' || mk === 'months') return;
      if (!mv || typeof mv !== 'object') return;

      const personMap = mv.data && typeof mv.data === 'object' ? mv.data : mv;
      if (!normalized.months[mk]) {
        normalized.months[mk] = { data: {} };
      }
      const cleaned = this._cleanPersonMap(personMap);
      Object.entries(cleaned).forEach(([name, pdata]) => {
        if (!normalized.months[mk].data[name]) {
          normalized.months[mk].data[name] = pdata;
        } else {
          normalized.months[mk].data[name] = this._mergePersonData(normalized.months[mk].data[name], pdata);
        }
      });
    });

    return normalized;
  },

  /**
   * v63: 清理 person map 中的乱码 key / 超大 note
   */
  _cleanPersonMap(personMap) {
    const result = {};
    Object.entries(personMap).forEach(([rawName, pdata]) => {
      if (!this._isValidName(rawName)) {
        console.warn('[Sync] 清理乱码人名:', rawName.slice(0, 30));
        return;
      }
      result[rawName] = this._cleanPersonData(pdata);
    });
    return result;
  },

  /**
   * v63: 清理单个 person 数据中的超大 note / 乱码
   */
  _cleanPersonData(pdata) {
    if (!pdata || typeof pdata !== 'object') {
      return { total: 0, unavailable: [], note: '', dates: {} };
    }
    const cleaned = JSON.parse(JSON.stringify(pdata));

    // note 长度上限 500，超长则截断
    if (cleaned.note && typeof cleaned.note === 'string') {
      // 如果 note 包含乱码且超长，直接清空（避免污染）
      if (cleaned.note.length > 1000 && /[\u00a0-\u00ff]{2,}/.test(cleaned.note)) {
        cleaned.note = '';
        cleaned._noteUpdatedAt = Date.now();
      } else if (cleaned.note.length > 500) {
        cleaned.note = cleaned.note.slice(0, 500);
      }
    }

    // dates 中的 note 也要限制
    if (cleaned.dates && typeof cleaned.dates === 'object') {
      Object.values(cleaned.dates).forEach(d => {
        if (d && typeof d === 'object' && d.note && d.note.length > 200) {
          d.note = d.note.slice(0, 200);
        }
      });
    }

    return cleaned;
  },

  /**
   * v63: 合并两个 person 数据（按 _updatedAt 取最新）
   */
  _mergePersonData(target, source) {
    const merged = JSON.parse(JSON.stringify(target));

    if (source.dates && typeof source.dates === 'object') {
      if (!merged.dates) merged.dates = {};
      Object.entries(source.dates).forEach(([dk, dv]) => {
        const existing = merged.dates[dk];
        if (!existing || (dv._updatedAt || 0) > (existing._updatedAt || 0)) {
          merged.dates[dk] = dv;
        }
      });
    }

    if (source.unavailable && Array.isArray(source.unavailable)) {
      if (!merged.unavailable) merged.unavailable = [];
      source.unavailable.forEach(d => {
        if (!merged.unavailable.includes(d)) merged.unavailable.push(d);
      });
    }

    if (source.note !== undefined) {
      const sTs = source._noteUpdatedAt || 0;
      const tTs = merged._noteUpdatedAt || 0;
      if (!merged.note || sTs > tTs) {
        merged.note = source.note;
        merged._noteUpdatedAt = sTs || Date.now();
      }
    }

    if ('total' in source) {
      merged.total = Math.max(merged.total || 0, source.total || 0);
    }

    return merged;
  },

  /**
   * 从 GitHub 拉取共享文件
   * @returns {object} 共享数据对象，失败返回 null
   */
  async _fetchSharedData() {
    const url = `${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}?ref=${this.BRANCH}`;
    const fileData = await this._api('GET', url);

    if (!fileData.content) {
      // v52: GitHub Contents API 对 >1MB 的文件不返回 content 字段
      const sizeMB = fileData.size ? (fileData.size / 1024 / 1024).toFixed(2) : '?';
      if (fileData.size && fileData.size > 1000000) {
        throw new Error(`共享文件过大(${sizeMB}MB)，超过GitHub API 1MB限制，请联系管理员清理数据`);
      }
      console.warn('[Sync] 共享文件为空');
      return null;
    }

    // GitHub API 返回 base64 编码内容
    // 必须用 decodeURIComponent(escape(atob())) 解码 UTF-8（与 push 端的 btoa(unescape(encodeURIComponent())) 配对）
    // v45: 额外加一层双重 UTF-8 防御（修复 v5 force-push 时的历史脏数据）
    const jsonStr = (() => {
      const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
      // 检测双重 UTF-8 编码（字符串中含 Latin-1 范围连续字符）：尝试修复
      // Latin-1 范围 (\u00c0-\u00ff) 连续 2+ 出现 + 不含正常中文字符 → 高度疑似双重编码
      if (/[\u00c0-\u00ff]{2,}/.test(decoded) && !/[\u4e00-\u9fff]/.test(decoded)) {
        try {
          const fixed = decoded.split('').map(ch => {
            const code = ch.charCodeAt(0);
            if (code >= 0xc0 && code <= 0xff) return String.fromCharCode(code & 0xff);
            return ch;
          }).join('');
          const redecoded = decodeURIComponent(escape(fixed));
          if (/[\u4e00-\u9fff]/.test(redecoded)) {
            console.log('[Sync] 检测到双重 UTF-8 编码，已自动修复');
            return redecoded;
          }
        } catch (e) {}
      }
      return decoded;
    })();
    const data = JSON.parse(jsonStr);

    // 同时返回 sha（后续写回时需要）
    data.__sha = fileData.sha;
    return data;
  },

  /**
   * v52: 删除云端文件（用于修复 >1MB 污染数据）
   * 需要先获取 SHA 才能删除
   */
  async _deleteRemoteFile() {
    const url = `${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}?ref=${this.BRANCH}`;
    const fileData = await this._api('GET', url);
    if (!fileData.sha) throw new Error('无法获取云端文件SHA');

    const body = {
      message: 'sync: 自动清理过大的污染文件 [recovery]',
      sha: fileData.sha,
      branch: this.BRANCH,
    };
    await this._api('DELETE', url, body);
    console.log('[Sync] 云端文件已删除');
  },

  /**
   * 拉取共享数据并合并到 LocalStorage
   * 静默执行，失败不影响正常使用
   * @param {boolean} silent - 是否静默（不弹 toast）
   * @param {boolean} force - v51c: 强制拉取，跳过 PULL_INTERVAL 防抖（手动同步按钮使用）
   */
  async pull(silent = true, force = false) {
    // v150: 纯 Supabase 模式（GitHub 未配置但 Supabase 在线）→ 走 Supabase 拉取
    if (this._supabaseEnabled() && !this.isEnabled()) {
      return this._pullFromSupabase(silent);
    }
    if (!this.isEnabled()) {
      if (!silent) showToast('未配置同步Token，请先在设置中配置', 'warning');
      return false;
    }

    // v47d: 如果 push 正在进行中，跳过 pull（防止 push 还没写完云端时 pull 拉到旧数据覆盖本地）
    if (this._pushInFlight) {
      console.log('[Sync] push 正在进行中，跳过本次 pull');
      return true;
    }

    // 防止频繁拉取（v51c: force 参数可绕过）
    if (!force && this._lastPull && (Date.now() - this._lastPull) < this.PULL_INTERVAL) {
      return true;
    }

    try {
      const shared = await this._fetchSharedData();
      if (!shared) return false;

      // v59b: pull 前显式记录 staff 数量，不依赖 _snapshotForCompare
      const beforeStaffCount = (Store.get('staff') || []).length;
      const beforeStr = this._snapshotForCompare();
      this._mergeIntoLocal(shared);
      const afterStr = this._snapshotForCompare();
      const afterStaffCount = (Store.get('staff') || []).length;
      const dataChanged = beforeStr !== afterStr;
      // v59b: staff 数量变化是硬性条件——即使快照对比遗漏也强制视为有变化
      const staffChanged = beforeStaffCount !== afterStaffCount;

      this._lastPull = Date.now();
      this._lastSyncTime = Date.now();
      // 如果之前有 push 失败，pull 成功后触发一次补偿推送
      if (this._pendingSync) {
        console.log('[Sync] 检测到待同步数据，触发补偿推送');
        this._pendingSync = false;
        this.push('auto-retry').catch(() => { this._pendingSync = true; });
      }
      console.log('[Sync] 拉取成功', new Date().toLocaleTimeString(), (dataChanged || staffChanged) ? '(有新数据)' : '(无变化)', staffChanged ? `[staff: ${beforeStaffCount}→${afterStaffCount}]` : '');

      // v51: 如果数据有变化，触发页面刷新（用户B才能看到用户A的填报）
      // v59b: staffChanged 也作为硬性触发条件
      if ((dataChanged || staffChanged) && typeof Router !== 'undefined' && Router.render) {
        // 延迟一帧执行，避免在 fetch 回调中直接操作 DOM
        requestAnimationFrame(() => {
          try {
            Router.render();
            console.log('[Sync] 数据已更新，页面已自动刷新');
          } catch (e) {
            console.warn('[Sync] 自动刷新页面失败:', e.message);
          }
        });
      }
      // v150: GitHub 拉取成功后，补充 Supabase 拉取（hash 比较防重复 render）
      if (this._supabaseEnabled()) {
        this._pullFromSupabase(true).catch(() => {});
      }
      return true;
    } catch (e) {
      console.warn('[Sync] 拉取失败:', e.message);
      if (!silent) showToast('同步拉取失败: ' + e.message, 'warning');
      return false;
    }
  },

  // ===== v150: Supabase 同步通道（安全重接，三重防循环） =====

  /** Supabase 是否可用（在线 + 非风暴 + 表未缺失） */
  _supabaseEnabled() {
    if (window.__PANIC_SYNC__) return false;
    return typeof SbClient !== 'undefined' && SbClient.isOnline && SbClient.isOnline() && !this._supabaseTableMissing;
  },

  /**
   * 统一应用远端数据：合并到本地 + 必要时 render
   * 带渲染锁(window.__applyingRemote) + 渲染次数上限（防风暴）
   * 所有通道（GitHub / Supabase / Realtime）的远端数据都经此入口，保证一致防护
   */
  async _applyRemoteData(remoteBlob, source) {
    if (!remoteBlob) return false;
    if (window.__applyingRemote) return false; // 已在应用远端，防重入
    const beforeStr = this._snapshotForCompare();
    const beforeStaff = (Store.get('staff') || []).length;
    // 渲染锁置位：合并期间 + 紧随的 render 内副作用不会触发 Supabase push（破循环关键）
    window.__applyingRemote = true;
    try {
      this._mergeIntoLocal(remoteBlob);
    } finally {
      // 下一帧解除锁，确保 render 的微任务副作用也受保护
      setTimeout(() => { window.__applyingRemote = false; }, 0);
    }
    const afterStr = this._snapshotForCompare();
    const afterStaff = (Store.get('staff') || []).length;
    const changed = beforeStr !== afterStr || beforeStaff !== afterStaff;
    if (changed) {
      console.log('[Sync] ' + (source || 'remote') + ' 数据已合并' + (source === 'supabase' ? '（来自 Supabase）' : ''));
      this._maybeRender();
      // v153: 通知订阅者远端数据已合并（用于强制改密检查等扩展点）
      try { window.dispatchEvent(new CustomEvent('app:remote-synced', { detail: { source: source || 'remote' } })); } catch (e) {}
    }
    return changed;
  },

  /** 带上限的 render（8 秒内 > 6 次视为风暴，触发断路器） */
  _maybeRender() {
    const now = Date.now();
    if (!this._renderWindowStart || (now - this._renderWindowStart) > 8000) {
      this._renderWindowStart = now;
      this._renderCount = 0;
    }
    this._renderCount = (this._renderCount || 0) + 1;
    if (this._renderCount > 6) {
      console.error('[Sync] 检测到异常高频刷新（风暴），触发断路器停用同步。请关闭此标签页重新打开。');
      window.__PANIC_SYNC__ = true;
      this._updateIndicator();
      return;
    }
    if (typeof Router !== 'undefined' && Router.render) {
      requestAnimationFrame(() => {
        try { Router.render(); } catch (e) { console.warn('[Sync] render 失败:', e.message); }
      });
    }
  },

  /** 从 Supabase 拉取并应用（独立通道 or Realtime 触发） */
  async _pullFromSupabase(silent = true) {
    if (!this._supabaseEnabled()) return false;
    try {
      const { data, error } = await SbClient.appData.get();
      if (error) {
        if (/does not exist|relation "app_data"/.test(error.message || '')) {
          this._supabaseTableMissing = true;
          console.warn('[Sync] app_data 表不存在，Supabase 同步降级为 GitHub 兜底');
        } else {
          console.warn('[Sync] Supabase 拉取失败:', error.message);
        }
        return false;
      }
      if (!data) return false;
      await this._applyRemoteData(data, 'supabase');
      this._lastPull = Date.now();
      this._lastSyncTime = Date.now();
      return true;
    } catch (e) {
      console.warn('[Sync] Supabase 拉取异常:', e.message);
      return false;
    }
  },

  /** 推送本地数据到 Supabase（独立通道，last-write-merge） */
  async _pushToSupabase(changedBy) {
    if (!this._supabaseEnabled() || window.__applyingRemote || this._supabaseTableMissing) return false;
    // 回声防护：记录写入时间戳，Realtime 回声在窗口内会被忽略
    this._lastSupabaseWriteTs = Date.now();
    try {
      const { data: remote, error: getErr } = await SbClient.appData.get();
      if (getErr) {
        if (/does not exist|relation "app_data"/.test(getErr.message || '')) {
          this._supabaseTableMissing = true;
          console.warn('[Sync] app_data 表不存在，Supabase 同步降级为 GitHub 兜底');
        }
        return false;
      }
      const base = remote || { _meta: { version: 0 }, availability: {}, staff: [], shiftChanges: [], storeSupport: [], doorSchedule: [] };
      // 复用 GitHub 的合并逻辑：把本地最新数据合入 base
      this._mergeLocalIntoShared(base);
      const { error } = await SbClient.appData.save(base, changedBy || 'unknown');
      if (error) {
        if (/does not exist|relation "app_data"/.test(error.message || '')) {
          this._supabaseTableMissing = true;
          console.warn('[Sync] app_data 表不存在，Supabase 同步降级为 GitHub 兜底');
        } else {
          console.warn('[Sync] Supabase 推送失败:', error.message);
        }
        return false;
      }
      console.log('[Sync] Supabase 推送成功 @', new Date().toLocaleTimeString());
      return true;
    } catch (e) {
      console.warn('[Sync] Supabase 推送异常:', e.message);
      return false;
    }
  },

  /** 初始化 Realtime 订阅（回声防护 + 防抖触发 pull，绝不直接 render） */
  _initRealtime() {
    if (!this._supabaseEnabled() || this._supabaseTableMissing || this._realtimeChannel) return;
    if (typeof SbClient.subscribe !== 'function') return;
    this._realtimeChannel = SbClient.subscribe('app_data', (payload) => {
      // ① 回声防护：自己刚 push 的变更在 3s 窗口内忽略
      if (this._lastSupabaseWriteTs && (Date.now() - this._lastSupabaseWriteTs) < 3000) {
        console.log('[Sync] Realtime 回声忽略（自己刚写入）');
        return;
      }
      // ② 不直接 render：防抖触发 pull，由 _applyRemoteData 统一处理
      if (this._realtimeDebounce) clearTimeout(this._realtimeDebounce);
      this._realtimeDebounce = setTimeout(() => {
        this._pullFromSupabase(true).catch(() => {});
      }, 800);
    });
    console.log('[Sync] Realtime 订阅已建立 (app_data)');
  },

  /**
   * 保存后推送数据到 GitHub
   * v51: 队列化，多次快速保存只产生一次有效 push（最后一条包含所有本地数据）
   * 冲突重试策略：最多 3 轮"拉-合-写"，每轮失败都重新拉取最新 SHA
   */
  async push(changedBy) {
    // v150: Supabase 独立通道——无论 GitHub 是否启用，在线即并行推送（fire-and-forget，不阻塞）
    if (this._supabaseEnabled() && !this._supabaseTableMissing) {
      this._pushToSupabase(changedBy).catch(() => {});
    }
    if (!this.isEnabled()) return false;

    // v51: 入队而非直接执行
    this._pushQueue.push(changedBy || 'unknown');

    // 如果已有 push 在运行，等它完成后自然会处理队列中最新的一条
    if (this._pushRunning) {
      console.log(`[Sync] push 队列: 已有 push 进行中，排队 (队列长度: ${this._pushQueue.length})`);
      return true;
    }

    return this._processPushQueue();
  },

  /**
   * v51: 实际执行 push 的内部方法
   * 循环处理队列，但每轮只取最后一条（合并了所有中间请求）
   */
  async _processPushQueue() {
    this._pushRunning = true;
    this._pushInFlight = true;

    // 记录最终结果：默认成功，失败时改为 false
    let finalResult = true;

    while (this._pushQueue.length > 0) {
      // v65: 先拷贝引用再清空，避免 push() 在清空瞬间写入被丢弃
      const queue = this._pushQueue;
      this._pushQueue = [];
      // 取最后一条（之前的请求中包含的数据已经被后续保存覆盖了）
      const changedBy = queue[queue.length - 1];

      const result = await this._doPush(changedBy);
      if (result !== true) {
        // push 失败，标记待同步，退出循环（下次 pull 成功后补偿）
        this._pendingSync = true;
        finalResult = false;  // v51g: 修复 _processPushQueue 永远返回 true 的 bug
        break;
      }
      // 成功后短暂等待（100ms），让可能新入队的请求有机会被收集
      if (this._pushQueue.length > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    this._pushRunning = false;
    this._pushInFlight = false;
    return finalResult;
  },

  /**
   * v51: 实际推送逻辑（从原 push 方法拆出）
   */
  async _doPush(changedBy) {

    const MAX_ROUNDS = 3;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        // 1. 拉取最新云端数据 + SHA
        let shared = null;
        let sha = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            shared = await this._fetchSharedData();
            sha = shared?.__sha || null;
            if (shared) delete shared.__sha;
            break;
          } catch (e) {
            if (e.message.includes('Not Found') || e.message.includes('404')) {
              shared = { _meta: { version: 0 }, availability: {}, staff: [], shiftChanges: [], storeSupport: [], doorSchedule: [] };
              sha = null;
              break;
            }
            // v52: 云端文件过大（>1MB GitHub API 限制）→ 视为污染数据，先删除再重建
            if (e.message.includes('超过GitHub API 1MB限制') || e.message.includes('共享文件过大')) {
              console.warn('[Sync] 云端文件过大，视为污染数据，将删除后重建');
              await this._deleteRemoteFile().catch(delErr => {
                console.warn('[Sync] 删除云端文件失败:', delErr.message);
                throw new Error('云端文件过大且无法删除，请联系管理员手动处理');
              });
              shared = { _meta: { version: 0 }, availability: {}, staff: [], shiftChanges: [], storeSupport: [], doorSchedule: [] };
              sha = null;
              break;
            }
            if (e.message.includes('does not match') && attempt === 0) {
              // 拉取时 SHA 不匹配，强制重试
              continue;
            }
            throw e;
          }
        }
        if (!shared) throw new Error('无法拉取云端数据');

        // 2. 合入本地最新数据
        this._mergeLocalIntoShared(shared);

        // 3. 更新时间戳
        shared._meta.lastUpdated = new Date().toISOString();
        shared._meta.lastUpdatedBy = changedBy || 'unknown';
        shared._meta.version = (shared._meta.version || 0) + 1;

        // 4. 写回 GitHub
        const body = {
          message: `sync: ${changedBy || 'unknown'} 更新数据 [v${shared._meta.version}]`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(shared, null, 2)))),
          branch: this.BRANCH,
        };
        if (sha) body.sha = sha;

        const url = `${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}`;
        try {
          await this._api('PUT', url, body);
          // 成功
          console.log('[Sync] 推送成功 v' + shared._meta.version + (round > 0 ? ` (第${round + 1}轮重试)` : ''));
          this._pendingSync = false;
          this._lastSyncTime = Date.now();
          return true;
        } catch (putErr) {
          if (putErr.message.includes('does not match') || putErr.message.includes('409')) {
            // 本轮冲突，下一轮重新拉最新 SHA 再试
            console.warn(`[Sync] 写回冲突 (第${round + 1}/${MAX_ROUNDS}轮)，准备重试...`);
            this._lastPull = null;
            continue;
          }
          throw putErr;
        }
      }
      // 3 轮都冲突 → 拉一次云端验证数据是否已写入
      console.log('[Sync] 3轮冲突重试均未成功，验证云端是否已有数据...');
      const verified = await this._verifyDataInCloud();
      if (verified) {
        // 数据已在云端（某轮 PUT 实际成功只是响应延迟，或他人包含了同样改动）
        console.log('[Sync] 云端验证通过，数据已同步');
        this._pendingSync = false;
        this._lastSyncTime = Date.now();
        return true;
      }
      // 云端确实没有，标记待同步，下次 pull 成功后自动补偿
      throw new Error('continuous_sh conflict');
    } catch (e) {
      // v51: _pushInFlight 由 _processPushQueue 统一管理，这里不释放
      if (e.message === 'continuous_sh conflict') {
        // 确实是暂时性冲突，静默标记，不弹 toast 打扰用户
        console.log('[Sync] 云端暂无此数据，已标记待同步，将在下次自动补偿');
        this._pendingSync = true;
      } else {
        console.warn('[Sync] 推送失败:', e.message);
        this._pendingSync = true;
        // v51g: 记录错误消息，manualSync 按钮检测到不再重复 toast
        this._lastPushError = e.message || '未知错误';
        // 自动保存场景需要 toast（用户没有其他反馈渠道）
        // manualSync 主动点击会自己 toast 详细分类提示，所以这里 toast 简短版
        if (typeof _suppressInternalToast === 'undefined' || !_suppressInternalToast) {
          const msg = this._lastPushError;
          if (msg.includes('401') || msg.includes('Bad credentials')) {
            showToast('☁️ 同步失败: Token无效，请在设置中重新配置', 'error');
          } else if (msg.includes('403') || msg.includes('resource not accessible')) {
            showToast('☁️ 同步失败: Token权限不足，需开启 Contents → Read & Write', 'error');
          } else {
            showToast('☁️ 同步未成功: ' + msg, 'warning');
          }
        }
      }
      // 统一返回 false（历史遗留曾返回 { success: false }，现已统一为布尔值）
      return false;
    }
  },

  /**

  /**
   * v67: 合并单个 person 的 availability 数据（pull/push 双方复用）
   * @param {object} target - 被合并到的目标 person 数据（原地修改）
   * @param {object} source - 合并来源的 person 数据
   * @param {object} opts
   * @param {boolean} opts.sourceWinsTie - _updatedAt 相同时 source 是否覆盖 target
   * @param {string} opts.direction - 'pull' | 'push'（日志用）
   */
  _mergePersonAvailability(target, source, opts) {
    if (!source || !target) return;

    const { sourceWinsTie = false, direction = 'pull' } = opts || {};

    // 合并 dates
    if (source.dates && typeof source.dates === 'object') {
      if (!target.dates || typeof target.dates !== 'object') target.dates = {};
      Object.entries(source.dates).forEach(([dateKey, sourceVal]) => {
        const targetVal = target.dates[dateKey];
        if (!targetVal) {
          target.dates[dateKey] = sourceVal;
        } else {
          const sTs = sourceVal._updatedAt || 0;
          const tTs = targetVal._updatedAt || 0;
          if (sourceWinsTie ? sTs >= tTs : sTs > tTs) {
            target.dates[dateKey] = sourceVal;
          }
        }
      });
    }

    // 合并备注（按 _noteUpdatedAt 时间戳，取较新版本）
    if (source.note !== undefined) {
      const sTs = source._noteUpdatedAt || 0;
      const tTs = target._noteUpdatedAt || 0;
      if (!target.note || sTs > tTs) {
        target.note = source.note;
        target._noteUpdatedAt = sTs || Date.now();
      }
    }

    // 更新 total/unavailable
    if (target.dates && Object.keys(target.dates).length > 0) {
      let avail = 0;
      Object.values(target.dates).forEach(d => { if (d.available && !d._deleted) avail++; });
      target.total = avail;
      target.unavailable = Object.entries(target.dates)
        .filter(([_, v]) => !v.available && !v._deleted)
        .map(([k]) => k);
    } else if (source.total && !target.total) {
      target.total = source.total;
    }
  },

  /**
   * 将共享数据合并到 LocalStorage
   * 合并策略：availability 按人名深度合并（保留 dates 字段）；
   *           数组类数据按 id 去重
   */
  _mergeIntoLocal(shared) {
    // === 人员信息 (staff) — 按 id 合并，最先处理，让 staff 名称早于 availability/shiftChanges 解析 ===
    if (shared.staff && Array.isArray(shared.staff) && shared.staff.length > 0) {
      const local = Store.get('staff') || [];
      const localCount = local.length;
      const staffMap = new Map();
      local.forEach(s => staffMap.set(s.id, { ...s }));
      shared.staff.forEach(cloud => {
        if (!cloud || !cloud.id) return;
        const existing = staffMap.get(cloud.id);
        if (existing) {
          // 合并字段：云端非空字段覆盖本地
          Object.keys(cloud).forEach(key => {
            if (key === 'id') return;
            if (cloud[key] !== null && cloud[key] !== undefined && cloud[key] !== '') {
              existing[key] = cloud[key];
            }
          });
          staffMap.set(cloud.id, existing);
        } else {
          staffMap.set(cloud.id, cloud);
        }
      });
      const merged = Array.from(staffMap.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
      // v58: staff 合并日志——便于诊断"新兼职不同步"问题
      if (merged.length !== localCount) {
        const newNames = merged.filter(m => !local.find(l => l.id === m.id)).map(m => m.name);
        console.log(`[Sync] staff 合并: ${localCount} → ${merged.length} (新增: ${newNames.join(', ') || '无'})`);
      }
      Store.set('staff', merged);
    }

    // === 可上班时间 (availability) — v67: 抽取 _mergePersonAvailability 复用 ===
    if (shared.availability && Object.keys(shared.availability).length > 0) {
      let localAvail = this._normalizeAvailabilityStructure(Store.get('availability'));

      Object.entries(shared.availability).forEach(([monthKey, monthData]) => {
        if (!monthData || !monthData.data) return;
        if (!localAvail.months[monthKey]) localAvail.months[monthKey] = { data: {} };

        const localMonthData = localAvail.months[monthKey].data;
        Object.entries(monthData.data).forEach(([sharedName, sharedPerson]) => {
          if (!Sync._isValidName(sharedName)) {
            console.warn('[Sync] 拉取时跳过乱码人名:', sharedName.slice(0, 30));
            return;
          }
          const cleanedShared = this._cleanPersonData(JSON.parse(JSON.stringify(sharedPerson)));

          if (!localMonthData[sharedName]) {
            localMonthData[sharedName] = cleanedShared;
            console.log(`[Sync] 拉取新增: ${monthKey} / ${sharedName}`);
            return;
          }

          // v67: 共用合并逻辑
          this._mergePersonAvailability(localMonthData[sharedName], cleanedShared, {
            sourceWinsTie: false, direction: 'pull'
          });
        });
      });

      Store.set('availability', localAvail);
    }

    // === v68: 数组合并统一循环 ===
    const _arrayMergeConfig = [
      { storeKey: 'shiftChanges', mergeFn: '_mergeArraysById', deletedKey: 'shiftChanges' },
      { storeKey: 'storeSupport', mergeFn: '_mergeArraysById', deletedKey: 'storeSupport' },
      { storeKey: 'doorSchedule', mergeFn: '_mergeArraysByDate', deletedKey: '_doorSlots' },
      { storeKey: 'customerReviews', mergeFn: '_mergeArraysById', deletedKey: 'customerReviews' },
    ];
    _arrayMergeConfig.forEach(({ storeKey, mergeFn, deletedKey }) => {
      const sharedArray = shared[storeKey];
      if (sharedArray && sharedArray.length > 0) {
        const local = Store.get(storeKey) || [];
        const deletedArg = deletedKey === '_doorSlots'
          ? this._getDeletedDoorSlots(shared)
          : this._getDeletedIds(shared, deletedKey);
        const merged = this[mergeFn](local, sharedArray, deletedArg);
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          Store.set(storeKey, merged);
        }
      }
    });

    // v54: 同步本地 _deletedIds 缓存（用于本地删除时也能防复活）
    if (shared._deletedIds) {
      const localDeleted = Store.get('__deletedIds') || {};
      let changed = false;
      Object.keys(shared._deletedIds).forEach(col => {
        if (col === '_meta') return;
        const cloudIds = shared._deletedIds[col] || [];
        const localIds = localDeleted[col] || [];
        cloudIds.forEach(id => {
          if (!localIds.includes(id)) {
            localIds.push(id);
            changed = true;
          }
        });
        if (localIds.length > 0) localDeleted[col] = localIds;
      });
      if (shared._deletedDoorSlots) {
        localDeleted._doorSlots = localDeleted._doorSlots || {};
        Object.entries(shared._deletedDoorSlots).forEach(([date, times]) => {
          const existing = localDeleted._doorSlots[date] || [];
          (times || []).forEach(t => {
            if (!existing.includes(t)) { existing.push(t); changed = true; }
          });
          if (existing.length > 0) localDeleted._doorSlots[date] = existing;
        });
      }
      if (changed) Store.set('__deletedIds', localDeleted);
    }

    // === 人员档案变更 (staff) — v47 新增：非填报类的 staff 编辑（人员管理页） ===
    // 注: 上方 availability/staff 合并已处理填报路径，此处不再重复

    // 注: staff 合并已在上方完成（字段级），不再重复处理（v46 移除冗余）
  },

  /**
   * 导出本地数据为 JSON 字符串
   * 用法：const json = Sync.exportLocal(); 下载或复制
   */
  exportLocal() {
    const dump = {
      _meta: {
        description: '本地数据导出',
        exportedAt: new Date().toISOString(),
        source: 'local'
      },
      availability: Store.get('availability'),
      staff: Store.get('staff') || [],
      shiftChanges: Store.get('shiftChanges') || [],
      storeSupport: Store.get('storeSupport') || [],
      doorSchedule: Store.get('doorSchedule') || [],
    };
    return JSON.stringify(dump, null, 2);
  },

  /**
   * 从 JSON 字符串导入数据到 LocalStorage
   */
  importLocal(jsonStr) {
    try {
      const dump = JSON.parse(jsonStr);
      if (dump.availability) Store.set('availability', dump.availability);
      if (dump.shiftChanges) Store.set('shiftChanges', dump.shiftChanges);
      if (dump.storeSupport) Store.set('storeSupport', dump.storeSupport);
      if (dump.doorSchedule) Store.set('doorSchedule', dump.doorSchedule);
      if (dump.staff) Store.set('staff', dump.staff);
      console.log('[Sync] 导入成功');
      return { ok: true, data: dump };
    } catch (e) {
      console.error('[Sync] 导入失败:', e);
      return { ok: false, error: e.message };
    }
  },

  /**
   * 下载本地数据为 JSON 文件
   */
  downloadBackup() {
    const json = this.exportLocal();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `salomon-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 备份已下载', 'success');
  },

  /**
   * 强制推送本地数据到云端（覆盖云端）
   */
  async forcePush() {
    if (!this.isEnabled()) {
      showToast('未配置同步Token', 'warning');
      return false;
    }
    showToast('⬆️ 正在推送...', 'info');
    try {
      // 不拉取云端，直接读取本地+上传
      const localAvail = Store.get('availability');
      const localSC = Store.get('shiftChanges') || [];
      const localSS = Store.get('storeSupport') || [];
      const localDS = Store.get('doorSchedule') || [];

      // 获取云端最新 SHA（覆盖模式：获取 SHA，不合并）
      let shared, sha = null;
      try {
        shared = await this._fetchSharedData();
        sha = shared?.__sha || null;
        if (shared) delete shared.__sha;
      } catch (e) {
        if (!e.message.includes('Not Found') && !e.message.includes('404')) throw e;
        shared = { _meta: {}, availability: {}, staff: [], shiftChanges: [], storeSupport: [], doorSchedule: [] };
      }

      // 用本地覆盖
      // v63: 强制推送前先规范化本地 availability（清理乱码/超大 note）
      shared.availability = this._normalizeAvailabilityStructure(localAvail).months || {};
      shared.staff = Store.get('staff') || [];
      shared.shiftChanges = localSC;
      shared.storeSupport = localSS;
      shared.doorSchedule = localDS;
      shared._meta = {
        ...(shared._meta || {}),
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: (_auth && _auth.staffName) || 'force-push',
        version: (shared._meta?.version || 0) + 1,
        description: '安福路 Salomon 兼职管理系统 - 共享填报数据（GitHub云同步）'
      };

      const body = {
        message: `force-push: 覆盖推送 (v${shared._meta.version})`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(shared, null, 2)))),
        branch: this.BRANCH,
      };
      if (sha) body.sha = sha;

      await this._api('PUT', `${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}`, body);
      showToast(`✅ 推送成功 v${shared._meta.version}`, 'success');
      return true;
    } catch (e) {
      showToast('❌ 推送失败: ' + e.message, 'error');
      return false;
    }
  },

  /**
   * 强制拉取并覆盖本地（用云端覆盖本地）
   */
  async forcePull() {
    if (!this.isEnabled()) {
      showToast('未配置同步Token', 'warning');
      return false;
    }
    showToast('⬇️ 正在拉取...', 'info');
    try {
      this._lastPull = null; // 绕过防抖
      const shared = await this._fetchSharedData();
      if (!shared) {
        showToast('云端无数据', 'warning');
        return false;
      }
      this._mergeIntoLocal(shared);
      this._lastPull = Date.now();
      showToast('✅ 拉取完成，刷新页面查看', 'success');
      return true;
    } catch (e) {
      showToast('❌ 拉取失败: ' + e.message, 'error');
      return false;
    }
  },

  /**
   * 高级同步对话框（导出/导入/强制推送/强制拉取）
   */
  _showAdvancedDialog() {
    const overlay = document.createElement('div');
    overlay.id = 'syncAdvancedOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:var(--bg-card,#fff);border-radius:16px;padding:24px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:16px;font-weight:800;">🔄 数据同步工具</h3>
          <button id="advCloseBtn" style="background:none;border:none;font-size:22px;cursor:pointer;opacity:0.5;">&times;</button>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5;">
          v40 重置了云端数据，其他设备如有数据，请使用「强制推送」把数据传到云端。
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <button id="advExportBtn" style="padding:12px;border:1px solid #10b981;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#ecfdf5;color:#065f46;">
            📤 导出本地
          </button>
          <button id="advImportBtn" style="padding:12px;border:1px solid #f59e0b;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#fffbeb;color:#92400e;">
            📥 导入备份
          </button>
          <button id="advPushBtn" style="padding:12px;border:1px solid #3b82f6;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#eff6ff;color:#1e40af;">
            ⬆️ 强制推送
          </button>
          <button id="advPullBtn" style="padding:12px;border:1px solid #8b5cf6;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#f5f3ff;color:#5b21b6;">
            ⬇️ 强制拉取
          </button>
        </div>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;font-size:11px;color:#92400e;line-height:1.5;margin-bottom:12px;">
          <strong>使用流程：</strong><br>
          1. <strong>有数据设备</strong>：导出备份 → 推送到云端<br>
          2. <strong>无数据设备</strong>：强制拉取云端 → 刷新页面<br>
          3. <strong>跨设备迁移</strong>：A 设备导出 → B 设备导入
        </div>

        <details style="background:#f9fafb;border-radius:8px;padding:10px;">
          <summary style="font-size:12px;font-weight:600;cursor:pointer;">📋 查看本地数据 JSON</summary>
          <textarea id="advDataView" readonly style="width:100%;height:200px;margin-top:8px;font-size:10px;font-family:monospace;border:1px solid #e5e7eb;border-radius:4px;padding:6px;background:#fff;"></textarea>
          <button id="advCopyBtn" style="margin-top:6px;padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;cursor:pointer;background:#fff;">📋 复制</button>
        </details>
      </div>
    `;
    document.body.appendChild(overlay);

    // 显示本地数据
    const dataView = overlay.querySelector('#advDataView');
    try {
      dataView.value = this.exportLocal();
    } catch (e) {
      dataView.value = '导出失败: ' + e.message;
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#advCloseBtn').onclick = () => overlay.remove();
    overlay.querySelector('#advExportBtn').onclick = () => this.downloadBackup();
    overlay.querySelector('#advCopyBtn').onclick = () => {
      dataView.select();
      document.execCommand('copy');
      showToast('已复制到剪贴板', 'success');
    };
    overlay.querySelector('#advImportBtn').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const result = this.importLocal(evt.target.result);
          if (result.ok) {
            showToast('✅ 导入成功，刷新页面查看', 'success');
            setTimeout(() => { overlay.remove(); Router.render(); }, 1500);
          } else {
            showToast('❌ 导入失败: ' + result.error, 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
    overlay.querySelector('#advPushBtn').onclick = async () => {
      overlay.remove();
      await this.forcePush();
    };
    overlay.querySelector('#advPullBtn').onclick = async () => {
      overlay.remove();
      const ok = await this.forcePull();
      if (ok) setTimeout(() => Router.render(), 800);
    };
  },

  /**
   * 将本地数据合并到共享数据对象（用于推送前）
   */
  _mergeLocalIntoShared(shared) {
    // === v54: 合并本地 __deletedIds → shared._deletedIds（union，push 方向）===
    // 这是关键桥接：删除函数写入 Store.__deletedIds，这里把它推到云端
    const localDeleted = Store.get('__deletedIds') || {};
    if (!shared._deletedIds) shared._deletedIds = {};
    if (!shared._deletedIds._meta) shared._deletedIds._meta = {};
    Object.keys(localDeleted).forEach(col => {
      if (col === '_meta' || col === '_doorSlots') return;
      if (!shared._deletedIds[col]) shared._deletedIds[col] = [];
      (localDeleted[col] || []).forEach(id => {
        const idStr = String(id);
        if (!shared._deletedIds[col].includes(idStr)) {
          shared._deletedIds[col].push(idStr);
        }
        if (!shared._deletedIds._meta[idStr]) {
          shared._deletedIds._meta[idStr] = Date.now();
        }
      });
    });
    // doorSlots tombstone
    if (localDeleted._doorSlots) {
      if (!shared._deletedDoorSlots) shared._deletedDoorSlots = {};
      Object.entries(localDeleted._doorSlots).forEach(([date, times]) => {
        if (!shared._deletedDoorSlots[date]) shared._deletedDoorSlots[date] = [];
        (times || []).forEach(t => {
          if (!shared._deletedDoorSlots[date].includes(t)) {
            shared._deletedDoorSlots[date].push(t);
          }
        });
      });
    }

    // === staff（人员信息）— 优先合并，确保 staff 名称最新 ===
    const localStaff = Store.get('staff') || [];
    const cloudStaff = shared.staff || [];
    const _cloudStaffIds = new Set(cloudStaff.map(s => s.id));
    const staffMap = new Map();
    cloudStaff.forEach(s => staffMap.set(s.id, s));
    localStaff.forEach(s => staffMap.set(s.id, s));
    shared.staff = Array.from(staffMap.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
    // v58: push 端 staff 合并日志
    if (shared.staff.length > cloudStaff.length) {
      const newNames = shared.staff.filter(s => !_cloudStaffIds.has(s.id)).map(s => s.name);
      console.log(`[Sync] push staff: ${cloudStaff.length} → ${shared.staff.length} (新增: ${newNames.join(', ')})`);
    }

    // === availability — v67: 抽取 _mergePersonAvailability 复用 ===
    const localAvail = this._normalizeAvailabilityStructure(Store.get('availability'));
    if (localAvail && localAvail.months && Object.keys(localAvail.months).length > 0) {
      if (!shared.availability) shared.availability = {};
      Object.entries(localAvail.months).forEach(([monthKey, monthData]) => {
        if (!monthData || !monthData.data) return;
        if (!shared.availability[monthKey]) shared.availability[monthKey] = { data: {} };

        Object.entries(monthData.data).forEach(([staffName, personData]) => {
          if (!personData) return;
          if (!Sync._isValidName(staffName)) {
            console.warn('[Sync] 推送时跳过乱码人名:', staffName.slice(0, 30));
            return;
          }

          const cleanedPerson = this._cleanPersonData(personData);
          const cloudPerson = shared.availability[monthKey].data[staffName];

          if (cloudPerson) {
            // v67: 共用合并逻辑（push 方向 local 胜）
            this._mergePersonAvailability(cloudPerson, cleanedPerson, {
              sourceWinsTie: true, direction: 'push'
            });
          } else {
            if ((cleanedPerson.dates && Object.keys(cleanedPerson.dates).length > 0) ||
                (cleanedPerson.note && cleanedPerson.note.trim())) {
              shared.availability[monthKey].data[staffName] = cleanedPerson;
            }
          }
        });
      });
    }

    // === v68: 数组合并统一循环（push 方向） ===
    [
      { key: 'shiftChanges', mergeFn: '_mergeArraysById', deletedKey: 'shiftChanges' },
      { key: 'storeSupport', mergeFn: '_mergeArraysById', deletedKey: 'storeSupport' },
      { key: 'doorSchedule', mergeFn: '_mergeArraysByDate', deletedKey: '_doorSlots' },
      { key: 'customerReviews', mergeFn: '_mergeArraysById', deletedKey: 'customerReviews' },
    ].forEach(({ key, mergeFn, deletedKey }) => {
      const deletedArg = deletedKey === '_doorSlots'
        ? this._getDeletedDoorSlots(shared)
        : this._getDeletedIds(shared, deletedKey);
      shared[key] = this[mergeFn](
        shared[key] || [],
        Store.get(key) || [],
        deletedArg
      );
    });

    // v54: GC 过期 tombstone
    this._gcTombstones(shared);
  },

  /**
   * 3 轮 push 全部冲突后，验证云端是否已有本地数据（v46a）
   * 原理：拉取最新云端 → 合入本地数据 → 对比合并前后是否一致
   * 如果一致 = 数据已在云端（某次 PUT 实际成功、或他人也推送了同样数据）
   */
  async _verifyDataInCloud() {
    try {
      // 强制拉取最新云端数据（忽略防抖）
      this._lastPull = null;
      const cloud = await this._fetchSharedData();
      if (!cloud) return false;
      delete cloud.__sha;

      // 深拷贝一份「合并前」的云端数据
      const before = JSON.stringify(cloud);

      // 把本地数据合入云端副本
      this._mergeLocalIntoShared(cloud);

      // 对比合并前后
      const after = JSON.stringify(cloud);
      if (before === after) {
        // 合并没有改变云端 → 说明本地改动已经在云端了
        return true;
      }
      console.log('[Sync] 云端验证：本地有未同步的数据');
      return false;
    } catch (e) {
      console.warn('[Sync] 云端验证失败:', e.message);
      return false;
    }
  },

  /**
   * 按 id 去重合并数组 — 字段级合并（v46）
   * v54: 支持 tombstone 删除防复活
   *   deletedIds = Set of id → 这些 id 对应的记录即使 remote 有也不复活
   * 策略：并集合并 + 字段级合取，但跳过 deletedIds 中的记录
   */
  _mergeArraysById(local, remote, deletedIds) {
    // v84: 统一转字符串比对 — _markDeleted 推入的是 String(id)，
    // 但 shiftChanges/storeSupport/customerReviews 的 id 可能是数字（nextId 返回 +1）
    // Set.has(数字) !== Set.has(字符串)，会导致删除标记永远命中不到
    const delSet = deletedIds instanceof Set
      ? new Set([...deletedIds].map(x => String(x)))
      : new Set((deletedIds || []).map(x => String(x)));
    const isDeleted = (id) => delSet.has(String(id));
    const map = new Map();
    local.forEach(item => {
      if (item && item.id != null && !isDeleted(item.id)) map.set(item.id, { ...item });
    });
    remote.forEach(item => {
      if (!item || item.id == null) return;
      if (isDeleted(item.id)) return; // tombstone: 不复活
      const existing = map.get(item.id);
      map.set(item.id, existing ? this._mergeFields(existing, item) : { ...item });
    });
    return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
  },

  /**
   * 按 date 去重合并数组（用于 doorSchedule）— 字段级合并（v46）
   * v47c: slots 数组按 time 子级合并，不再整段覆盖
   * v54: 传入 deletedSlotsByDate = { '2026-07-01': Set('10:00-12:00', ...), ... }
   */
  _mergeArraysByDate(local, remote, deletedSlotsByDate) {
    const map = new Map();
    local.forEach(item => { if (item && item.date) map.set(item.date, { ...item }); });
    remote.forEach(item => {
      if (!item || !item.date) return;
      const existing = map.get(item.date);
      if (!existing) { map.set(item.date, { ...item }); return; }
      // 字段级合并（除 slots 外）
      const merged = this._mergeFields(existing, item);
      // slots 数组按 time 子级合并（v54: 传 deletedTimes）
      if (existing.slots || item.slots) {
        const delTimes = deletedSlotsByDate && deletedSlotsByDate[item.date];
        merged.slots = this._mergeSlotsByTime(existing.slots || [], item.slots || [], delTimes);
      }
      map.set(item.date, merged);
    });
    return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  },

  /**
   * 按 time 字段合并 slots 数组（v47c 新增）
   * v54: 支持 tombstone 删除防复活（按 time 作为删除键）
   * 同 time 的 slot 做字段级合并，不同 time 的并集。
   */
  _mergeSlotsByTime(aSlots, bSlots, deletedTimes) {
    const delSet = deletedTimes instanceof Set ? deletedTimes : new Set(deletedTimes || []);
    const m = new Map();
    aSlots.forEach(s => {
      if (s && s.time && !delSet.has(s.time)) m.set(s.time, { ...s });
    });
    bSlots.forEach(s => {
      if (!s || !s.time) return;
      if (delSet.has(s.time)) return; // tombstone: 不复活
      const existing = m.get(s.time);
      m.set(s.time, existing ? this._mergeFields(existing, s) : { ...s });
    });
    return Array.from(m.values()).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  },

  /**
   * 字段级合并两条记录（v46 新增）
   * - 有 _updatedAt：取更新的一方字段
   * - 无 _updatedAt：remote 非空字段覆盖 local（兼容旧数据）
   */
  _mergeFields(localItem, remoteItem) {
    const merged = { ...localItem };
    const lTs = localItem._updatedAt || 0;
    const rTs = remoteItem._updatedAt || 0;
    const remoteNewer = rTs >= lTs;
    Object.keys(remoteItem).forEach(key => {
      if (key === 'id' || key === 'date') return; // 主键不可覆盖
      const rv = remoteItem[key];
      if (rv === null || rv === undefined || rv === '') return; // 空值不覆盖
      // v47d: 如果本地有更新的 _updatedAt，remote 不能覆盖本地非空字段
      if (lTs > rTs && merged[key] !== undefined && merged[key] !== null && merged[key] !== '') return;
      if (remoteNewer || merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = rv;
      }
    });
    // 取更新的 _updatedAt
    if (rTs || lTs) merged._updatedAt = String(Math.max(rTs, lTs));
    return merged;
  },

  /**
   * ====== v54: Tombstone 删除防复活机制 ======
   * 分布式删除的第一性原理：本地删除 ≠ 通知所有人删除。
   * 方案：把删除的 id 存入 shared._deletedIds，合并时跳过这些 id。
   */

  /** 从 shared 中读取某集合的 deletedIds */
  _getDeletedIds(shared, collection) {
    if (!shared._deletedIds || !shared._deletedIds[collection]) return new Set();
    return new Set(shared._deletedIds[collection]);
  },

  /** 从 shared 中读取某日期下被删除的 door slot times */
  _getDeletedDoorSlots(shared) {
    const result = {};
    if (!shared._deletedDoorSlots) return result;
    Object.entries(shared._deletedDoorSlots).forEach(([date, times]) => {
      result[date] = new Set(times || []);
    });
    return result;
  },

  /**
   * 标记一条记录为已删除（写入 shared._deletedIds）
   * @param collection: 'shiftChanges' | 'storeSupport' | 'customerReviews' | 'ratings'
   * @param id: 记录 id
   * @param shared: 共享数据对象（push 时传入）
   */
  _markDeleted(shared, collection, id) {
    if (!shared._deletedIds) shared._deletedIds = {};
    if (!shared._deletedIds[collection]) shared._deletedIds[collection] = [];
    const arr = shared._deletedIds[collection];
    const idStr = String(id);
    if (!arr.includes(idStr)) {
      arr.push(idStr);
      // 记录删除时间，用于 GC（超过 30 天的 tombstone 可清理）
      shared._deletedIds._meta = shared._deletedIds._meta || {};
      shared._deletedIds._meta[idStr] = Date.now();
    }
  },

  /**
   * 标记一个 door slot 为已删除
   * @param date: 日期 'YYYY-MM-DD'
   * @param time: 时间段 'HH:MM-HH:MM'
   * @param shared: 共享数据对象
   */
  _markDoorSlotDeleted(shared, date, time) {
    if (!shared._deletedDoorSlots) shared._deletedDoorSlots = {};
    if (!shared._deletedDoorSlots[date]) shared._deletedDoorSlots[date] = [];
    const arr = shared._deletedDoorSlots[date];
    if (!arr.includes(time)) arr.push(time);
  },

  /**
   * 清理超过 30 天的 tombstone（GC）
   * 在 push 时调用，保持 shared 文件不会无限增长
   */
  _gcTombstones(shared) {
    if (!shared._deletedIds || !shared._deletedIds._meta) return;
    const now = Date.now();
    const GC_AGE = 30 * 24 * 60 * 60 * 1000; // 30 天
    const meta = shared._deletedIds._meta;
    let changed = false;
    Object.entries(meta).forEach(([id, ts]) => {
      if (now - ts > GC_AGE) {
        delete meta[id];
        // 从各集合数组中也移除
        Object.keys(shared._deletedIds).forEach(col => {
          if (col === '_meta') return;
          shared._deletedIds[col] = shared._deletedIds[col].filter(x => x !== id);
        });
        changed = true;
      }
    });
    if (changed) console.log('[Sync] GC: 清理过期 tombstone');
  },

  /**
   * 验证 Token 是否有效
   */
  async testToken(token) {
    try {
      const url = `${this.API_BASE}/repos/${this.REPO}`;
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      return resp.ok;
    } catch (e) {
      return false;
    }
  },
};

// ===== 页面加载时自动拉取 =====
document.addEventListener('DOMContentLoaded', () => {
  // v149: 刷新风暴中直接跳过同步初始化，避免加剧死循环
  if (window.__PANIC_SYNC__) { try { Sync._updateIndicator(); } catch (e) {} return; }
  // 延迟拉取，避免阻塞页面渲染
  setTimeout(() => {
    // v150: Supabase 在线则初始化 Realtime + 立即拉取最新
    if (Sync._supabaseEnabled() && !Sync._supabaseInitDone) {
      Sync._supabaseInitDone = true;
      Sync._initRealtime();
      Sync._pullFromSupabase(true).then(() => Sync._updateIndicator()).catch(() => {});
    }
    if (Sync.isEnabled()) {
      Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
    } else {
      Sync._updateIndicator();
    }
  }, 1500);
});

// ===== 定期自动拉取（每15秒） — v68: 页面隐藏时暂停，节省API配额 =====
let _syncTimer = null;

function _startSyncTimer() {
  if (_syncTimer) return;
  if (window.__PANIC_SYNC__) return; // v149: 风暴中不起定时器，避免死循环
  _syncTimer = setInterval(() => {
    if (!document.hidden && (Sync.isEnabled() || Sync._supabaseEnabled())) {
      // v150: 双通道并行（各自 hash 比较防重复 render）
      if (Sync.isEnabled()) Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
      if (Sync._supabaseEnabled()) Sync._pullFromSupabase(true).then(() => Sync._updateIndicator()).catch(() => {});
    }
  }, 15000);
}

function _stopSyncTimer() {
  if (_syncTimer) { clearInterval(_syncTimer); _syncTimer = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _stopSyncTimer();
  } else {
    // v149: 风暴中只恢复定时器（已内部守卫），不主动 pull
    if (window.__PANIC_SYNC__) { _startSyncTimer(); return; }
    // 页面恢复可见时立即拉一次，然后恢复定时
    if (Sync.isEnabled()) {
      Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
    }
    if (Sync._supabaseEnabled()) {
      Sync._pullFromSupabase(true).then(() => Sync._updateIndicator()).catch(() => {});
    }
    _startSyncTimer();
  }
});

// 初始启动
_startSyncTimer();

// ===== UI 状态指示器更新 =====
/**
 * 更新页面顶部的同步状态指示器
 */
Sync._updateIndicator = function() {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  const indicator = document.getElementById('syncIndicator');
  if (!dot || !label) return;

  // 辅助：格式化"上次同步时间"
  const _fmtTime = (ts) => {
    if (!ts) return null;
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

    if (this.isEnabled()) {
    // 待同步状态（push 失败）
    if (this._pendingSync) {
      dot.style.background = '#f59e0b';
      label.textContent = '待同步';
      indicator.title = '上次推送未成功，已暂存本地，下次拉取后自动重试 · 右键配置Token';
    } else {
      dot.style.background = '#10b981';
      label.textContent = '已同步';
      const lastTime = _fmtTime(this._lastSyncTime);
      indicator.title = '云端同步已启用' + (lastTime ? ' · 上次同步: ' + lastTime : '') + ' · 右键配置Token';
    }
    // v51f: 指示器只显示状态，点击不触发同步（用独立按钮）
    indicator.style.cursor = 'default';
    indicator.onclick = null;
    indicator.oncontextmenu = (e) => { e.preventDefault(); Sync._showConfigDialog(); };
  } else {
    dot.style.background = '#f59e0b';
    label.textContent = '仅本地';
    indicator.title = '云端同步未配置 · 右键配置';
    indicator.style.cursor = 'default';
    indicator.onclick = null;
    indicator.oncontextmenu = (e) => { e.preventDefault(); Sync._showConfigDialog(); };
  }
};

/**
 * v51f: 手动同步（独立按钮触发）
 * 先 push 上传本地数据，再 pull 拉取最新
 */
Sync.manualSync = async function() {
  if (!Sync.isEnabled()) {
    Sync._showConfigDialog();
    return;
  }
  // 按钮即时反馈
  const btn = document.getElementById('syncBtn');
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = '⏳ 同步中'; }
  if (dot) dot.style.background = '#3b82f6';
  if (label) label.textContent = '同步中...';

  const who = (typeof _auth !== 'undefined' && _auth && _auth.staffName) ? _auth.staffName : 'manual-sync';
  // v51g: 抑制 _doPush 内部 toast，由按钮统一反馈
  window._suppressInternalToast = true;
  let pushErrorMsg = null;
  try {
    const pushOk = await Sync.push(who).catch(e => { console.warn('[Sync] 手动push失败:', e.message); pushErrorMsg = e.message; return false; });
    // 等待 push 队列排空
    let waitCount = 0;
    while (Sync._pushRunning && waitCount < 50) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
    }
    // 取 _doPush 内部记录的精确错误信息
    if (!pushOk) pushErrorMsg = Sync._lastPushError || pushErrorMsg;
    const pullOk = await Sync.pull(false, true);
    if (typeof showToast === 'function') {
      if (pushOk && pullOk) {
        showToast('☁️ 同步完成', 'success');
      } else if (!pushOk && !pullOk) {
        showToast('☁️ 上传和拉取均失败，请检查网络', 'error');
      } else if (!pushOk) {
        // v51g: 显示 push 失败的具体原因（来自 _doPush 内部）
        const detail = pushErrorMsg ? ` (${pushErrorMsg})` : '';
        showToast('☁️ 上传失败' + detail, 'error');
      } else {
        showToast('☁️ 已上传，但拉取最新数据失败', 'warning');
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('同步失败: ' + e.message, 'error');
  } finally {
    // v51g: 清除抑制标记（自动保存场景会再次 toast）
    window._suppressInternalToast = false;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '🔄 同步'; }
    Sync._updateIndicator();
  }
};

/**
 * 显示同步配置对话框
 */
Sync._showConfigDialog = function() {
  const overlay = document.createElement('div');
  overlay.id = 'syncConfigOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  const currentToken = this.getToken() || '';
  overlay.innerHTML = `
    <div style="background:var(--bg-card,#fff);border-radius:16px;padding:28px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="font-size:18px;font-weight:800;">☁️ 云端同步设置</h3>
        <button id="syncCloseBtn" style="background:none;border:none;font-size:22px;cursor:pointer;opacity:0.5;">&times;</button>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
        配置 GitHub Token 后，兼职填写的数据将自动同步到云端，所有人都能看到最新的填报内容。
      </p>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">GitHub Token</label>
      <input id="syncConfigToken" type="password" value="${currentToken}" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
        style="width:100%;padding:10px 12px;border:1px solid var(--border-color,#e5e7eb);border-radius:8px;font-size:13px;font-family:monospace;background:var(--bg-input,#fff);color:var(--text-primary);box-sizing:border-box;" />
      <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.5;">
        需要 repo → Contents: read & write 权限 |
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" style="color:var(--accent);">创建Token</a>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button id="syncSaveBtn" style="flex:1;padding:10px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:var(--accent,#e94560);color:#fff;">💾 保存并验证</button>
        ${currentToken ? '<button id="syncClearBtn" style="padding:10px 16px;border:1px solid var(--border-color,#e5e7eb);border-radius:8px;font-size:14px;cursor:pointer;background:none;color:var(--text-secondary);">清除</button>' : ''}
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-color,#e5e7eb);">
        <button id="syncAdvancedBtn" style="width:100%;padding:10px;border:1px solid #8b5cf6;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#f5f3ff;color:#5b21b6;">
          🔄 高级同步工具（导出/导入/强制推送/拉取）
        </button>
      </div>
      <div id="syncConfigMsg" style="margin-top:10px;font-size:12px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#syncCloseBtn').onclick = () => overlay.remove();

  overlay.querySelector('#syncSaveBtn').onclick = async () => {
    const token = overlay.querySelector('#syncConfigToken').value.trim();
    const msgEl = overlay.querySelector('#syncConfigMsg');
    if (!token) { msgEl.innerHTML = '<span style="color:#e94560;">请输入Token</span>'; return; }
    msgEl.innerHTML = '<span style="color:#f59e0b;">验证中...</span>';
    try {
      const resp = await fetch('https://api.github.com/repos/salomon-anfulu/salomon-management', {
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (resp.ok) {
        Sync.setToken(token);
        msgEl.innerHTML = '<span style="color:#10b981;">✅ 验证成功！正在同步本地数据...</span>';
        Sync._enabled = true;
        // 关键：push() 内部会先拉取云端 → 合并本地 → 推送合并结果
        // 这样本地已有的填报不会丢失，云端已有的也不会被覆盖
        Sync.push('initial-setup').catch(e => {
          console.warn('[Sync] 初始同步失败:', e.message);
        }).finally(() => {
          overlay.remove();
          Sync._updateIndicator();
        });
      } else {
        const err = await resp.json().catch(() => ({}));
        msgEl.innerHTML = '<span style="color:#e94560;">❌ ' + (err.message || 'Token无效') + '</span>';
      }
    } catch (e) { msgEl.innerHTML = '<span style="color:#e94560;">❌ ' + e.message + '</span>'; }
  };

  const clearBtn = overlay.querySelector('#syncClearBtn');
  if (clearBtn) clearBtn.onclick = () => {
    Sync.clearToken();
    overlay.querySelector('#syncConfigToken').value = '';
    overlay.querySelector('#syncConfigMsg').innerHTML = '<span style="color:#f59e0b;">Token已清除</span>';
    setTimeout(() => { overlay.remove(); Sync._updateIndicator(); }, 800);
  };

  const advBtn = overlay.querySelector('#syncAdvancedBtn');
  if (advBtn) advBtn.onclick = () => {
    overlay.remove();
    Sync._showAdvancedDialog();
  };
};

console.log('[Sync] 云同步模块已加载');
