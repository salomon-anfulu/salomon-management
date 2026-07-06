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

  /**
   * 获取存储的 Token
   */
  getToken() {
    return localStorage.getItem('gh_sync_token') || null;
  },

  /**
   * 保存 Token
   */
  setToken(token) {
    localStorage.setItem('gh_sync_token', token);
    this._enabled = !!token;
  },

  /**
   * 清除 Token
   */
  clearToken() {
    localStorage.removeItem('gh_sync_token');
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
   * 从 GitHub 拉取共享文件
   * @returns {object} 共享数据对象，失败返回 null
   */
  async _fetchSharedData() {
    const url = `${this.API_BASE}/repos/${this.REPO}/contents/${this.FILE_PATH}?ref=${this.BRANCH}`;
    const fileData = await this._api('GET', url);

    if (!fileData.content) {
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
   * 拉取共享数据并合并到 LocalStorage
   * 静默执行，失败不影响正常使用
   */
  async pull(silent = true) {
    if (!this.isEnabled()) {
      if (!silent) showToast('未配置同步Token，请先在设置中配置', 'warning');
      return false;
    }

    // 防止频繁拉取
    if (this._lastPull && (Date.now() - this._lastPull) < this.PULL_INTERVAL) {
      return true;
    }

    try {
      const shared = await this._fetchSharedData();
      if (!shared) return false;

      this._mergeIntoLocal(shared);
      this._lastPull = Date.now();
      this._lastSyncTime = Date.now();
      // 如果之前有 push 失败，pull 成功后触发一次补偿推送
      if (this._pendingSync) {
        console.log('[Sync] 检测到待同步数据，触发补偿推送');
        this._pendingSync = false;
        this.push('auto-retry').catch(() => { this._pendingSync = true; });
      }
      console.log('[Sync] 拉取成功', new Date().toLocaleTimeString());
      return true;
    } catch (e) {
      console.warn('[Sync] 拉取失败:', e.message);
      if (!silent) showToast('同步拉取失败: ' + e.message, 'warning');
      return false;
    }
  },

  /**
   * 保存后推送数据到 GitHub
   * 冲突重试策略：最多 3 轮"拉-合-写"，每轮失败都重新拉取最新 SHA
   */
  async push(changedBy) {
    if (!this.isEnabled()) return false;

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
      if (e.message === 'continuous_sh conflict') {
        // 确实是暂时性冲突，静默标记，不弹 toast 打扰用户
        console.log('[Sync] 云端暂无此数据，已标记待同步，将在下次自动补偿');
        this._pendingSync = true;
      } else {
        console.warn('[Sync] 推送失败:', e.message);
        this._pendingSync = true;
        const msg = e.message || '未知错误';
        if (msg.includes('401') || msg.includes('Bad credentials')) {
          showToast('☁️ 同步失败: Token无效，请在设置中重新配置', 'error');
        } else if (msg.includes('403') || msg.includes('resource not accessible')) {
          showToast('☁️ 同步失败: Token权限不足，需开启 Contents → Read & Write', 'error');
        } else {
          showToast('☁️ 同步未成功: ' + msg, 'warning');
        }
      }
      return { success: false, error: e.message || 'conflict' };
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
      Store.set('staff', merged);
    }

    // === 可上班时间 (availability) ===
    if (shared.availability && Object.keys(shared.availability).length > 0) {
      const localAvail = Store.get('availability');

      Object.entries(shared.availability).forEach(([monthKey, monthData]) => {
        if (!monthData || !monthData.data) return;

        // 确保本地有该月份
        if (!localAvail.months) localAvail.months = {};
        if (!localAvail.months[monthKey]) {
          localAvail.months[monthKey] = { data: {} };
        }

        const localMonthData = localAvail.months[monthKey].data;

        Object.entries(monthData.data).forEach(([sharedName, sharedPerson]) => {
          // 深拷贝避免引用污染
          const clonedShared = JSON.parse(JSON.stringify(sharedPerson));

          // 如果本地没有该人数据，直接写入（但用克隆版本）
          if (!localMonthData[sharedName]) {
            localMonthData[sharedName] = clonedShared;
            console.log(`[Sync] 拉取新增: ${monthKey} / ${sharedName}`);
            return;
          }

          const localPerson = localMonthData[sharedName];

          // 合并 dates
          if (clonedShared.dates && typeof clonedShared.dates === 'object') {
            // 确保本地有 dates 结构
            if (!localPerson.dates || localPerson.dates === null || typeof localPerson.dates !== 'object') {
              localPerson.dates = {};
            }
            // 逐日合并：共享数据覆盖本地已有日期，但保留本地独有日期
            const before = Object.keys(localPerson.dates).length;
            Object.entries(clonedShared.dates).forEach(([dateKey, dateVal]) => {
              localPerson.dates[dateKey] = dateVal;
            });
            const after = Object.keys(localPerson.dates).length;
            console.log(`[Sync] 拉取合并 ${monthKey}/${sharedName} dates: +${after - before}天 → 共${after}天`);
          }

          // 合并备注
          if (clonedShared.note && clonedShared.note.trim()) {
            if (!localPerson.note || !localPerson.note.includes(clonedShared.note)) {
              localPerson.note = localPerson.note
                ? localPerson.note + '; ' + clonedShared.note
                : clonedShared.note;
            }
          }

          // 更新 total（基于 dates 重新计算）
          if (localPerson.dates && Object.keys(localPerson.dates).length > 0) {
            let avail = 0;
            Object.values(localPerson.dates).forEach(d => { if (d.available) avail++; });
            localPerson.total = avail;
            localPerson.unavailable = Object.entries(localPerson.dates)
              .filter(([_, v]) => !v.available)
              .map(([k]) => k);
          } else if (clonedShared.total && !localPerson.total) {
            localPerson.total = clonedShared.total;
          }
        });
      });

      Store.set('availability', localAvail);
    }

    // === 换班记录 (shiftChanges) ===
    if (shared.shiftChanges && shared.shiftChanges.length > 0) {
      const local = Store.get('shiftChanges') || [];
      const merged = this._mergeArraysById(local, shared.shiftChanges);
      // v46: 字段级合并不一定增加 length，用 JSON 比较判断是否变化
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        Store.set('shiftChanges', merged);
      }
    }

    // === 店务支援 (storeSupport) ===
    if (shared.storeSupport && shared.storeSupport.length > 0) {
      const local = Store.get('storeSupport') || [];
      const merged = this._mergeArraysById(local, shared.storeSupport);
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        Store.set('storeSupport', merged);
      }
    }

    // === 门迎排班 (doorSchedule) ===
    if (shared.doorSchedule && shared.doorSchedule.length > 0) {
      const local = Store.get('doorSchedule') || [];
      const merged = this._mergeArraysByDate(local, shared.doorSchedule);
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        Store.set('doorSchedule', merged);
      }
    }

    // === 顾客好评 (customerReviews) — v47 新增 ===
    if (shared.customerReviews && shared.customerReviews.length > 0) {
      const local = Store.get('customerReviews') || [];
      const merged = this._mergeArraysById(local, shared.customerReviews);
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        Store.set('customerReviews', merged);
      }
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
      shared.availability = localAvail?.months || {};
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
    // === staff（人员信息）— 优先合并，确保 staff 名称最新 ===
    const localStaff = Store.get('staff') || [];
    const cloudStaff = shared.staff || [];
    const staffMap = new Map();
    cloudStaff.forEach(s => staffMap.set(s.id, s));
    localStaff.forEach(s => staffMap.set(s.id, s));
    shared.staff = Array.from(staffMap.values()).sort((a, b) => (a.id || 0) - (b.id || 0));

    // === availability ===
    const localAvail = Store.get('availability');
    if (localAvail && localAvail.months) {
      if (!shared.availability) shared.availability = {};
      Object.entries(localAvail.months).forEach(([monthKey, monthData]) => {
        if (!monthData || !monthData.data) return;
        if (!shared.availability[monthKey]) {
          shared.availability[monthKey] = { data: {} };
        }

        Object.entries(monthData.data).forEach(([staffName, personData]) => {
          // 只上传有实际数据的条目（有 dates 或有备注）
          if (personData.dates && Object.keys(personData.dates).length > 0) {
            shared.availability[monthKey].data[staffName] = personData;
          } else if (personData.note && personData.note.trim()) {
            shared.availability[monthKey].data[staffName] = personData;
          }
        });
      });
    }

    // === shiftChanges ===
    shared.shiftChanges = this._mergeArraysById(
      shared.shiftChanges || [],
      Store.get('shiftChanges') || []
    );

    // === storeSupport ===
    shared.storeSupport = this._mergeArraysById(
      shared.storeSupport || [],
      Store.get('storeSupport') || []
    );

    // === doorSchedule ===
    shared.doorSchedule = this._mergeArraysByDate(
      shared.doorSchedule || [],
      Store.get('doorSchedule') || []
    );

    // === customerReviews (顾客好评) — v47 新增 ===
    shared.customerReviews = this._mergeArraysById(
      shared.customerReviews || [],
      Store.get('customerReviews') || []
    );
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
   * 同一条记录被两人各自修改了不同字段时，不丢失任何一个字段。
   * 策略：以 _updatedAt 时间戳判断新旧，取更新一方的字段值；
   *       无 _updatedAt 时退化为「非空字段覆盖」。
   */
  _mergeArraysById(local, remote) {
    const map = new Map();
    local.forEach(item => { if (item && item.id != null) map.set(item.id, { ...item }); });
    remote.forEach(item => {
      if (!item || item.id == null) return;
      const existing = map.get(item.id);
      map.set(item.id, existing ? this._mergeFields(existing, item) : { ...item });
    });
    return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
  },

  /**
   * 按 date 去重合并数组（用于 doorSchedule）— 字段级合并（v46）
   */
  _mergeArraysByDate(local, remote) {
    const map = new Map();
    local.forEach(item => { if (item && item.date) map.set(item.date, { ...item }); });
    remote.forEach(item => {
      if (!item || !item.date) return;
      const existing = map.get(item.date);
      map.set(item.date, existing ? this._mergeFields(existing, item) : { ...item });
    });
    return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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
      if (remoteNewer || merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = rv;
      }
    });
    // 取更新的 _updatedAt
    if (rTs || lTs) merged._updatedAt = String(Math.max(rTs, lTs));
    return merged;
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
  // 延迟拉取，避免阻塞页面渲染
  setTimeout(() => {
    if (Sync.isEnabled()) {
      Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
    } else {
      Sync._updateIndicator();
    }
  }, 1500);
});

// ===== 定期自动拉取（每15秒） =====
setInterval(() => {
  if (Sync.isEnabled()) {
    Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
  }
}, 15000);

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
      indicator.title = '上次推送未成功，已暂存本地，下次拉取后自动重试';
    } else {
      dot.style.background = '#10b981';
      label.textContent = '已同步';
      const lastTime = _fmtTime(this._lastSyncTime);
      indicator.title = '云端同步已启用' + (lastTime ? ' · 上次同步: ' + lastTime : '') + ' · 点击手动拉取 · 右键配置Token';
    }
    indicator.style.cursor = 'pointer';
    indicator.onclick = async () => {
      label.textContent = '拉取中...';
      const ok = await Sync.pull(false);
      Sync._updateIndicator();
    };
    indicator.oncontextmenu = (e) => { e.preventDefault(); Sync._showConfigDialog(); };
  } else {
    dot.style.background = '#f59e0b';
    label.textContent = '仅本地';
    indicator.title = '云端同步未配置 · 点击配置';
    indicator.style.cursor = 'pointer';
    indicator.onclick = () => Sync._showConfigDialog();
    indicator.oncontextmenu = null;
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
