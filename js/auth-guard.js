/**
 * Auth Guard - 认证守卫
 * 文件: js/auth-guard.js
 * 
 * 功能：
 * 1. 检查用户是否已登录（Supabase session 或旧版 sessionStorage）
 * 2. 未登录则重定向到 login.html
 * 3. 提供全局 AuthHelper 对象，供其他代码获取当前用户信息
 */

const AuthHelper = {
  _currentUser: null,

  /**
   * 检查登录状态，未登录则跳转
   * 必须在 index.html DOM 渲染之前同步调用
   */
  async init() {
    // 优先检查 Supabase session
    if (typeof salomonSupabase !== 'undefined' && salomonSupabase.client) {
      try {
        const { data: { session } } = await salomonSupabase.client.auth.getSession();
        if (session?.user) {
          // 获取 staff 信息
          const { data: staff } = await salomonSupabase.client
            .from('staff')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();

          this._currentUser = {
            authenticated: true,
            supabaseUserId: session.user.id,
            staffId: staff?.id || null,
            staffName: staff?.staff_name || session.user.user_metadata?.name,
            dept: staff?.dept || null,
            role: staff?.role || 'parttime',
            email: session.user.email,
            session: session
          };
          // 同步写入 sessionStorage（兼容旧代码）
          sessionStorage.setItem('auth', JSON.stringify(this._currentUser));
          return true;
        }
      } catch (err) {
        console.warn('[AuthHelper] Supabase session 检查失败:', err);
      }
    }

    // 降级：检查旧版 sessionStorage
    const legacyAuth = sessionStorage.getItem('auth');
    if (legacyAuth) {
      try {
        const parsed = JSON.parse(legacyAuth);
        if (parsed.authenticated || parsed.role === 'admin') {
          this._currentUser = parsed;
          return true;
        }
      } catch(e) { /* 格式错误，忽略 */ }
    }

    // 未登录，重定向
    this._redirect();
    return false;
  },

  _redirect() {
    const currentPath = window.location.pathname;
    if (!currentPath.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
  },

  /**
   * 获取当前登录用户
   */
  getCurrentUser() {
    return this._currentUser;
  },

  /**
   * 是否已登录
   */
  isAuthenticated() {
    return this._currentUser !== null;
  },

  /**
   * 是否是管理员
   */
  isAdmin() {
    return this._currentUser?.role === 'admin';
  },

  /**
   * 是否是店长
   */
  isManager() {
    return this._currentUser?.role === 'manager' || this.isAdmin();
  },

  /**
   * 获取当前员工姓名
   */
  getCurrentStaffName() {
    return this._currentUser?.staffName || null;
  },

  /**
   * 获取当前员工 ID
   */
  getCurrentStaffId() {
    return this._currentUser?.staffId || null;
  },

  /**
   * 退出登录
   */
  async logout() {
    // Supabase 登出
    if (typeof salomonSupabase !== 'undefined' && salomonSupabase.client) {
      try {
        await salomonSupabase.client.auth.signOut();
      } catch(e) { console.warn('[AuthHelper] Supabase signOut 失败:', e); }
    }
    // 清除本地状态
    sessionStorage.removeItem('auth');
    this._currentUser = null;
    window.location.href = 'login.html';
  },

  /**
   * 获取当前用户的 Supabase access token（用于 API 调用）
   */
  async getAccessToken() {
    if (this._currentUser?.session?.access_token) {
      return this._currentUser.session.access_token;
    }
    if (typeof salomonSupabase !== 'undefined' && salomonSupabase.client) {
      const { data: { session } } = await salomonSupabase.client.auth.getSession();
      return session?.access_token || null;
    }
    return null;
  }
};

// 暴露到全局
window.AuthHelper = AuthHelper;
