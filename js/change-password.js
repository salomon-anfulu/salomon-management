/**
 * Change Password - 自助改密模块（v153）
 * 文件: js/change-password.js
 *
 * 功能：
 * 1. 弹出自助改密框（当前密码 / 新密码 / 确认）
 * 2. 先用当前密码 re-authenticate，再 updateUser 改自己的密码
 * 3. 成功后清除 blob staff 条目的 must_change_pw 标志并同步
 * 4. 监听 app:remote-synced 事件，登录后若 must_change_pw 则强制弹框
 *
 * 依赖全局：AuthHelper（当前用户）、salomonSupabase.client（Supabase Auth）、
 *          Store、Sync、showToast
 */

let _cpForceOpen = false;

function _cpEscHandler(e) {
  if (e.key === 'Escape') e.stopPropagation();
}

function openChangePasswordModal(force = false) {
  if (document.getElementById('cpModal')) return; // 已在打开，防重复
  const user = AuthHelper.getCurrentUser() || {};
  const email = user.email || '';

  const backdrop = document.createElement('div');
  backdrop.id = 'cpModal';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(15,15,25,.55);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'width:min(390px,92vw);background:var(--bg-secondary,#fff);color:var(--text-primary,#111);border:1px solid var(--border,#e5e7eb);border-radius:16px;padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.3);';
  box.innerHTML = `
    <h3 style="margin:0 0 4px;font-size:18px;font-weight:800;">${force ? '🔐 首次登录须修改密码' : '修改密码'}</h3>
    <p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:var(--text-secondary,#666);">${force ? '为保障账号安全，请设置你自己的独立密码（修改后统一口令对该账号失效）。' : '设置一个你自己独立的密码。'}</p>
    <label style="font-size:12px;font-weight:600;">当前密码</label>
    <input id="cpCurrent" type="password" autocomplete="current-password" placeholder="请输入当前密码" style="width:100%;margin:6px 0 12px;padding:10px 12px;border:1px solid var(--border,#e5e7eb);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg-input,#fff);color:var(--text-primary,#111);">
    <label style="font-size:12px;font-weight:600;">新密码（至少 8 位）</label>
    <input id="cpNew" type="password" autocomplete="new-password" placeholder="至少 8 位，建议字母+数字" style="width:100%;margin:6px 0 12px;padding:10px 12px;border:1px solid var(--border,#e5e7eb);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg-input,#fff);color:var(--text-primary,#111);">
    <label style="font-size:12px;font-weight:600;">确认新密码</label>
    <input id="cpConfirm" type="password" autocomplete="new-password" placeholder="再次输入新密码" style="width:100%;margin:6px 0 14px;padding:10px 12px;border:1px solid var(--border,#e5e7eb);border-radius:8px;font-size:14px;box-sizing:border-box;background:var(--bg-input,#fff);color:var(--text-primary,#111);">
    <div id="cpMsg" style="font-size:12px;min-height:16px;margin-bottom:10px;color:#ef4444;"></div>
    <div style="display:flex;gap:10px;">
      <button id="cpSubmit" style="flex:1;padding:10px;border:none;border-radius:8px;background:var(--accent,#1a1a2e);color:#fff;font-size:14px;font-weight:700;cursor:pointer;">确认修改</button>
      ${force ? '' : '<button id="cpCancel" style="padding:10px 16px;border:1px solid var(--border,#e5e7eb);border-radius:8px;background:transparent;color:var(--text-primary,#111);font-size:14px;cursor:pointer;">取消</button>'}
    </div>
  `;
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  setTimeout(() => document.getElementById('cpCurrent') && document.getElementById('cpCurrent').focus(), 50);

  document.getElementById('cpSubmit').onclick = submitChangePassword;
  if (!force) {
    document.getElementById('cpCancel').onclick = closeChangePasswordModal;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeChangePasswordModal(); });
  } else {
    _cpForceOpen = true;
    document.addEventListener('keydown', _cpEscHandler, true);
  }
}

function closeChangePasswordModal() {
  const m = document.getElementById('cpModal');
  if (m) m.remove();
  if (_cpForceOpen) {
    _cpForceOpen = false;
    document.removeEventListener('keydown', _cpEscHandler, true);
  }
}

async function submitChangePassword() {
  const cur = document.getElementById('cpCurrent').value;
  const neu = document.getElementById('cpNew').value;
  const conf = document.getElementById('cpConfirm').value;
  const msg = document.getElementById('cpMsg');
  msg.style.color = '#ef4444';

  if (!cur || !neu || !conf) { msg.textContent = '请填写所有字段'; return; }
  if (neu.length < 8) { msg.textContent = '新密码至少 8 位'; return; }
  if (neu !== conf) { msg.textContent = '两次输入的新密码不一致'; return; }
  if (neu === cur) { msg.textContent = '新密码不能与当前密码相同'; return; }

  const user = AuthHelper.getCurrentUser();
  if (!user || !user.email) { msg.textContent = '无法获取当前账号，请重试'; return; }

  msg.style.color = '#2563eb';
  msg.textContent = '验证中…';

  // 1. 用当前密码重新认证（刷新会话，证明知道旧密码）
  const { error: reErr } = await salomonSupabase.client.auth.signInWithPassword({ email: user.email, password: cur });
  if (reErr) { msg.style.color = '#ef4444'; msg.textContent = '当前密码错误'; return; }

  // 2. 修改自己的密码
  const { error: upErr } = await salomonSupabase.client.auth.updateUser({ password: neu });
  if (upErr) { msg.style.color = '#ef4444'; msg.textContent = '修改失败：' + upErr.message; return; }

  // 3. 清除 blob staff 条目的 must_change_pw 标志并同步
  try {
    const staff = Store.get('staff') || [];
    let matched = false;
    const next = staff.map(s => {
      const isMe = (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
                   (s.auth_id && s.auth_id === user.supabaseUserId) ||
                   (s.id && String(s.id) === String(user.staffId));
      if (isMe) { matched = true; return Object.assign({}, s, { must_change_pw: false }); }
      return s;
    });
    if (matched) {
      Store.set('staff', next);
      if (typeof Sync !== 'undefined' && Sync.push) Sync.push('change-password');
    }
  } catch (e) {
    console.warn('[ChangePassword] 清除 must_change_pw 失败（不影响密码修改）:', e);
  }

  closeChangePasswordModal();
  if (typeof showToast === 'function') showToast('密码修改成功，请妥善保管', 'success');
}

function checkMustChangePassword() {
  const user = AuthHelper.getCurrentUser();
  if (!user) return;
  const staff = Store.get('staff') || [];
  const me = staff.find(s =>
    (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
    (s.auth_id && s.auth_id === user.supabaseUserId) ||
    (s.id && String(s.id) === String(user.staffId))
  );
  if (me && me.must_change_pw) {
    openChangePasswordModal(true);
  }
}

// 远端数据合并完成后，检查是否需要强制改密
window.addEventListener('app:remote-synced', () => {
  try { checkMustChangePassword(); } catch (e) { console.warn('[ChangePassword] 检查失败:', e); }
});

// 兜底：若事件已错过（如本地已有数据），启动后也查一次
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkMustChangePassword, 2500);
});

// 暴露到全局
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
