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
  PULL_INTERVAL: 30000,

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
    const jsonStr = atob(fileData.content.replace(/\n/g, ''));
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
   */
  async push(changedBy) {
    if (!this.isEnabled()) return false;

    try {
      // 1. 先拉取最新共享数据（防止覆盖他人提交）
      let shared;
      try {
        shared = await this._fetchSharedData();
      } catch (e) {
        // 如果文件不存在或读取出错，初始化一个空结构
        shared = {
          _meta: { version: 1, lastUpdated: null, lastUpdatedBy: null },
          availability: {},
          shiftChanges: [],
          storeSupport: [],
          doorSchedule: [],
        };
      }

      const sha = shared.__sha || null;
      delete shared.__sha;

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
      await this._api('PUT', url, body);

      console.log('[Sync] 推送成功 v' + shared._meta.version);
      return true;
    } catch (e) {
      console.warn('[Sync] 推送失败:', e.message);
      // 静默失败 —— 数据已保存到 LocalStorage，下次拉取时会合并
      return false;
    }
  },

  /**
   * 将共享数据合并到 LocalStorage
   * 合并策略：availability 按人名深度合并（保留 dates 字段）；
   *           数组类数据按 id 去重
   */
  _mergeIntoLocal(shared) {
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

        Object.entries(monthData.data).forEach(([staffName, sharedPerson]) => {
          // 如果本地没有该人数据，直接写入
          if (!localMonthData[staffName]) {
            localMonthData[staffName] = sharedPerson;
            return;
          }

          // 合并 dates
          const localPerson = localMonthData[staffName];
          if (sharedPerson.dates && sharedPerson.dates !== null) {
            // 确保本地有 dates 结构
            if (!localPerson.dates || localPerson.dates === null) {
              localPerson.dates = {};
            }
            // 逐日合并：共享数据覆盖本地已有日期，但保留远程没有的本地日期
            Object.entries(sharedPerson.dates).forEach(([dateKey, dateVal]) => {
              localPerson.dates[dateKey] = dateVal;
            });
          }

          // 合并备注
          if (sharedPerson.note) {
            localPerson.note = localPerson.note
              ? (localPerson.note.includes(sharedPerson.note) ? localPerson.note : localPerson.note + '; ' + sharedPerson.note)
              : sharedPerson.note;
          }

          // 如果共享数据有 total 且本地没有 dates，更新 total
          if (!localPerson.dates && sharedPerson.total) {
            localPerson.total = Math.max(localPerson.total || 0, sharedPerson.total);
          }
        });
      });

      Store.set('availability', localAvail);
    }

    // === 换班记录 (shiftChanges) ===
    if (shared.shiftChanges && shared.shiftChanges.length > 0) {
      const local = Store.get('shiftChanges') || [];
      const merged = this._mergeArraysById(local, shared.shiftChanges);
      if (merged.length > local.length) {
        Store.set('shiftChanges', merged);
      }
    }

    // === 店务支援 (storeSupport) ===
    if (shared.storeSupport && shared.storeSupport.length > 0) {
      const local = Store.get('storeSupport') || [];
      const merged = this._mergeArraysById(local, shared.storeSupport);
      if (merged.length > local.length) {
        Store.set('storeSupport', merged);
      }
    }

    // === 门迎排班 (doorSchedule) ===
    if (shared.doorSchedule && shared.doorSchedule.length > 0) {
      const local = Store.get('doorSchedule') || [];
      const merged = this._mergeArraysByDate(local, shared.doorSchedule);
      if (merged.length > local.length) {
        Store.set('doorSchedule', merged);
      }
    }
  },

  /**
   * 将本地数据合并到共享数据对象（用于推送前）
   */
  _mergeLocalIntoShared(shared) {
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
  },

  /**
   * 按 id 去重合并数组
   */
  _mergeArraysById(local, remote) {
    const map = new Map();
    local.forEach(item => map.set(item.id, item));
    remote.forEach(item => map.set(item.id, item));
    return Array.from(map.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
  },

  /**
   * 按 date 去重合并数组（用于 doorSchedule）
   */
  _mergeArraysByDate(local, remote) {
    const map = new Map();
    local.forEach(item => map.set(item.date, item));
    remote.forEach(item => map.set(item.date, item));
    return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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

// ===== 定期自动拉取（每60秒） =====
setInterval(() => {
  if (Sync.isEnabled()) {
    Sync.pull(true).then(() => Sync._updateIndicator()).catch(() => {});
  }
}, 60000);

// ===== UI 状态指示器更新 =====
/**
 * 更新页面顶部的同步状态指示器
 */
Sync._updateIndicator = function() {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  const indicator = document.getElementById('syncIndicator');
  if (!dot || !label) return;

  if (this.isEnabled()) {
    dot.style.background = '#10b981';
    label.textContent = '已同步';
    indicator.title = '云端同步已启用 · 点击重新配置';
    indicator.style.cursor = 'pointer';
    indicator.onclick = () => Sync._showConfigDialog();
  } else {
    dot.style.background = '#f59e0b';
    label.textContent = '仅本地';
    indicator.title = '云端同步未配置 · 点击配置';
    indicator.style.cursor = 'pointer';
    indicator.onclick = () => Sync._showConfigDialog();
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
        msgEl.innerHTML = '<span style="color:#10b981;">✅ 验证成功！1.5秒后自动刷新...</span>';
        setTimeout(() => { overlay.remove(); Sync._updateIndicator(); Sync.pull(true); }, 1500);
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
};

console.log('[Sync] 云同步模块已加载');
