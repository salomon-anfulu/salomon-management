/* ============================================================
 * Salomon 兼职管理系统 - Supabase 客户端封装
 * 文件: js/supabase-client.js
 * 说明: 在 index.html 里先于 app.js 引入
 *       提供一个全局对象 window.SbClient 给 app.js 使用
 * ============================================================ */

// ============================================================
// 1. 配置区（用户执行完 Supabase 注册后填写）
// ============================================================
// 安全说明：
// - SUPABASE_URL 和 SUPABASE_ANON_KEY 都是设计为前端公开的
// - 安全由 RLS（行级安全策略）保证，不是由 key 保密保证
// - 绝对不要把 service_role key 放到这里
const SUPABASE_CONFIG = {
  // 例如: 'https://abcdefghijklmnopqr.supabase.co'
  url: window.__SALOMON_SUPABASE_URL__ || '',
  // 例如: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  anonKey: window.__SALOMON_SUPABASE_ANON_KEY__ || ''
};

// 兼容性检测：如果没有填配置，自动降级为 localStorage-only 模式
function hasValidConfig() {
  return Boolean(
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.url.startsWith('https://') &&
    SUPABASE_CONFIG.anonKey &&
    SUPABASE_CONFIG.anonKey.startsWith('eyJ')
  );
}

// ============================================================
// 2. 动态加载 Supabase JS 客户端（UMD 版本，通过 CDN）
// ============================================================
// 为了不增加项目复杂度，通过 CDN 引入 supabase-js。
// 如果用户内网环境无法访问 CDN，可以下载到本地 js/ 目录并修改此加载逻辑。
function loadSupabaseLib() {
  return new Promise((resolve, reject) => {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      resolve(supabase.createClient);
      return;
    }
    if (!hasValidConfig()) {
      // 没有配置时，不加载，直接用降级对象
      resolve(null);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.async = true;
    script.onload = () => {
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        resolve(supabase.createClient);
      } else {
        reject(new Error('Supabase 库加载失败'));
      }
    };
    script.onerror = () => reject(new Error('Supabase CDN 加载失败'));
    document.head.appendChild(script);
  });
}

// ============================================================
// 3. Supabase 客户端单例 + 健康状态
// ============================================================
let _client = null;
let _status = { online: false, lastError: null, initialized: false };

async function initSupabase() {
  if (_client) return _client;
  if (!hasValidConfig()) {
    _status.initialized = true;
    _status.online = false;
    return null;
  }
  try {
    const createClient = await loadSupabaseLib();
    if (!createClient) {
      _status.initialized = true;
      return null;
    }
    _client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
      // 数据库级自动重连
      db: { schema: 'public' }
    });
    // 便利别名：让 login.html 和 auth-guard.js 也能用 salomonSupabase.client 访问
    window.salomonSupabase = { client: _client };
    _status.initialized = true;
    // 做一次健康检查（读一条 staff 记录）—— 失败不抛错，避免健康检查失败导致登录也跑不了
    const { error } = await _client.from('staff').select('id').limit(1);
    if (error) {
      console.warn('[SbClient] 健康检查失败，但客户端仍可用:', error.message);
    } else {
      console.log('[SbClient] Supabase 连接成功:', SUPABASE_CONFIG.url);
    }
    _status.online = true;
    return _client;
  } catch (e) {
    _status.online = false;
    _status.lastError = e.message || String(e);
    console.warn('[SbClient] Supabase 初始化失败，降级为 localStorage-only:', e);
    return null;
  }
}

// ============================================================
// 4. 工具函数：名字 ↔ ID 映射（用于历史数据迁移）
// ============================================================
function _normalizeName(name) {
  if (!name) return '';
  return String(name).trim().replace(/\s+/g, ' ');
}

// ============================================================
// 5. 核心 API 封装（对应数据库表）
// ============================================================
const SbAPI = {
  // 通用状态
  isOnline() { return _status.online && !!_client; },
  isInitialized() { return _status.initialized; },
  status() { return { ..._status }; },

  // 强制重新初始化（配置变更后调用）
  async reconfigure(url, anonKey) {
    SUPABASE_CONFIG.url = url;
    SUPABASE_CONFIG.anonKey = anonKey;
    _client = null;
    _status = { online: false, lastError: null, initialized: false };
    return await initSupabase();
  },

  // ==================== staff 表 ====================
  async getStaffList() {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('staff')
      .select('*')
      .eq('is_deleted', false)
      .order('id', { ascending: true });
    return { data, error };
  },

  async upsertStaff(staff) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('staff')
      .upsert({
        id: staff.id,
        name: staff.name,
        gender: staff.gender || '',
        dept: staff.dept || 'Service Team',
        join_date: staff.joinDate || null,
        status: staff.status || 'active',
        avatar_color: staff.avatar_color || '',
        available_days: Number(staff.availableDays) || 0,
        mbti: staff.mbti || '',
        note: staff.note || '',
        transferred_from: staff.transferredFrom || '',
        service_team_start_date: staff.serviceTeamStartDate || '',
        is_deleted: false
      }, { onConflict: 'id' });
    return { error };
  },

  async deleteStaff(id) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    // 软删除
    const { error } = await _client
      .from('staff')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    return { error };
  },

  // ==================== availability 表 ====================
  async getAvailability(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('availability')
      .select('*')
      .eq('month', month)
      .order('staff_id', { ascending: true })
      .order('date_key', { ascending: true });
    return { data, error };
  },

  async upsertAvailability(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('availability')
      .upsert({
        staff_id: record.staff_id,
        staff_name: record.staff_name,
        month: record.month,
        date_key: record.date_key,
        available: Boolean(record.available),
        note: record.note || '',
        dept: record.dept || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'staff_id,month,date_key' });
    return { error };
  },

  async saveAvailabilityDay(staffId, staffName, month, dateKey, available, note, dept) {
    return await this.upsertAvailability({
      staff_id: staffId,
      staff_name: staffName,
      month: month,
      date_key: dateKey,
      available: available,
      note: note || '',
      dept: dept || 'Service Team'
    });
  },

  async deleteAvailability(staffId, month, dateKey) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('availability')
      .delete()
      .eq('staff_id', staffId)
      .eq('month', month)
      .eq('date_key', dateKey);
    return { error };
  },

  // ==================== door_schedule 表 ====================
  async getDoorSchedule(dateStr) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('door_schedule')
      .select('*')
      .eq('date_str', dateStr)
      .order('time_slot', { ascending: true });
    return { data, error };
  },

  async getAllDoorSchedule() {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('door_schedule')
      .select('*')
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });
    return { data, error };
  },

  async upsertDoorSlot(dateStr, timeSlot, staffName, staffId, slotType) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('door_schedule')
      .upsert({
        date: dateStr,
        date_str: dateStr,
        time_slot: timeSlot,
        staff_name: staffName,
        staff_id: staffId || null,
        slot_type: slotType || 'normal',
        updated_at: new Date().toISOString()
      }, { onConflict: 'date_str,time_slot,staff_name' });
    return { error };
  },

  async deleteDoorSlot(dateStr, timeSlot, staffName) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('door_schedule')
      .delete()
      .eq('date_str', dateStr)
      .eq('time_slot', timeSlot)
      .eq('staff_name', staffName);
    return { error };
  },

  // ==================== schedules 表 ====================
  async getSchedules(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('schedules')
      .select('*')
      .like('date_str', month + '%')
      .order('date', { ascending: true })
      .order('staff_id', { ascending: true });
    return { data, error };
  },

  async upsertSchedule(staffId, staffName, dateStr, shift, dept) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('schedules')
      .upsert({
        staff_id: staffId,
        staff_name: staffName,
        date: dateStr,
        date_str: dateStr,
        shift: shift,
        dept: dept || 'Service Team',
        updated_at: new Date().toISOString()
      }, { onConflict: 'staff_id,date_str' });
    return { error };
  },

  async deleteSchedule(staffId, dateStr) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('schedules')
      .delete()
      .eq('staff_id', staffId)
      .eq('date_str', dateStr);
    return { error };
  },

  // ==================== shift_changes 表 ====================
  async getShiftChanges() {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('shift_changes')
      .select('*')
      .order('id', { ascending: true });
    return { data, error };
  },

  async insertShiftChange(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('shift_changes')
      .insert({
        applicant: record.applicant,
        applicant_id: record.applicant_id || null,
        applicant_shift: record.applicantShift,
        target: record.target,
        target_id: record.target_id || null,
        target_shift: record.targetShift,
        apply_date: record.applyDate || null,
        status: record.status || 'approved'
      });
    return { error };
  },

  async deleteShiftChange(id) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client.from('shift_changes').delete().eq('id', id);
    return { error };
  },

  // ==================== store_support 表 ====================
  async getStoreSupport() {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('store_support')
      .select('*')
      .order('date', { ascending: true });
    return { data, error };
  },

  async insertStoreSupport(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('store_support')
      .insert({
        staff_name: record.staff,
        staff_id: record.staff_id || null,
        date: record.date || null,
        date_str: record.date,
        type: record.type,
        duration: record.duration || '',
        detail: record.detail || ''
      });
    return { error };
  },

  async deleteStoreSupport(id) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client.from('store_support').delete().eq('id', id);
    return { error };
  },

  // ==================== customer_reviews 表 ====================
  async getCustomerReviews(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('customer_reviews')
      .select('*')
      .eq('month', month)
      .order('id', { ascending: true });
    return { data, error };
  },

  async upsertCustomerReview(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('customer_reviews')
      .upsert({
        id: record.id,
        staff_name: record.staffName,
        staff_id: record.staff_id || null,
        month: record.month,
        rating: record.rating || 5,
        review_date: record.reviewDate || null,
        snippet: record.snippet,
        keywords: Array.isArray(record.keywords) ? record.keywords : [],
        source: record.source || ''
      }, { onConflict: 'id' });
    return { error };
  },

  async deleteCustomerReview(id) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client.from('customer_reviews').delete().eq('id', id);
    return { error };
  },

  // ==================== performance_data 表 ====================
  async getPerformanceData(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('performance_data')
      .select('*')
      .eq('month', month)
      .order('sales', { ascending: false });
    return { data, error };
  },

  async upsertPerformanceRecord(month, record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('performance_data')
      .upsert({
        month: month,
        staff_name: record.name,
        staff_id: record.staff_id || null,
        sales: Number(record.sales) || 0,
        sales_share: Number(record.salesShare) || 0,
        qty: Number(record.qty) || 0,
        tickets: Number(record.tickets) || 0,
        upt: Number(record.upt) || 0,
        avg_price: Number(record.avgPrice) || 0,
        work_hours: Number(record.workHours) || 0,
        hourly_output: Number(record.hourlyOutput) || 0,
        total_sales: Number(record.totalSales) || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'month,staff_name' });
    return { error };
  },

  // ==================== ratings 表 ====================
  async getRatings(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('ratings')
      .select('*')
      .eq('month', month)
      .order('avg_score', { ascending: false });
    return { data, error };
  },

  async upsertRating(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('ratings')
      .upsert({
        id: record.id,
        staff_id: record.staffId,
        staff_name: record.staff_name || '',
        month: record.month,
        score_availability: Number(record.scores?.availability) || 0,
        score_performance: Number(record.scores?.performance) || 0,
        score_behavior: Number(record.scores?.behavior) || 0,
        score_attendance: Number(record.scores?.attendance) || 0,
        score_customer: Number(record.scores?.customerReview) || 0,
        avg_score: Number(record.avgScore) || 0,
        hourly_rate: Number(record.hourlyRate) || 28,
        comment: record.comment || ''
      }, { onConflict: 'id' });
    return { error };
  },

  // ==================== attendance 表 ====================
  async getAttendanceByMonth(month) {
    if (!_client) return { data: [], error: new Error('Supabase 未初始化') };
    const { data, error } = await _client
      .from('attendance')
      .select('*')
      .like('date_str', month + '%')
      .order('date', { ascending: true })
      .order('staff_name', { ascending: true });
    return { data, error };
  },

  async upsertAttendance(record) {
    if (!_client) return { error: new Error('Supabase 未初始化') };
    const { error } = await _client
      .from('attendance')
      .upsert({
        staff_name: record.name,
        staff_id: record.staff_id || null,
        date: record.date,
        date_str: record.date,
        sign_in: record.signIn || '',
        sign_out: record.signOut || '',
        status: record.status || '打卡正常',
        total_hours: record.totalHours || '',
        calc_hours: record.calcHours || null,
        source: record.source || 'linggong',
        updated_at: new Date().toISOString()
      }, { onConflict: 'staff_name,date_str,source' });
    return { error };
  },

  // ==================== Realtime 订阅 ====================
  subscribe(table, callback, filter) {
    if (!_client) return null;
    const channel = _client.channel('sb-changes-' + table);
    const listenConfig = { event: '*', schema: 'public', table: table };
    if (filter) listenConfig.filter = filter;
    channel.on('postgres_changes', listenConfig, (payload) => {
      try {
        callback(payload);
      } catch (e) {
        console.warn('[SbClient] Realtime callback error:', e);
      }
    });
    channel.subscribe();
    return channel;
  },

  unsubscribe(channel) {
    if (_client && channel) _client.removeChannel(channel);
  }
};

// ============================================================
// 6. 初始化入口
// ============================================================
// 页面加载时自动初始化，返回 Promise 供 app.js 等待
window.SbClient = {
  ...SbAPI,
  init: initSupabase,
  _client: () => _client
};

// 非阻塞自动启动
window.SbClient.initPromise = initSupabase();
