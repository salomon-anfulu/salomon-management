/**
 * ========================================
 * Supabase Cloud Sync - 安福路 Salomon 兼职管理系统云端同步
 * 
 * 解决的问题：LocalStorage 是设备隔离的，兼职在手机上填写后
 * 管理员在电脑上看不到。通过 Supabase app_data 表实现跨设备实时数据同步。
 *
 * 工作原理：
 *   1. 每人填写 → 存 LocalStorage + 自动推送到 Supabase 共享数据（app_data 表）
 *   2. 任何人打开系统 → 自动从 Supabase 拉取最新共享数据 → 合并到 LocalStorage
 *   3. Realtime 订阅 → 他人修改即时推送到本机，实现多人实时协作
 *   4. 合并策略：availability 按人名逐字段合并；数组类数据按 id 去重
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
  /** 上次同部拉取时间戳 */
  _lastPull: null,
  /** 拉取间隔（毫秒），避免频繁请求 */
  PULL_INTERVAL: 15000,
  /** push 失败后标记，下次 pull 成功时清除 */
  _pendingSync: false,
  /** 上次同步（push 或 pull）成功的时间戳，用于 UI 显示 */
  _lastSyncTime: null,

  // ===== v150: Supabase 同步通道状态 =====
  /** 上次写入 Supabase 的时间戳（回声防护：自己刚写入的 Realtime 回声忽略） */
  _lastSupabaseWriteTs: 0,
  /** app_data 表不存在则永久禁用 Supabase 同步（不刷日志） */
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
   * 检查同步是否可用（Supabase 在线即启用）
   */
  isEnabled() {
    return this._supabaseEnabled();
  },

  /**
   * API 请求封装
   */
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
   * 拉取共享数据并合并到 LocalStorage
   * 静默执行，失败不影响正常使用
   * @param {boolean} silent - 是否静默（不弹 toast）
   * @param {boolean} force - v51c: 强制拉取，跳过 PULL_INTERVAL 防抖（手动同步按钮使用）
   */
  async pull(silent = true, force = false) {
    return this._pullFromSupabase(silent);
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
   * 所有通道（Supabase / Realtime）的远端数据都经此入口，保证一致防护
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
          console.warn('[Sync] app_data 表不存在，Supabase 同步已禁用');
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
          console.warn('[Sync] app_data 表不存在，Supabase 同步已禁用');
        }
        return false;
      }
      const base = remote || { _meta: { version: 0 }, availability: {}, staff: [], shiftChanges: [], storeSupport: [], doorSchedule: [] };
      // 把本地最新数据合入 base
      this._mergeLocalIntoShared(base);
      const { error } = await SbClient.appData.save(base, changedBy || 'unknown');
      if (error) {
        if (/does not exist|relation "app_data"/.test(error.message || '')) {
          this._supabaseTableMissing = true;
          console.warn('[Sync] app_data 表不存在，Supabase 同步已禁用');
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
   * 推送本地数据到 Supabase（fire-and-forget，不阻塞 UI）
   * 在线即推，失败静默记录；Realtime 订阅 + 定时 pull 保证多端一致
   */
  async push(changedBy) {
    // Supabase 独立通道——在线即推送（fire-and-forget，不阻塞）
    if (this._supabaseEnabled() && !this._supabaseTableMissing) {
      this._pushToSupabase(changedBy).catch(() => {});
    }
    return true;
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
   * 高级同步对话框（导出/导入）
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
          系统已通过 Supabase 自动实时同步。以下工具用于本地备份与跨设备迁移。
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <button id="advExportBtn" style="padding:12px;border:1px solid #10b981;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#ecfdf5;color:#065f46;">
            📤 导出本地
          </button>
          <button id="advImportBtn" style="padding:12px;border:1px solid #f59e0b;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#fffbeb;color:#92400e;">
            📥 导入备份
          </button>
        </div>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;font-size:11px;color:#92400e;line-height:1.5;margin-bottom:12px;">
          <strong>使用说明：</strong><br>
          1. 系统已通过 Supabase 自动实时同步，无需手动推送<br>
          2. <strong>本地备份</strong>：导出 → 保存到本地文件（防丢数据）<br>
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
    if (this._pendingSync) {
      dot.style.background = '#f59e0b';
      label.textContent = '待同步';
      indicator.title = '上次推送未成功，已暂存本地，下次拉取后自动重试';
    } else {
      dot.style.background = '#10b981';
      label.textContent = '已同步';
      const lastTime = _fmtTime(this._lastSyncTime);
      indicator.title = 'Supabase 云端同步已启用' + (lastTime ? ' · 上次同步: ' + lastTime : '');
    }
  } else {
    dot.style.background = '#ef4444';
    label.textContent = '未连接';
    indicator.title = '云端同步未连接（Supabase 不可用）';
  }
  indicator.style.cursor = 'default';
  indicator.onclick = null;
  indicator.oncontextmenu = null;
};

/**
 * v51f: 手动同步（独立按钮触发）
 * 先 push 上传本地数据，再 pull 拉取最新
 */
Sync.manualSync = async function() {
  if (!Sync.isEnabled()) {
    if (typeof showToast === 'function') showToast('☁️ 云端同步未连接（Supabase 不可用）', 'warning');
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
  try {
    const pushOk = await Sync.push(who).catch(e => { console.warn('[Sync] 手动push失败:', e.message); return false; });
    const pullOk = await Sync.pull(false, true);
    if (typeof showToast === 'function') {
      if (pushOk && pullOk) {
        showToast('☁️ 同步完成', 'success');
      } else if (!pushOk && !pullOk) {
        showToast('☁️ 上传和拉取均失败，请检查网络', 'error');
      } else if (!pushOk) {
        showToast('☁️ 上传失败，请检查网络', 'error');
      } else {
        showToast('☁️ 已上传，但拉取最新数据失败', 'warning');
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('同步失败: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '🔄 同步'; }
    Sync._updateIndicator();
  }
};

  /* v155: 已移除 _showConfigDialog（GitHub Token 配置对话框，决策A 完全移除 GitHub 同步） */

console.log('[Sync] 云同步模块已加载');
