/**
 * ========================================
 * 安福路 Salomon 兼职管理系统 - 核心应用逻辑
 * Store + Router + Components
 * ========================================
 */

// ===== 管理者账号识别（admin/manager 角色，不显示在人员列表/统计中）=====
// v156: admin 账号统一识别为管理者，不出现在任何人员列表/统计/填报下拉中
// v158: 数据库里 admin.id=7，blob 里也可能是其他 id，dept='管理'
//   ——改用 name/dept/role 多字段识别，不再依赖具体 id 数字
function isManagementStaff(s) {
  if (!s) return false;
  const name = (s.name || '').toLowerCase();
  if (name.includes('管理员') || name === 'admin') return true;
  const email = (s.email || '').toLowerCase();
  if (email.includes('admin')) return true;
  if (s.dept === '管理' || s.dept === 'Admin') return true;
  if (s.role === 'admin' || s.role === 'manager') return true;
  return false;
}

// ===== Data Store (LocalStorage Persistence) =====
const Store = {
  KEY: 'salomon_parttime_mgmt',

  defaults: {
    staff: [
      // ===== Service Team (门店兼职) =====
      { id: 2, name: '田佳乐', gender: '男', dept: 'Service Team', joinDate: '2026-02-01', status: 'active', avatar_color: '#8b5cf6', availableDays: 27, mbti: '' },
      { id: 3, name: '迟骋', gender: '男', dept: 'Service Team', joinDate: '2026-01-20', status: 'active', avatar_color: '#ec4899', availableDays: 26, mbti: '' },
      { id: 4, name: '王靳毓', gender: '女', dept: 'Service Team', joinDate: '2026-03-01', status: 'active', avatar_color: '#f59e0b', availableDays: 25, mbti: '' },
      { id: 5, name: '朱凯赟', gender: '男', dept: 'Service Team', joinDate: '2026-02-15', status: 'active', avatar_color: '#10b981', availableDays: 24, mbti: '' },
      { id: 6, name: '孔祥宇', gender: '女', dept: 'Service Team', joinDate: '2026-01-10', status: 'active', avatar_color: '#06b6d4', availableDays: 29, mbti: '' },
      { id: 7, name: '邓奇缘', gender: '男', dept: 'Service Team', joinDate: '2026-03-10', status: 'active', avatar_color: '#f43f5e', availableDays: 28, mbti: '' },
      { id: 8, name: '杨子豪', gender: '男', dept: 'Service Team', joinDate: '2026-02-20', status: 'active', avatar_color: '#6366f1', availableDays: 26, mbti: '' },
      { id: 9, name: '王雅澜', gender: '女', dept: 'Service Team', joinDate: '2026-01-05', status: 'active', avatar_color: '#a855f7', availableDays: 26, mbti: '' },
      // 李若彤 已离职（v156: 在 defaults 保留并标记 left，迁移逻辑每 init 强制同步为离职）
      { id: 10, name: '李若彤', gender: '女', dept: 'Service Team', joinDate: '2026-01-15', status: 'left', avatar_color: '#14b8a6', availableDays: 0, mbti: '' },
      { id: 11, name: '王龙宇', gender: '男', dept: 'Service Team', joinDate: '2026-04-01', status: 'active', avatar_color: '#eab308', availableDays: 10, note: '19日到30日出差，请假', mbti: '' },
      { id: 12, name: '何秋烨', gender: '女', dept: 'Service Team', joinDate: '2026-03-15', status: 'active', avatar_color: '#f97316', availableDays: 23, mbti: '' },
      { id: 13, name: '龚赟昊', gender: '男', dept: 'Service Team', joinDate: '2026-02-25', status: 'active', avatar_color: '#84cc16', availableDays: 25, mbti: '' },
      { id: 20, name: '唐蓉', gender: '女', dept: 'Service Team', joinDate: '2026-07-01', status: 'active', avatar_color: '#ec4899', availableDays: 0, mbti: '', serviceTeamStartDate: '2026-07-01' },
      { id: 21, name: '李健华', gender: '男', dept: '仓库兼职', joinDate: '2026-07-08', status: 'active', avatar_color: '#10b981', availableDays: 0, mbti: '' },
      { id: 22, name: '吴嘉莹', gender: '女', dept: '仓库兼职', joinDate: '2026-07-08', status: 'active', avatar_color: '#06b6d4', availableDays: 0, mbti: '' },
      // ===== 仓库兼职 =====
      { id: 14, name: '严佳铮', gender: '男', dept: '仓库兼职', joinDate: '2026-03-01', status: 'active', avatar_color: '#22d3ee', availableDays: 7, mbti: '' },
      { id: 15, name: '祖白代', gender: '女', dept: '仓库兼职', joinDate: '2026-01-20', status: 'active', avatar_color: '#fb923c', availableDays: 29, mbti: '' },
      { id: 16, name: '陈广权', gender: '男', dept: '仓库兼职', joinDate: '2026-02-05', status: 'active', avatar_color: '#a78bfa', availableDays: 26, mbti: '' },
      { id: 23, name: '何思嘉', gender: '女', dept: '仓库兼职', joinDate: '2026-07-22', status: 'active', avatar_color: '#3b82f6', availableDays: 0, mbti: '' },
      { id: 17, name: '贾长乐', gender: '男', dept: 'Service Team', joinDate: '2026-03-10', status: 'active', avatar_color: '#f472b6', availableDays: 13, mbti: '', transferredFrom: '仓库兼职', serviceTeamStartDate: '2026-07-20' },
      { id: 18, name: '玛依拉', gender: '女', dept: 'Service Team', joinDate: '2026-02-15', status: 'active', avatar_color: '#34d399', availableDays: 23, mbti: '', transferredFrom: '仓库兼职', serviceTeamStartDate: '2026-07-01' },
      { id: 19, name: '梁实秋', gender: '男', dept: 'Service Team', joinDate: '2026-01-25', status: 'active', avatar_color: '#fbbf24', availableDays: 19, mbti: '', transferredFrom: '仓库兼职', serviceTeamStartDate: '2026-07-20' },
    ],

    // 供班数据（多月结构，支持逐日状态+备注）
    // 旧结构 { month, data: { name: { total, unavailable, note } } } 已在 Store.init 中迁移
    availability: {
      currentMonth: '2026-06',
      months: {
        '2026-06': {
          data: {
            '田佳乐': { total: 26, unavailable: ['6/1', '6/7', '6/13', '6/15'], note: '', dates: null },
            '迟骋': { total: 26, unavailable: ['6/3', '6/9', '6/16', '6/30'], note: '', dates: null },
            '王靳毓': { total: 25, unavailable: ['6/3', '6/13', '6/14', '6/15', '6/18'], note: '', dates: null },
            '朱凯赟': { total: 24, unavailable: ['6/4', '6/5', '6/9', '6/15', '6/17', '6/30'], note: '', dates: null },
            '孔祥宇': { total: 29, unavailable: ['6/6'], note: '', dates: null },
            '邓奇缘': { total: 28, unavailable: ['6/5', '6/25'], note: '', dates: null },
            '杨子豪': { total: 26, unavailable: ['6/3', '6/11', '6/13', '6/14'], note: '', dates: null },
            '王雅澜': { total: 26, unavailable: ['6/13', '6/14', '6/15', '6/16'], note: '', dates: null },
            '王龙宇': { total: 10, unavailable: ['6/2','6/3','6/7','6/9','6/12','6/13','6/14','6/16','6/18','6/19','6/20','6/21','6/22','6/23','6/24','6/25','6/26','6/27','6/28','6/29','6/30'], note: '19日到30日出差，请假', dates: null },
            '何秋烨': { total: 23, unavailable: ['6/1', '6/8', '6/9', '6/13', '6/14', '6/15', '6/17'], note: '', dates: null },
            '龚赟昊': { total: 25, unavailable: ['6/1', '6/4', '6/8', '6/15', '6/17'], note: '', dates: null },
          }
        },
        '2026-07': {
          data: {}
        }
      }
    },

    // 门迎排班数据（6月1日-20日，来源：腾讯文档PT供班）
doorSchedule: [
      { date: '2026-06-01', slots: [
        { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '李若彤' },
        { time: '13:00-14:00', staff: '杨子豪' },
        { time: '14:00-15:00', staff: '王靳毓' },
        { time: '16:00-17:00', staff: '邓奇缘' },
        { time: '17:00-18:00', staff: '杨子豪' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '李若彤' }
      ]},
      { date: '2026-06-02', slots: [
        { time: '10:00-11:00', staff: '田佳乐' },
        { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '12:00-13:00', staff: '王靳毓' },
        { time: '13:00-14:00', staff: '龚赟昊' },
        { time: '15:00-16:00', staff: '李若彤' },
        { time: '17:00-18:00', staff: '孔祥宇' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '龚赟昊' },
        { time: '20:00-21:00', staff: '李若彤' }
      ]},
      { date: '2026-06-03', slots: [
        { time: '10:00-11:00', staff: '何秋烨' },
        { time: '11:00-12:00', staff: '朱凯赟' },
        { time: '12:00-13:00', staff: '邓奇缘' },
        { time: '13:00-14:00', staff: '王雅澜' },
        { time: '13:00-14:00', staff: '何秋烨' },
        { time: '14:00-15:00', staff: '田佳乐' },
        { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '朱凯赟' },
        { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '王雅澜' },
        { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '王雅澜' },
        { time: '20:00-21:00', staff: '王龙宇' },
        { time: '20:00-21:00', staff: '田佳乐' }
      ]},
      { date: '2026-06-04', slots: [
        { time: '10:00-11:00', staff: '迟骋' },
        { time: '11:00-12:00', staff: '王雅澜' },
        { time: '12:00-13:00', staff: '杨子豪' },
        { time: '13:00-14:00', staff: '王龙宇' },
        { time: '14:00-15:00', staff: '田佳乐' },
        { time: '15:00-16:00', staff: '迟骋' },
        { time: '16:00-17:00', staff: '王雅澜' },
        { time: '17:00-18:00', staff: '王龙宇' },
        { time: '18:00-19:00', staff: '田佳乐' },
        { time: '19:00-20:00', staff: '杨子豪' },
        { time: '20:00-21:00', staff: '王龙宇' },
        { time: '20:00-21:00', staff: '田佳乐' }
      ]},
      { date: '2026-06-06', slots: [
        { time: '11:00-12:00', staff: '王龙宇' },
        { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '王龙宇' },
        { time: '18:00-19:00', staff: '王雅澜' },
        { time: '19:00-20:00', staff: '迟骋' },
        { time: '20:00-21:00', staff: '何秋烨' },
        { time: '21:00-21:30', staff: '何秋烨' }
      ]},
      { date: '2026-06-07', slots: [
        { time: '10:00-11:00', staff: '龚赟昊' },
        { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '孔祥宇' },
        { time: '13:00-14:00', staff: '朱凯赟' },
        { time: '14:00-15:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '孔祥宇' },
        { time: '19:00-20:00', staff: '朱凯赟' }
      ]},
      { date: '2026-06-08', slots: [
        { time: '10:00-11:00', staff: '王龙宇' },
        { time: '12:00-13:00', staff: '李若彤' },
        { time: '13:00-14:00', staff: '田佳乐' },
        { time: '14:00-15:00', staff: '迟骋' },
        { time: '15:00-16:00', staff: '王龙宇' },
        { time: '17:00-18:00', staff: '李若彤' },
        { time: '18:00-19:00', staff: '田佳乐' },
        { time: '19:00-20:00', staff: '迟骋' }
      ]},
      { date: '2026-06-09', slots: [
        { time: '10:00-11:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '孔祥宇' },
        { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '邓奇缘' },
        { time: '15:00-16:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '孔祥宇' },
        { time: '18:00-19:00', staff: '王雅澜' },
        { time: '19:00-20:00', staff: '邓奇缘' }
      ]},
      { date: '2026-06-10', slots: [
        { time: '10:00-11:00', staff: '龚赟昊' },
        { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '朱凯赟' },
        { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '何秋烨' },
        { time: '15:00-16:00', staff: '龚赟昊' },
        { time: '16:00-17:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '何秋烨' },
        { time: '18:00-19:00', staff: '王雅澜' },
        { time: '19:00-20:00', staff: '朱凯赟' }
      ]},
      { date: '2026-06-11', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' },
        { time: '11:00-12:00', staff: '李若彤' },
        { time: '13:00-14:00', staff: '王靳毓' },
        { time: '14:00-15:00', staff: '田佳乐' },
        { time: '15:00-16:00', staff: '孔祥宇' },
        { time: '16:00-17:00', staff: '李若彤' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '田佳乐' }
      ]},
      { date: '2026-06-12', slots: [
        { time: '10:00-11:00', staff: '何秋烨' },
        { time: '11:00-12:00', staff: '王龙宇' },
        { time: '12:00-13:00', staff: '王龙宇' },
        { time: '15:00-16:00', staff: '王雅澜' },
        { time: '16:00-17:00', staff: '何秋烨' },
        { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '19:00-20:00', staff: '王雅澜' },
        { time: '20:00-21:00', staff: '邓奇缘' }
      ]},
      { date: '2026-06-17', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' },
        { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '杨子豪' },
        { time: '13:00-14:00', staff: '王龙宇' },
        { time: '14:00-15:00', staff: '田佳乐' },
        { time: '15:00-16:00', staff: '孔祥宇' },
        { time: '16:00-17:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '杨子豪' },
        { time: '18:00-19:00', staff: '王龙宇' },
        { time: '19:00-20:00', staff: '田佳乐' }
      ]},
      { date: '2026-06-18', slots: [
        { time: '10:00-11:00', staff: '田佳乐' },
        { time: '11:00-12:00', staff: '田佳乐' },
        { time: '12:00-13:00', staff: '迟骋' },
        { time: '13:00-14:00', staff: '邓奇缘' },
        { time: '14:00-15:00', staff: '李若彤' },
        { time: '15:00-16:00', staff: '王雅澜' },
        { time: '16:00-17:00', staff: '朱凯赟' },
        { time: '17:00-18:00', staff: '迟骋' },
        { time: '18:00-19:00', staff: '田佳乐' },
        { time: '19:00-20:00', staff: '李若彤' },
        { time: '21:00-21:30', staff: '朱凯赟' }
      ]},
      { date: '2026-06-19', slots: [
        { time: '10:00-11:00', staff: '邓奇缘' },
        { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '杨子豪' },
        { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '龚赟昊' },
        { time: '18:00-19:00', staff: '李若彤' },
        { time: '19:00-20:00', staff: '何秋烨' },
        { time: '21:00-21:30', staff: '李若彤' }
      ]},
      { date: '2026-06-20', slots: [
        { time: '10:00-11:00', staff: '田佳乐' },
        { time: '11:00-12:00', staff: '朱凯赟' },
        { time: '13:00-14:00', staff: '迟骋' },
        { time: '14:00-15:00', staff: '王靳毓' },
        { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '杨子豪' },
        { time: '17:00-18:00', staff: '龚赟昊' },
        { time: '18:00-19:00', staff: '朱凯赟' },
        { time: '19:00-20:00', staff: '迟骋' },
        { time: '21:00-21:30', staff: '何秋烨' }
      ]},
      { date: '2026-06-21', slots: [
        { time: '10:00-11:00', staff: '迟骋' },
        { time: '11:00-12:00', staff: '王雅澜' },
        { time: '12:00-13:00', staff: '何秋烨' },
        { time: '13:00-14:00', staff: '朱凯赟' },
        { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '龚赟昊' },
        { time: '17:00-18:00', staff: '杨子豪' },
        { time: '18:00-19:00', staff: '朱凯赟' },
        { time: '20:00-21:00', staff: '龚赟昊' }
      ]},
      { date: '2026-06-22', slots: [
        { time: '10:00-11:00', staff: '王靳毓' },
        { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '12:00-13:00', staff: '龚赟昊' },
        { time: '13:00-14:00', staff: '迟骋' },
        { time: '14:00-15:00', staff: '何秋烨' },
        { time: '15:00-16:00', staff: '邓奇缘' },
        { time: '16:00-17:00', staff: '何秋烨' },
        { time: '17:00-18:00', staff: '迟骋' },
        { time: '18:00-19:00', staff: '何秋烨' },
        { time: '19:00-20:00', staff: '邓奇缘' }
      ]},
      { date: '2026-06-23', slots: [
        { time: '11:00-12:00', staff: '田佳乐' },
        { time: '12:00-13:00', staff: '何秋烨' },
        { time: '13:00-14:00', staff: '李若彤' },
        { time: '14:00-15:00', staff: '朱凯赟' },
        { time: '15:00-16:00', staff: '杨子豪' },
        { time: '17:00-18:00', staff: '田佳乐' },
        { time: '18:00-19:00', staff: '何秋烨' },
        { time: '19:00-20:00', staff: '李若彤' },
        { time: '20:00-21:00', staff: '朱凯赟' }
      ]},
      { date: '2026-06-24', slots: [
        { time: '10:00-11:00', staff: '田佳乐' },
        { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '迟骋' },
        { time: '14:00-15:00', staff: '王雅澜' },
        { time: '15:00-16:00', staff: '朱凯赟' },
        { time: '16:00-17:00', staff: '田佳乐' },
        { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '迟骋' },
        { time: '20:00-21:00', staff: '王雅澜' }
      ]},
      { date: '2026-06-25', slots: [
        { time: '10:00-11:00', staff: '王雅澜' },
        { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '杨子豪' },
        { time: '13:00-14:00', staff: '李若彤' },
        { time: '14:00-15:00', staff: '孔祥宇' },
        { time: '15:00-16:00', staff: '田佳乐' },
        { time: '16:00-17:00', staff: '龚赟昊' },
        { time: '17:00-18:00', staff: '杨子豪' },
        { time: '18:00-19:00', staff: '李若彤' },
        { time: '19:00-20:00', staff: '孔祥宇' }
      ]},
      { date: '2026-06-26', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' },
        { time: '11:00-12:00', staff: '杨子豪' },
        { time: '12:00-13:00', staff: '王雅澜' },
        { time: '13:00-14:00', staff: '李若彤' },
        { time: '14:00-15:00', staff: '邓奇缘' },
        { time: '15:00-16:00', staff: '龚赟昊' },
        { time: '16:00-17:00', staff: '孔祥宇' },
        { time: '17:00-18:00', staff: '王雅澜' },
        { time: '18:00-19:00', staff: '龚赟昊' },
        { time: '19:00-20:00', staff: '邓奇缘' },
        { time: '20:00-21:00', staff: '李若彤' },
        { time: '21:00-21:30', staff: '李若彤' }
      ]},
      { date: '2026-06-27', slots: [
        { time: '10:00-11:00', staff: '何秋烨' },
        { time: '11:00-12:00', staff: '朱凯赟' },
        { time: '12:00-13:00', staff: '孔祥宇' },
        { time: '13:00-14:00', staff: '杨子豪' },
        { time: '14:00-15:00', staff: '迟骋' },
        { time: '15:00-16:00', staff: '邓奇缘' },
        { time: '16:00-17:00', staff: '田佳乐' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '20:00-21:00', staff: '邓奇缘' }
      ]},
      { date: '2026-06-28', slots: [
        { time: '11:00-12:00', staff: '田佳乐' },
        { time: '12:00-13:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '朱凯赟' },
        { time: '15:00-16:00', staff: '李若彤' },
        { time: '16:00-17:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '迟骋' },
        { time: '18:00-19:00', staff: '龚赟昊' },
        { time: '20:00-21:00', staff: '李若彤' },
        { time: '21:00-21:30', staff: '迟骋' }
      ]},
      { date: '2026-06-29', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' },
        { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '王雅澜' },
        { time: '13:00-14:00', staff: '龚赟昊' },
        { time: '15:00-16:00', staff: '孔祥宇' },
        { time: '17:00-18:00', staff: '王雅澜' },
        { time: '18:00-19:00', staff: '龚赟昊' }
      ]},
      { date: '2026-06-30', slots: [
        { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '12:00-13:00', staff: '何秋烨' },
        { time: '13:00-14:00', staff: '田佳乐' },
        { time: '14:00-15:00', staff: '王靳毓' },
        { time: '15:00-16:00', staff: '田佳乐' },
        { time: '16:00-17:00', staff: '何秋烨' },
        { time: '17:00-18:00', staff: '何秋烨' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '王靳毓' }
      ]}
    ],
    shiftChanges: [
      { id: 1, applicant: '李若彤', applyDate: '2026-05-30', applicantShift: '6/3 12:15-21:00', target: '王雅澜', targetShift: '6/2 12:15-21:00' },
      { id: 2, applicant: '杨子豪', applyDate: '2026-06-01', applicantShift: '6/7 10:30-19:00', target: '王靳毓', targetShift: '6/4 11:30-20:30' },
      { id: 3, applicant: '杨子豪', applyDate: '2026-06-06', applicantShift: '6/9 12:15-21:00', target: '王雅澜', targetShift: '6/8 10:30-19:00' },
      { id: 4, applicant: '王靳毓', applyDate: '2026-06-09', applicantShift: '6/12 10:30-19:00', target: '王龙宇', targetShift: '6/10 10:30-19:00' },
      { id: 5, applicant: '孔祥宇', applyDate: '2026-06-20', applicantShift: '6/20 11:30-20:30', target: '王靳毓', targetShift: '6/16 13:00-21:30' },
      { id: 6, applicant: '王雅澜', applyDate: '2026-06-17', applicantShift: '6/22 12:15-21:00', target: '何秋烨', targetShift: '6/24 12:15-21:00' },
      { id: 7, applicant: '何秋烨', applyDate: '2026-06-18', applicantShift: '6/28 11:30-20:30', target: '邓奇缘', targetShift: '6/20 13:00-21:30' },
      { id: 8, applicant: '迟骋', applyDate: '2026-06-19', applicantShift: '6/23 12:15-21:00', target: '李若彤', targetShift: '6/22 12:15-21:00' },
      { id: 9, applicant: '田佳乐', applyDate: '2026-06-20', applicantShift: '6/21 13:00-21:30', target: '龚赟昊', targetShift: '6/25 13:00-21:30' },
    ],

    // 店务支援记录（真实数据）
    storeSupport: [
      { id: 1, staff: '李若彤', date: '2026-06-02', type: '货品-整理仓库', duration: '0.5小时', detail: '整理1.5衣服仓' },
      { id: 2, staff: '田佳乐', date: '2026-06-02', type: '货品-查鞋盒', duration: '1小时', detail: '货架1号，2号' },
      { id: 3, staff: '孔祥宇', date: '2026-06-02', type: '货品-查鞋盒', duration: '1小时', detail: '货架3、4、5-3、5-4号' },
      { id: 5, staff: '龚赟昊', date: '2026-06-02', type: '陈列-翻场支援', duration: '1小时', detail: '换1楼模特衣服' },
      { id: 6, staff: '孔祥宇', date: '2026-06-02', type: '货品-整理仓库', duration: '1小时', detail: '送鞋' },
      { id: 7, staff: '李若彤', date: '2026-06-02', type: '货品-整理仓库', duration: '1小时', detail: '送鞋' },
      { id: 8, staff: '王雅澜', date: '2026-06-03', type: '货品-辅助收货', duration: '1小时', detail: '贴价签' },
      { id: 9, staff: '田佳乐', date: '2026-06-03', type: '陈列-全楼标签复核', duration: '0.5小时', detail: '全场陈列 标签检查' },
      { id: 10, staff: '朱凯赟', date: '2026-06-03', type: '货品-查鞋盒', duration: '1.5小时', detail: '巡店整理1楼内仓 1.5内仓' },
      { id: 11, staff: '邓奇缘', date: '2026-06-03', type: '货品-查鞋盒', duration: '1小时', detail: '10号及地面' },
      { id: 12, staff: '王雅澜', date: '2026-06-04', type: '货品-辅助收货', duration: '1小时', detail: '拆货分货' },
      { id: 13, staff: '迟骋', date: '2026-06-04', type: '货品-辅助收货', duration: '1小时', detail: '拆货分货' },
      { id: 14, staff: '田佳乐', date: '2026-06-04', type: '货品-辅助收货', duration: '0.5小时', detail: '拆货分货' },
      { id: 15, staff: '迟骋', date: '2026-06-04', type: '货品-查鞋盒', duration: '1小时', detail: '16号及送货' },
      { id: 16, staff: '王雅澜', date: '2026-06-06', type: '货品-辅助收货', duration: '0.5小时', detail: '收货' },
      { id: 17, staff: '何秋烨', date: '2026-06-06', type: '货品-查鞋盒', duration: '1.2小时', detail: '货架21-1/2、22 及辅助送货' },
      { id: 18, staff: '迟骋', date: '2026-06-06', type: '陈列-翻场支援', duration: '1小时', detail: '全场陈列检查' },
      { id: 19, staff: '孔祥宇', date: '2026-06-09', type: '货品-整理仓库', duration: '0.5小时', detail: '送鞋' },
      { id: 20, staff: '王靳毓', date: '2026-06-09', type: '货品-整理仓库', duration: '0.5小时', detail: '仓库人还没上班帮忙送鞋' },
      { id: 21, staff: '王靳毓', date: '2026-06-09', type: '陈列-翻场支援', duration: '0.5小时', detail: '补陈列衣服，换陈列小包' },

      { id: 24, staff: '邓奇缘', date: '2026-06-09', type: '货品-查鞋盒', duration: '1小时', detail: '4号货架' },
      { id: 25, staff: '龚赟昊', date: '2026-06-10', type: '陈列-翻场支援', duration: '0.5小时', detail: '2.5楼衣服重新叠' },
      { id: 26, staff: '王雅澜', date: '2026-06-10', type: '货品-整理仓库', duration: '0.5小时', detail: '贴标签' },
      { id: 27, staff: '孔祥宇', date: '2026-06-11', type: '陈列-翻场支援', duration: '2小时', detail: '陈列辅助/全楼拍照' },
      { id: 28, staff: '李若彤', date: '2026-06-11', type: '陈列-全楼标签复核', duration: '0.5小时', detail: '翻吊牌' },
      { id: 29, staff: '田佳乐', date: '2026-06-11', type: '陈列-全楼标签复核', duration: '0.5小时', detail: '翻吊牌' },
      { id: 30, staff: '王雅澜', date: '2026-06-12', type: '货品-整理仓库', duration: '0.5小时', detail: '贴标签' },
      { id: 31, staff: '邓奇缘', date: '2026-06-12', type: '货品-整理仓库', duration: '1小时', detail: '分货贴标签' },
      { id: 32, staff: '何秋烨', date: '2026-06-13', type: '陈列-翻场支援', duration: '1小时', detail: '跟陈列老师整理陈列并拍照' },
      { id: 33, staff: '龚赟昊', date: '2026-06-13', type: '货品-整理仓库', duration: '1小时', detail: '1.5理仓库' },
      { id: 34, staff: '孔祥宇', date: '2026-06-13', type: '货品-整理仓库', duration: '0.5小时', detail: '1.5理仓库' },
      { id: 35, staff: '朱凯赟', date: '2026-06-13', type: '货品-整理仓库', duration: '1小时', detail: '1.5理仓库' },
      { id: 36, staff: '李若彤', date: '2026-06-13', type: '陈列-翻场支援', duration: '1小时', detail: '整理钥匙' },
      { id: 38, staff: '孔祥宇', date: '2026-06-13', type: '陈列-翻场支援', duration: '1.2小时', detail: '理小票' },
      { id: 39, staff: '邓奇缘', date: '2026-06-13', type: '货品-整理仓库', duration: '1小时', detail: '新品贴价签' },
      { id: 40, staff: '李若彤', date: '2026-06-13', type: '货品-整理仓库', duration: '1小时', detail: '新品贴价签及熨烫' },
      { id: 41, staff: '孔祥宇', date: '2026-06-14', type: '货品-整理仓库', duration: '1.5小时', detail: '理货架' },
      { id: 42, staff: '龚赟昊', date: '2026-06-14', type: '陈列-全楼标签复核', duration: '0.5小时', detail: '排小票顺序' },
      { id: 43, staff: '孔祥宇', date: '2026-06-14', type: '陈列-新品熨烫', duration: '0.5小时', detail: '熨衣服' },
      { id: 44, staff: '朱凯赟', date: '2026-06-14', type: '货品-整理仓库', duration: '2小时', detail: '理鞋码 整理鞋盒' },
      { id: 45, staff: '王龙宇', date: '2026-06-14', type: '货品-辅助收货', duration: '1.5小时', detail: '1楼内仓袜子价签' },
      { id: 46, staff: '龚赟昊', date: '2026-06-14', type: '陈列-全楼标签复核', duration: '1小时', detail: '查全楼没价签的 打错的' },
      { id: 47, staff: '孔祥宇', date: '2026-06-15', type: '陈列-全楼标签复核', duration: '1.5小时', detail: '全楼检查价格签 擦鞋底 理衣服仓尺码' },
      { id: 48, staff: '王龙宇', date: '2026-06-15', type: '货品-整理仓库', duration: '1.5小时', detail: '1.5衣服内仓尺码顺序整理' },
      { id: 49, staff: '李若彤', date: '2026-06-14', type: '货品-查鞋盒', duration: '1小时', detail: '查鞋盒排顺序' },
      { id: 50, staff: '李若彤', date: '2026-06-14', type: '货品-辅助收货', duration: '1小时', detail: '贴标签价签' },
      { id: 51, staff: '田佳乐', date: '2026-06-14', type: '陈列-全楼标签复核', duration: '1小时', detail: '擦鞋底' },
      { id: 52, staff: '李若彤', date: '2026-06-15', type: '货品-整理仓库', duration: '1小时', detail: '整理1.5层' },
      { id: 53, staff: '王龙宇', date: '2026-06-15', type: '货品-整理仓库', duration: '0.5小时', detail: '1.5内仓衣服' },
      { id: 54, staff: '孔祥宇', date: '2026-06-15', type: '货品-整理仓库', duration: '0.5小时', detail: '内仓贴标签' },
      { id: 55, staff: '邓奇缘', date: '2026-06-15', type: '陈列-全楼标签复核', duration: '1小时', detail: '复核及擦鞋底' },
      { id: 56, staff: '迟骋', date: '2026-06-15', type: '货品-整理仓库', duration: '0.5小时', detail: '一楼外仓二楼外仓标签更新' },
      { id: 57, staff: '孔祥宇', date: '2026-06-16', type: '陈列-翻场支援', duration: '1小时', detail: '找退仓衣服' },
      { id: 58, staff: '龚赟昊', date: '2026-06-16', type: '陈列-翻场支援', duration: '2小时', detail: '叠退陈列衣 叠柜子衣服 换模特' },
      { id: 59, staff: '田佳乐', date: '2026-06-17', type: '陈列-翻场支援', duration: '1小时', detail: '出陈列归样' },
      { id: 60, staff: '迟骋', date: '2026-06-18', type: '货品-辅助收货', duration: '0.5小时', detail: '拆货' },
      { id: 61, staff: '朱凯赟', date: '2026-06-18', type: '货品-辅助收货', duration: '1.5小时', detail: '搬货' },
      { id: 62, staff: '迟骋', date: '2026-06-18', type: '货品-整理仓库', duration: '0.5小时', detail: '搬货' },
      { id: 63, staff: '邓奇缘', date: '2026-06-18', type: '货品-辅助收货', duration: '1小时', detail: '搬货' },
      { id: 64, staff: '迟骋', date: '2026-06-18', type: '货品-辅助收货', duration: '1小时', detail: '贴标签' },
      { id: 65, staff: '王雅澜', date: '2026-06-18', type: '货品-整理仓库', duration: '0.8小时', detail: '贴标签' },
      { id: 66, staff: '田佳乐', date: '2026-06-18', type: '货品-辅助收货', duration: '2小时', detail: '拆货 搬货 贴标签' },
      { id: 67, staff: '龚赟昊', date: '2026-06-19', type: '货品-整理仓库', duration: '1小时', detail: '1.5内仓整理' },
      { id: 68, staff: '王靳毓', date: '2026-06-19', type: '货品-整理仓库', duration: '0.5小时', detail: '1.5内仓整理' },
      { id: 69, staff: '王靳毓', date: '2026-06-19', type: '货品-整理仓库', duration: '1小时', detail: '4楼搬鞋' },
      { id: 70, staff: '邓奇缘', date: '2026-06-19', type: '陈列-翻场支援', duration: '1小时', detail: '拍新品上身图' },
      { id: 71, staff: '何秋烨', date: '2026-06-19', type: '陈列-翻场支援', duration: '1.5小时', detail: '拍新品上身图、p图' },
      { id: 72, staff: '王靳毓', date: '2026-06-20', type: '陈列-全楼标签复核', duration: '1小时', detail: '全楼花草拍照，整理陈列' },
      { id: 73, staff: '李若彤', date: '2026-06-20', type: '货品-辅助收货', duration: '6小时', detail: '发售核销' },
      { id: 74, staff: '朱凯赟', date: '2026-06-20', type: '货品-整理仓库', duration: '0.5小时', detail: '辅助陈列归货品' },
      { id: 75, staff: '龚赟昊', date: '2026-06-20', type: '货品-辅助收货', duration: '5小时', detail: '发售核销' },
      { id: 76, staff: '田佳乐', date: '2026-06-23', type: '陈列-新品熨烫', duration: '1小时', detail: '新品熨烫整理' },
      { id: 77, staff: '迟骋', date: '2026-06-24', type: '货品-辅助收货', duration: '1小时', detail: '拆货' },
      { id: 78, staff: '田佳乐', date: '2026-06-24', type: '货品-辅助收货', duration: '1.5小时', detail: '到货拆货' },
      { id: 79, staff: '田佳乐', date: '2026-06-24', type: '陈列-翻场支援', duration: '0.5小时', detail: '整理陈列' },
      { id: 81, staff: '王靳毓', date: '2026-06-25', type: '陈列-翻场支援', duration: '0.5小时', detail: '陈列熨烫 衣服归仓' },
      { id: 82, staff: '龚赟昊', date: '2026-06-25', type: '陈列-新品熨烫', duration: '1.5小时', detail: '拆包装 烫衣服' },
      { id: 83, staff: '田佳乐', date: '2026-06-25', type: '陈列-翻场支援', duration: '0.5小时', detail: '补货品调陈列' },
      { id: 84, staff: '孔祥宇', date: '2026-06-26', type: '货品-整理仓库', duration: '1.5小时', detail: '叠归陈列退下来的衣服' },
      { id: 85, staff: '王雅澜', date: '2026-06-26', type: '陈列-翻场支援', duration: '0.4小时', detail: '叠陈列衣服' },
      { id: 86, staff: '朱凯赟', date: '2026-06-27', type: '货品-查鞋盒', duration: '1小时', detail: '查鞋盒理尺码26和地面' },
      { id: 87, staff: '田佳乐', date: '2026-06-27', type: '陈列-翻场支援', duration: '0.5小时', detail: '叠陈列整理内仓' },
      { id: 88, staff: '邓奇缘', date: '2026-06-27', type: '货品-整理仓库', duration: '0.5小时', detail: '贴袜子价签' },
      { id: 89, staff: '田佳乐', date: '2026-06-28', type: '陈列-新品熨烫', duration: '0.5小时', detail: '出样熨烫' },
      { id: 91, staff: '王雅澜', date: '2026-06-28', type: '货品-查鞋盒', duration: '1小时', detail: '查鞋盒' }
    ],

    // 换班统计（缺卡/迟到/旷工已改为从灵工打卡动态计算，门迎/点评已移至各自模块）
                staffStats: {
      '田佳乐': { doorCount: 22, shiftChange: 1, shiftedCount: 0 },
      '迟骋': { doorCount: 16, shiftChange: 1, shiftedCount: 0 },
      '王靳毓': { doorCount: 19, shiftChange: 1, shiftedCount: 2 },
      '朱凯赟': { doorCount: 17, shiftChange: 0, shiftedCount: 0 },
      '孔祥宇': { doorCount: 16, shiftChange: 1, shiftedCount: 0 },
      '邓奇缘': { doorCount: 19, shiftChange: 0, shiftedCount: 1 },
      '杨子豪': { doorCount: 12, shiftChange: 2, shiftedCount: 0 },
      '王雅澜': { doorCount: 19, shiftChange: 1, shiftedCount: 2 },
      '李若彤': { doorCount: 19, shiftChange: 1, shiftedCount: 1 },
      '王龙宇': { doorCount: 10, shiftChange: 0, shiftedCount: 1 },
      '何秋烨': { doorCount: 20, shiftChange: 1, shiftedCount: 1 },
      '龚赟昊': { doorCount: 14, shiftChange: 0, shiftedCount: 1 }
    },

    schedules: [
      // 6月实际排班数据（从PT供班表+门迎排班转换）
      { id: 1, staffId: 1, date: '2026-06-01', shift: 'fullday', dept: 'Service Team' },
      { id: 2, staffId: 7, date: '2026-06-01', shift: 'fullday', dept: 'Service Team' },
      { id: 3, staffId: 10, date: '2026-06-01', shift: 'fullday', dept: 'Service Team' },
      { id: 4, staffId: 8, date: '2026-06-01', shift: 'fullday', dept: 'Service Team' },
      { id: 5, staffId: 4, date: '2026-06-01', shift: 'fullday', dept: 'Service Team' },
      { id: 6, staffId: 2, date: '2026-06-02', shift: 'fullday', dept: 'Service Team' },
      { id: 7, staffId: 6, date: '2026-06-02', shift: 'fullday', dept: 'Service Team' },
      { id: 8, staffId: 4, date: '2026-06-02', shift: 'fullday', dept: 'Service Team' },
      { id: 9, staffId: 13, date: '2026-06-02', shift: 'fullday', dept: 'Service Team' },
      { id: 10, staffId: 10, date: '2026-06-02', shift: 'fullday', dept: 'Service Team' },
      { id: 11, staffId: 12, date: '2026-06-03', shift: 'fullday', dept: 'Service Team' },
      { id: 12, staffId: 5, date: '2026-06-03', shift: 'fullday', dept: 'Service Team' },
      { id: 13, staffId: 7, date: '2026-06-03', shift: 'fullday', dept: 'Service Team' },
      { id: 14, staffId: 9, date: '2026-06-03', shift: 'fullday', dept: 'Service Team' },
      { id: 15, staffId: 2, date: '2026-06-03', shift: 'fullday', dept: 'Service Team' },
      { id: 16, staffId: 3, date: '2026-06-04', shift: 'fullday', dept: 'Service Team' },
      { id: 17, staffId: 9, date: '2026-06-04', shift: 'fullday', dept: 'Service Team' },
      { id: 18, staffId: 8, date: '2026-06-04', shift: 'fullday', dept: 'Service Team' },
      { id: 19, staffId: 11, date: '2026-06-04', shift: 'fullday', dept: 'Service Team' },
      { id: 20, staffId: 2, date: '2026-06-04', shift: 'fullday', dept: 'Service Team' },
      { id: 21, staffId: 7, date: '2026-06-06', shift: 'fullday', dept: 'Service Team' },
      { id: 22, staffId: 1, date: '2026-06-06', shift: 'fullday', dept: 'Service Team' },
      { id: 23, staffId: 9, date: '2026-06-06', shift: 'fullday', dept: 'Service Team' },
      { id: 24, staffId: 3, date: '2026-06-06', shift: 'fullday', dept: 'Service Team' },
      { id: 25, staffId: 12, date: '2026-06-06', shift: 'fullday', dept: 'Service Team' },
    ],

attendance: [
      { staffId: 12, date: '2026-06-01', signIn: '07:27', signOut: '09:31', hours: 2, status: 'normal' },
      { staffId: 6, date: '2026-06-01', signIn: '07:26', signOut: '09:32', hours: 2, status: 'normal' },
      { staffId: 5, date: '2026-06-01', signIn: '07:23', signOut: '09:31', hours: 2, status: 'normal' },
      { staffId: 10, date: '2026-06-01', signIn: '11:09', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 8, date: '2026-06-01', signIn: '09:31', signOut: '21:07', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-01', signIn: '06:59', signOut: '09:33', hours: 2, status: 'normal' },
      { staffId: 4, date: '2026-06-01', signIn: '11:56', signOut: '21:34', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-01', signIn: '07:24', signOut: '09:37', hours: 2, status: 'normal' },
      { staffId: 2, date: '2026-06-01', signIn: '07:24', signOut: '09:44', hours: 2, status: 'normal' },
      { staffId: 3, date: '2026-06-01', signIn: '07:23', signOut: '09:35', hours: 2, status: 'normal' },
      { staffId: 7, date: '2026-06-01', signIn: '07:25', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-01', signIn: '09:38', signOut: '18:32', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-02', signIn: '09:00', signOut: '13:00', hours: 4, status: 'normal' },
      { staffId: 6, date: '2026-06-02', signIn: '10:27', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-02', signIn: '12:08', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-02', signIn: '11:16', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 2, date: '2026-06-02', signIn: '09:58', signOut: '16:37', hours: 6, status: 'normal' },
      { staffId: 1, date: '2026-06-02', signIn: '08:55', signOut: '17:33', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-02', signIn: '12:51', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-03', signIn: '09:52', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-03', signIn: '10:24', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-03', signIn: '09:00', signOut: '17:00', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-03', signIn: '11:57', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-03', signIn: '12:56', signOut: '21:33', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-03', signIn: '11:25', signOut: '20:34', hours: 8.5, status: 'normal' },
      { staffId: 1, date: '2026-06-03', signIn: '09:00', signOut: '15:00', hours: 6, status: 'normal' },
      { staffId: 8, date: '2026-06-04', signIn: '11:16', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-04', signIn: '10:13', signOut: '19:01', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-04', signIn: '12:56', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-04', signIn: '12:13', signOut: '21:02', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-04', signIn: '09:56', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-05', signIn: '17:24', signOut: '21:16', hours: 3.5, status: 'normal' },
      { staffId: 6, date: '2026-06-05', signIn: '17:25', signOut: '21:15', hours: 3.5, status: 'normal' },
      { staffId: 8, date: '2026-06-05', signIn: '09:48', signOut: '20:01', hours: 9.5, status: 'normal' },
      { staffId: 9, date: '2026-06-05', signIn: '17:01', signOut: '21:15', hours: 3.5, status: 'normal' },
      { staffId: 3, date: '2026-06-05', signIn: '17:03', signOut: '23:04', hours: 5.5, status: 'normal' },
      { staffId: 1, date: '2026-06-05', signIn: '09:57', signOut: '20:02', hours: 9.5, status: 'normal' },
      { staffId: 13, date: '2026-06-05', signIn: '17:17', signOut: '23:05', hours: 5.5, status: 'normal' },
      { staffId: 12, date: '2026-06-06', signIn: '12:57', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-06', signIn: '12:10', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-06', signIn: '取消', signOut: '取消', hours: 0, status: 'leave', note: '排班取消' },
      { staffId: 9, date: '2026-06-06', signIn: '10:42', signOut: '20:20', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-06', signIn: '11:26', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 3, date: '2026-06-06', signIn: '12:13', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-06', signIn: '09:42', signOut: '18:32', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-07', signIn: '10:57', signOut: '19:30', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-07', signIn: '11:20', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 10, date: '2026-06-07', signIn: '12:14', signOut: '21:05', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-07', signIn: '10:19', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-07', signIn: '12:07', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-07', signIn: '12:57', signOut: '21:39', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-07', signIn: '09:57', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-08', signIn: '12:58', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-08', signIn: '10:11', signOut: '19:01', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-08', signIn: '10:00', signOut: '18:33', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-08', signIn: '11:26', signOut: '20:34', hours: 8.5, status: 'normal' },
      { staffId: 3, date: '2026-06-08', signIn: '12:14', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-09', signIn: '11:29', signOut: '20:30', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-09', signIn: '11:52', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-09', signIn: '09:47', signOut: '18:31', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-09', signIn: '19:48', signOut: '次日02:46', hours: 6, status: 'normal' },
      { staffId: 7, date: '2026-06-09', signIn: '12:58', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-09', signIn: '10:20', signOut: '19:01', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-10', signIn: '11:21', signOut: '20:34', hours: 8.5, status: 'normal' },
      { staffId: 5, date: '2026-06-10', signIn: '12:51', signOut: '21:38', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-10', signIn: '11:45', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-10', signIn: '10:45', signOut: '19:00', hours: 7.5, status: 'late', note: '考勤异常' },
      { staffId: 13, date: '2026-06-10', signIn: '09:55', signOut: '18:41', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-11', signIn: '09:57', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-11', signIn: '10:32', signOut: '19:00', hours: 7.5, status: 'late', note: '考勤异常' },
      { staffId: 4, date: '2026-06-11', signIn: '11:57', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-11', signIn: '12:54', signOut: '21:38', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-11', signIn: '11:15', signOut: '20:50', hours: 8.5, status: 'normal' },
      { staffId: 12, date: '2026-06-12', signIn: '09:58', signOut: '18:31', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-12', signIn: '11:15', signOut: '20:34', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-12', signIn: '11:43', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-12', signIn: '10:24', signOut: '19:01', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-12', signIn: '12:52', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-12', signIn: '10:42', signOut: '19:44', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-13', signIn: '12:55', signOut: '21:32', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-13', signIn: '11:00', signOut: '19:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-13', signIn: '12:10', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-13', signIn: '09:59', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-13', signIn: '11:28', signOut: '20:34', hours: 8.5, status: 'normal' },
      { staffId: 1, date: '2026-06-13', signIn: '11:54', signOut: '21:02', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-13', signIn: '09:57', signOut: '18:32', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-14', signIn: '12:12', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-14', signIn: '09:53', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-14', signIn: '11:27', signOut: '20:08', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-14', signIn: '10:51', signOut: '19:30', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-14', signIn: '10:53', signOut: '19:36', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-14', signIn: '09:53', signOut: '19:02', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-14', signIn: '11:25', signOut: '20:01', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-14', signIn: '12:53', signOut: '21:32', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-15', signIn: '10:24', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-15', signIn: '12:12', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-15', signIn: '11:19', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 11, date: '2026-06-15', signIn: '09:56', signOut: '18:32', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-15', signIn: '12:56', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-15', signIn: '11:28', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 12, date: '2026-06-16', signIn: '09:56', signOut: '18:31', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-16', signIn: '12:57', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-16', signIn: '10:19', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-16', signIn: '11:44', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-16', signIn: '11:24', signOut: '20:35', hours: 8.5, status: 'normal' },
      { staffId: 6, date: '2026-06-17', signIn: '09:55', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-17', signIn: '11:16', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 4, date: '2026-06-17', signIn: '10:17', signOut: '19:01', hours: 8, status: 'normal' },
      { staffId: 11, date: '2026-06-17', signIn: '12:06', signOut: '21:02', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-17', signIn: '12:57', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-18', signIn: '12:48', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-18', signIn: '11:27', signOut: '20:35', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-18', signIn: '11:59', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-18', signIn: '10:30', signOut: '19:06', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-18', signIn: '11:20', signOut: '18:30', hours: 6.5, status: 'late', note: '考勤异常' },
      { staffId: 7, date: '2026-06-18', signIn: '10:57', signOut: '19:00', hours: 7.5, status: 'normal' },
      { staffId: 12, date: '2026-06-19', signIn: '12:07', signOut: '21:03', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-19', signIn: '10:23', signOut: '19:06', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-19', signIn: '12:59', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-19', signIn: '11:16', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-19', signIn: '10:58', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 4, date: '2026-06-19', signIn: '12:53', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-19', signIn: '09:51', signOut: '18:31', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-19', signIn: '10:46', signOut: '19:31', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-19', signIn: '12:11', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-20', signIn: '12:52', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-20', signIn: '10:52', signOut: '19:30', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-20', signIn: '12:14', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-20', signIn: '12:09', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-20', signIn: '11:13', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 2, date: '2026-06-20', signIn: '09:56', signOut: '18:38', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-20', signIn: '10:52', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 1, date: '2026-06-20', signIn: '10:29', signOut: '19:02', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-20', signIn: '09:54', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-21', signIn: '10:25', signOut: '19:04', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-21', signIn: '11:25', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 8, date: '2026-06-21', signIn: '13:20', signOut: '22:03', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-21', signIn: '10:44', signOut: '19:47', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-21', signIn: '12:01', signOut: '21:23', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-21', signIn: '09:59', signOut: '17:30', hours: 7.5, status: 'normal' },
      { staffId: 1, date: '2026-06-21', signIn: '12:01', signOut: '17:05', hours: 4.5, status: 'normal' },
      { staffId: 13, date: '2026-06-21', signIn: '12:57', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-22', signIn: '12:13', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-22', signIn: '10:27', signOut: '17:08', hours: 6.5, status: 'normal' },
      { staffId: 4, date: '2026-06-22', signIn: '09:42', signOut: '16:35', hours: 6.5, status: 'normal' },
      { staffId: 3, date: '2026-06-22', signIn: '12:13', signOut: '20:31', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-22', signIn: '12:57', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-22', signIn: '11:28', signOut: '19:34', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-23', signIn: '11:27', signOut: '20:32', hours: 8.5, status: 'normal' },
      { staffId: 5, date: '2026-06-23', signIn: '12:00', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-23', signIn: '12:10', signOut: '21:03', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-23', signIn: '12:51', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-23', signIn: '10:28', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-23', signIn: '09:58', signOut: '18:34', hours: 8, status: 'normal' },
      { staffId: 5, date: '2026-06-24', signIn: '12:51', signOut: '21:32', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-24', signIn: '11:48', signOut: '21:05', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-24', signIn: '09:59', signOut: '18:36', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-24', signIn: '10:59', signOut: '19:31', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-24', signIn: '10:29', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-24', signIn: '11:28', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 6, date: '2026-06-25', signIn: '12:12', signOut: '21:09', hours: 8, status: 'normal' },
      { staffId: 10, date: '2026-06-25', signIn: '11:29', signOut: '20:30', hours: 8.5, status: 'normal' },
      { staffId: 8, date: '2026-06-25', signIn: '11:17', signOut: '20:30', hours: 8.5, status: 'normal' },
      { staffId: 9, date: '2026-06-25', signIn: '09:44', signOut: '17:03', hours: 7, status: 'normal' },
      { staffId: 4, date: '2026-06-25', signIn: '10:16', signOut: '17:01', hours: 6.5, status: 'normal' },
      { staffId: 2, date: '2026-06-25', signIn: '12:51', signOut: '21:33', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-25', signIn: '12:09', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-26', signIn: '09:53', signOut: '17:01', hours: 7, status: 'normal' },
      { staffId: 10, date: '2026-06-26', signIn: '12:52', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-26', signIn: '10:18', signOut: '17:02', hours: 6.5, status: 'normal' },
      { staffId: 9, date: '2026-06-26', signIn: '11:19', signOut: '20:30', hours: 8.5, status: 'normal' },
      { staffId: 7, date: '2026-06-26', signIn: '12:55', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-26', signIn: '12:10', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-27', signIn: '10:27', signOut: '18:02', hours: 7, status: 'normal' },
      { staffId: 6, date: '2026-06-27', signIn: '10:54', signOut: '19:17', hours: 7.5, status: 'normal' },
      { staffId: 5, date: '2026-06-27', signIn: '09:58', signOut: '18:02', hours: 7.5, status: 'normal' },
      { staffId: 8, date: '2026-06-27', signIn: '11:21', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 4, date: '2026-06-27', signIn: '11:46', signOut: '21:02', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-27', signIn: '12:55', signOut: '21:33', hours: 8, status: 'normal' },
      { staffId: 3, date: '2026-06-27', signIn: '11:21', signOut: '19:33', hours: 7.5, status: 'normal' },
      { staffId: 7, date: '2026-06-27', signIn: '12:14', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 1, date: '2026-06-27', signIn: '10:51', signOut: '19:14', hours: 7.5, status: 'normal' },
      { staffId: 5, date: '2026-06-28', signIn: '10:56', signOut: '18:00', hours: 7, status: 'normal' },
      { staffId: 10, date: '2026-06-28', signIn: '12:13', signOut: '21:00', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-28', signIn: '10:45', signOut: '19:31', hours: 8, status: 'normal' },
      { staffId: 4, date: '2026-06-28', signIn: '11:16', signOut: '17:30', hours: 6, status: 'normal' },
      { staffId: 2, date: '2026-06-28', signIn: '10:27', signOut: '17:33', hours: 7, status: 'normal' },
      { staffId: 3, date: '2026-06-28', signIn: '12:55', signOut: '21:31', hours: 8, status: 'normal' },
      { staffId: 7, date: '2026-06-28', signIn: '11:26', signOut: '20:30', hours: 8.5, status: 'normal' },
      { staffId: 1, date: '2026-06-28', signIn: '09:57', signOut: '17:05', hours: 7, status: 'normal' },
      { staffId: 13, date: '2026-06-28', signIn: '12:58', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 6, date: '2026-06-29', signIn: '09:56', signOut: '18:30', hours: 8, status: 'normal' },
      { staffId: 8, date: '2026-06-29', signIn: '12:51', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 9, date: '2026-06-29', signIn: '11:15', signOut: '20:31', hours: 8.5, status: 'normal' },
      { staffId: 7, date: '2026-06-29', signIn: '10:26', signOut: '19:00', hours: 8, status: 'normal' },
      { staffId: 13, date: '2026-06-29', signIn: '12:15', signOut: '21:01', hours: 8, status: 'normal' },
      { staffId: 12, date: '2026-06-30', signIn: '11:23', signOut: '19:04', hours: 7.5, status: 'normal' },
      { staffId: 6, date: '2026-06-30', signIn: '10:27', signOut: '15:00', hours: 4.5, status: 'normal' },
      { staffId: 10, date: '2026-06-30', signIn: '10:01', signOut: '15:00', hours: 4.5, status: 'late', note: '考勤异常' },
      { staffId: 4, date: '2026-06-30', signIn: '12:49', signOut: '21:30', hours: 8, status: 'normal' },
      { staffId: 2, date: '2026-06-30', signIn: '12:12', signOut: '21:21', hours: 8, status: 'normal' }
    ],

ratings: [
    {
      "id": 1,
      "staffId": 1,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 3.5,  // 时产4+UPT2 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 5
      },
      "comment": "18天出勤139.5h，销售¥34,360时产¥246.3/h，UPT 1.08，品类(鞋履 85.4% / 服装 8.5% / 配件 6.2%)，月销达标，门迎20次，大众点评好评1条",
      "avgScore": 4.9,
      "hourlyRate": 60
    },
    {
      "id": 2,
      "staffId": 2,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 2.0,  // 时产1+UPT3 动态计算
        "behavior": 5,
        "attendance": 4,
        "customerReview": 4
      },
      "comment": "17天出勤125.5h，销售¥8,944时产¥71.3/h，UPT 1.14，品类(鞋履 86.0% / 服装 8.9% / 配件 5.1%)",
      "avgScore": 4.0,
      "hourlyRate": 60
    },
    {
      "id": 3,
      "staffId": 3,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 3.5,  // 时产2+UPT5 动态计算
        "behavior": 5,
        "attendance": 4,
        "customerReview": 5
      },
      "comment": "15天出勤109.5h，销售¥15,586时产¥142.3/h，UPT 2.12，品类(鞋履 67.3% / 服装 23.0% / 配件 9.7%)，大众点评好评4条",
      "avgScore": 4.5,
      "hourlyRate": 60
    },
    {
      "id": 4,
      "staffId": 4,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.5,  // 时产4+UPT4 动态计算
        "behavior": 5,
        "attendance": 4,
        "customerReview": 4
      },
      "comment": "15天出勤115.5h，销售¥26,228时产¥227.1/h，UPT 1.47，品类(鞋履 77.7% / 服装 18.3% / 配件 4.1%)，月销达标",
      "avgScore": 4.4,
      "hourlyRate": 60
    },
    {
      "id": 5,
      "staffId": 5,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.0,  // 时产3+UPT5 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 5
      },
      "comment": "14天出勤105.5h，销售¥16,856时产¥159.8/h，UPT 1.50，品类(鞋履 60.0% / 服装 39.0% / 配件 1.1%)，大众点评好评2条",
      "avgScore": 4.6,
      "hourlyRate": 60
    },
    {
      "id": 6,
      "staffId": 6,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.5,  // 时产3+UPT5 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "18天出勤127.5h，销售¥22,959时产¥180.1/h，UPT 1.77，品类(鞋履 64.3% / 服装 35.7%)，月销达标",
      "avgScore": 4.8,
      "hourlyRate": 60
    },
    {
      "id": 7,
      "staffId": 7,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 2.5,  // 时产2+UPT3 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "17天出勤137.5h，销售¥16,005时产¥116.4/h，UPT 1.25，品类(鞋履 90.7% / 服装 8.1% / 配件 1.2%)",
      "avgScore": 4.3,
      "hourlyRate": 60
    },
    {
      "id": 8,
      "staffId": 8,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.5,  // 时产4+UPT4 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 2.5
      },
      "comment": "15天出勤123.5h，销售¥35,502时产¥287.5/h，UPT 1.32，品类(鞋履 93.0% / 服装 6.7% / 配件 0.3%)，月销达标，大众点评好评2条",
      "avgScore": 4.5,
      "hourlyRate": 60
    },
    {
      "id": 9,
      "staffId": 9,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.0,  // 时产4+UPT3 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "16天出勤118h，销售¥33,466时产¥283.6/h，UPT 1.23，品类(鞋履 86.5% / 服装 11.3% / 配件 2.1%)，月销达标",
      "avgScore": 4.6,
      "hourlyRate": 60
    },
    {
      "id": 10,
      "staffId": 10,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.5,  // 时产4+UPT4 动态计算
        "behavior": 5,
        "attendance": 4,
        "customerReview": 5
      },
      "comment": "17天出勤133.5h，销售¥32,500时产¥243.4/h，UPT 1.35，品类(鞋履 84.4% / 服装 9.2% / 配件 6.4%)，月销达标，大众点评好评1条",
      "avgScore": 4.7,
      "hourlyRate": 60
    },
    {
      "id": 11,
      "staffId": 11,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 2.0,  // 时产1+UPT3 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "8天出勤58.5h，销售¥5,450时产¥93.2/h，UPT 1.25，品类(鞋履 93.4% / 配件 6.6%)",
      "avgScore": 4.2,
      "hourlyRate": 60
    },
    {
      "id": 12,
      "staffId": 12,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.0,  // 时产3+UPT5 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "15天出勤105h，销售¥19,536时产¥186.1/h，UPT 1.77，品类(鞋履 69.4% / 服装 22.9% / 配件 7.7%)",
      "avgScore": 4.6,
      "hourlyRate": 60
    },
    {
      "id": 13,
      "staffId": 13,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4.0,  // 时产4+UPT3 动态计算
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "15天出勤118h，销售¥25,858时产¥219.1/h，UPT 1.14，品类(鞋履 83.8% / 服装 13.3% / 配件 2.9%)，月销达标",
      "avgScore": 4.6,
      "hourlyRate": 60
    }
    // ===== 7月评分条目（初始空白，随数据录入动态计算） =====
    ,
    { "id": 102, "staffId": 2, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 103, "staffId": 3, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 104, "staffId": 4, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 105, "staffId": 5, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 106, "staffId": 6, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 107, "staffId": 7, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 108, "staffId": 8, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 109, "staffId": 9, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 110, "staffId": 10, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 111, "staffId": 11, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 112, "staffId": 12, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 113, "staffId": 13, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 114, "staffId": 20, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 115, "staffId": 18, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 116, "staffId": 17, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
    { "id": 117, "staffId": 19, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 }
    ],



        // 灵工打卡考勤数据（从 scripts/fetch_linggong.js 自动拉取）
linggongAttendance: {
      lastSync: new Date().toISOString(),
      records: [
        {
                "name": "何秋烨",
                "date": "2026-06-01",
                "signIn": "07:27",
                "signOut": "09:31",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-01",
                "signIn": "07:26",
                "signOut": "09:32",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-01",
                "signIn": "07:23",
                "signOut": "09:31",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "李若彤",
                "date": "2026-06-01",
                "signIn": "07:24",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "10.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-01",
                "signIn": "07:23",
                "signOut": "21:07",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-01",
                "signIn": "11:19",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-01",
                "signIn": "06:59",
                "signOut": "09:33",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-01",
                "signIn": "07:19",
                "signOut": "21:34",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-01",
                "signIn": "07:24",
                "signOut": "09:37",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-01",
                "signIn": "07:24",
                "signOut": "09:44",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "迟骋",
                "date": "2026-06-01",
                "signIn": "07:23",
                "signOut": "09:35",
                "status": "打卡正常",
                "totalHours": "2"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-01",
                "signIn": "07:25",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "陈广权",
                "date": "2026-06-01",
                "signIn": "11:00",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-01",
                "signIn": "07:29",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-02",
                "signIn": "09:00",
                "signOut": "13:00",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-02",
                "signIn": "10:27",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-02",
                "signIn": "12:08",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-02",
                "signIn": "11:16",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-02",
                "signIn": "取消",
                "signOut": "取消",
                "status": "取消",
                "totalHours": "0"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-02",
                "signIn": "09:58",
                "signOut": "16:37",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "祖白代",
                "date": "2026-06-02",
                "signIn": "10:48",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-02",
                "signIn": "10:48",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-02",
                "signIn": "08:55",
                "signOut": "17:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-02",
                "signIn": "12:51",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-03",
                "signIn": "09:52",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-03",
                "signIn": "10:24",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-03",
                "signIn": "09:00",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-03",
                "signIn": "10:57",
                "signOut": "20:01",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-03",
                "signIn": "11:57",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-03",
                "signIn": "11:23",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-03",
                "signIn": "12:56",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-03",
                "signIn": "11:25",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-03",
                "signIn": "09:00",
                "signOut": "15:00",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-04",
                "signIn": "11:16",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-04",
                "signIn": "10:51",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-04",
                "signIn": "10:13",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-04",
                "signIn": "12:56",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-04",
                "signIn": "12:13",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-04",
                "signIn": "11:21",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-04",
                "signIn": "11:21",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-04",
                "signIn": "09:56",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-05",
                "signIn": "17:24",
                "signOut": "21:16",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-05",
                "signIn": "17:25",
                "signOut": "21:15",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-05",
                "signIn": "09:48",
                "signOut": "20:01",
                "status": "打卡正常",
                "totalHours": "9.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-05",
                "signIn": "17:01",
                "signOut": "21:15",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-05",
                "signIn": "17:03",
                "signOut": "23:04",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-05",
                "signIn": "09:57",
                "signOut": "20:02",
                "status": "打卡正常",
                "totalHours": "9.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-05",
                "signIn": "17:17",
                "signOut": "23:05",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-06",
                "signIn": "10:19",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-06",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-06",
                "signIn": "12:10",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-06",
                "signIn": "取消",
                "signOut": "取消",
                "status": "取消",
                "totalHours": "0"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-06",
                "signIn": "10:42",
                "signOut": "20:20",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-06",
                "signIn": "11:26",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-06",
                "signIn": "11:18",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-06",
                "signIn": "12:13",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-06",
                "signIn": "11:00",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-06",
                "signIn": "09:42",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-07",
                "signIn": "10:22",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-07",
                "signIn": "10:57",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-07",
                "signIn": "11:20",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李若彤",
                "date": "2026-06-07",
                "signIn": "12:14",
                "signOut": "21:05",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-07",
                "signIn": "10:19",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-07",
                "signIn": "11:16",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-07",
                "signIn": "10:42",
                "signOut": "20:02",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-07",
                "signIn": "12:07",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-07",
                "signIn": "12:57",
                "signOut": "21:39",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-07",
                "signIn": "09:57",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-08",
                "signIn": "12:58",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-08",
                "signIn": "10:11",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-08",
                "signIn": "10:00",
                "signOut": "18:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-08",
                "signIn": "12:17",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-08",
                "signIn": "11:26",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-08",
                "signIn": "12:14",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-08",
                "signIn": "10:30",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-09",
                "signIn": "11:29",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-09",
                "signIn": "11:52",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-09",
                "signIn": "09:47",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-09",
                "signIn": "19:48",
                "signOut": "次日02:46",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "祖白代",
                "date": "2026-06-09",
                "signIn": "缺卡",
                "signOut": "缺卡",
                "status": "缺勤",
                "totalHours": "0"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-09",
                "signIn": "缺卡",
                "signOut": "缺卡",
                "status": "缺勤",
                "totalHours": "0"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-09",
                "signIn": "12:18",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-09",
                "signIn": "12:58",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-09",
                "signIn": "17:00",
                "signOut": "次日02:45",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-09",
                "signIn": "10:20",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-10",
                "signIn": "11:21",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-10",
                "signIn": "12:51",
                "signOut": "21:38",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-10",
                "signIn": "11:45",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-10",
                "signIn": "10:45",
                "signOut": "19:00",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "祖白代",
                "date": "2026-06-10",
                "signIn": "12:19",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-10",
                "signIn": "12:19",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-10",
                "signIn": "10:15",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-10",
                "signIn": "09:55",
                "signOut": "18:41",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-11",
                "signIn": "09:57",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-11",
                "signIn": "10:32",
                "signOut": "19:00",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-11",
                "signIn": "10:17",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-11",
                "signIn": "11:57",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-11",
                "signIn": "12:54",
                "signOut": "21:38",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-11",
                "signIn": "12:12",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-11",
                "signIn": "11:15",
                "signOut": "20:50",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-12",
                "signIn": "09:58",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-12",
                "signIn": "11:15",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-12",
                "signIn": "12:19",
                "signOut": "21:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-12",
                "signIn": "11:43",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-12",
                "signIn": "10:24",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-12",
                "signIn": "10:20",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-12",
                "signIn": "12:52",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-12",
                "signIn": "10:42",
                "signOut": "19:44",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-13",
                "signIn": "10:28",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-13",
                "signIn": "12:55",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-13",
                "signIn": "11:00",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-13",
                "signIn": "12:10",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-13",
                "signIn": "11:14",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-13",
                "signIn": "09:59",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-13",
                "signIn": "11:28",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈广权",
                "date": "2026-06-13",
                "signIn": "11:00",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-13",
                "signIn": "11:54",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-13",
                "signIn": "09:57",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-14",
                "signIn": "取消",
                "signOut": "取消",
                "status": "取消",
                "totalHours": "0"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-14",
                "signIn": "12:12",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-14",
                "signIn": "09:53",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-14",
                "signIn": "11:27",
                "signOut": "20:08",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-14",
                "signIn": "11:11",
                "signOut": "20:05",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-14",
                "signIn": "10:51",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-14",
                "signIn": "10:53",
                "signOut": "19:36",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-14",
                "signIn": "10:48",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-14",
                "signIn": "10:48",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-14",
                "signIn": "09:53",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-14",
                "signIn": "11:25",
                "signOut": "20:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-14",
                "signIn": "12:53",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-15",
                "signIn": "10:24",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-15",
                "signIn": "12:12",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-15",
                "signIn": "11:19",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-15",
                "signIn": "12:14",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-15",
                "signIn": "09:56",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-06-15",
                "signIn": "12:56",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-15",
                "signIn": "11:28",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈广权",
                "date": "2026-06-15",
                "signIn": "10:30",
                "signOut": "18:00",
                "status": "打卡异常",
                "totalHours": "7"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-16",
                "signIn": "09:56",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-16",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-16",
                "signIn": "10:32",
                "signOut": "19:01",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-16",
                "signIn": "10:32",
                "signOut": "19:01",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-16",
                "signIn": "10:19",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-16",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-16",
                "signIn": "11:44",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-16",
                "signIn": "11:24",
                "signOut": "20:35",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-17",
                "signIn": "09:55",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-17",
                "signIn": "11:16",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-17",
                "signIn": "12:16",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-17",
                "signIn": "10:17",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-06-17",
                "signIn": "12:06",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-17",
                "signIn": "10:57",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-17",
                "signIn": "12:57",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-17",
                "signIn": "10:17",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-18",
                "signIn": "12:48",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-18",
                "signIn": "11:27",
                "signOut": "20:35",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-18",
                "signIn": "11:59",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-18",
                "signIn": "10:07",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-18",
                "signIn": "10:30",
                "signOut": "19:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-18",
                "signIn": "12:14",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-06-18",
                "signIn": "11:20",
                "signOut": "18:30",
                "status": "打卡异常",
                "totalHours": "6.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-18",
                "signIn": "10:57",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-19",
                "signIn": "10:22",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-19",
                "signIn": "12:07",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-19",
                "signIn": "10:23",
                "signOut": "19:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-19",
                "signIn": "12:59",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-19",
                "signIn": "11:16",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-19",
                "signIn": "10:23",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-19",
                "signIn": "10:58",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-19",
                "signIn": "12:53",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-19",
                "signIn": "12:09",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-19",
                "signIn": "09:51",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-19",
                "signIn": "11:00",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-19",
                "signIn": "10:46",
                "signOut": "19:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-19",
                "signIn": "12:11",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-20",
                "signIn": "10:27",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-20",
                "signIn": "12:52",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-20",
                "signIn": "10:52",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-20",
                "signIn": "12:14",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-20",
                "signIn": "12:09",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-20",
                "signIn": "12:09",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-20",
                "signIn": "11:13",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-20",
                "signIn": "09:56",
                "signOut": "18:38",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-20",
                "signIn": "10:45",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-20",
                "signIn": "10:52",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-20",
                "signIn": "10:29",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-20",
                "signIn": "09:54",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-21",
                "signIn": "10:25",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-21",
                "signIn": "11:25",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-21",
                "signIn": "13:20",
                "signOut": "22:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-21",
                "signIn": "10:44",
                "signOut": "19:47",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-21",
                "signIn": "12:01",
                "signOut": "21:23",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-21",
                "signIn": "10:26",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-21",
                "signIn": "12:12",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-21",
                "signIn": "12:12",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-06-21",
                "signIn": "09:59",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "陈广权",
                "date": "2026-06-21",
                "signIn": "11:00",
                "signOut": "20:03",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-21",
                "signIn": "12:01",
                "signOut": "17:05",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-21",
                "signIn": "12:57",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-22",
                "signIn": "12:13",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-22",
                "signIn": "10:27",
                "signOut": "17:08",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-22",
                "signIn": "09:42",
                "signOut": "16:35",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "祖白代",
                "date": "2026-06-22",
                "signIn": "11:52",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-22",
                "signIn": "11:52",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-22",
                "signIn": "10:08",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "迟骋",
                "date": "2026-06-22",
                "signIn": "12:13",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-22",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-22",
                "signIn": "11:28",
                "signOut": "19:34",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-23",
                "signIn": "11:27",
                "signOut": "20:32",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-23",
                "signIn": "12:00",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-23",
                "signIn": "12:10",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-23",
                "signIn": "12:51",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-23",
                "signIn": "10:28",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-23",
                "signIn": "12:21",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-23",
                "signIn": "10:30",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-23",
                "signIn": "09:58",
                "signOut": "18:34",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-24",
                "signIn": "12:51",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-24",
                "signIn": "11:48",
                "signOut": "21:05",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-24",
                "signIn": "10:28",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-24",
                "signIn": "09:59",
                "signOut": "18:36",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-06-24",
                "signIn": "10:59",
                "signOut": "19:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-24",
                "signIn": "10:29",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-24",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-24",
                "signIn": "11:28",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-25",
                "signIn": "12:12",
                "signOut": "21:09",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-06-25",
                "signIn": "11:29",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-25",
                "signIn": "11:17",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-25",
                "signIn": "09:44",
                "signOut": "17:03",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-25",
                "signIn": "10:16",
                "signOut": "17:01",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-25",
                "signIn": "12:12",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-25",
                "signIn": "12:51",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-25",
                "signIn": "10:11",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-25",
                "signIn": "10:11",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-25",
                "signIn": "12:09",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-26",
                "signIn": "09:53",
                "signOut": "17:01",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "李若彤",
                "date": "2026-06-26",
                "signIn": "12:52",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-26",
                "signIn": "10:18",
                "signOut": "17:02",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-26",
                "signIn": "10:20",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-26",
                "signIn": "11:19",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-26",
                "signIn": "12:47",
                "signOut": "22:17",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-26",
                "signIn": "12:55",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-26",
                "signIn": "11:16",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-26",
                "signIn": "12:10",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-27",
                "signIn": "10:27",
                "signOut": "18:02",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-27",
                "signIn": "10:54",
                "signOut": "19:17",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-27",
                "signIn": "09:58",
                "signOut": "18:02",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-27",
                "signIn": "11:21",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-27",
                "signIn": "12:52",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-27",
                "signIn": "11:46",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-27",
                "signIn": "12:55",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-27",
                "signIn": "11:21",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-06-27",
                "signIn": "11:21",
                "signOut": "19:33",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-27",
                "signIn": "12:14",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-27",
                "signIn": "10:30",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-27",
                "signIn": "10:51",
                "signOut": "19:14",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "严佳铮",
                "date": "2026-06-28",
                "signIn": "10:23",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "朱凯赟",
                "date": "2026-06-28",
                "signIn": "10:56",
                "signOut": "18:00",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "李若彤",
                "date": "2026-06-28",
                "signIn": "12:13",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-28",
                "signIn": "11:22",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-28",
                "signIn": "10:45",
                "signOut": "19:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-28",
                "signIn": "11:16",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-28",
                "signIn": "10:27",
                "signOut": "17:33",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "迟骋",
                "date": "2026-06-28",
                "signIn": "12:55",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-28",
                "signIn": "11:26",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "陈广权",
                "date": "2026-06-28",
                "signIn": "16:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-06-28",
                "signIn": "09:57",
                "signOut": "17:05",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-28",
                "signIn": "12:58",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-29",
                "signIn": "09:56",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-06-29",
                "signIn": "12:51",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-06-29",
                "signIn": "11:15",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-29",
                "signIn": "10:26",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-06-29",
                "signIn": "12:19",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-06-29",
                "signIn": "12:19",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-06-29",
                "signIn": "10:19",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-06-29",
                "signIn": "10:26",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-06-29",
                "signIn": "12:15",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-06-30",
                "signIn": "11:23",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-06-30",
                "signIn": "10:27",
                "signOut": "15:00",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "李若彤",
                "date": "2026-06-30",
                "signIn": "10:01",
                "signOut": "15:00",
                "status": "打卡异常",
                "totalHours": "4.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-06-30",
                "signIn": "12:24",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-06-30",
                "signIn": "12:49",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-06-30",
                "signIn": "12:11",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-06-30",
                "signIn": "12:12",
                "signOut": "21:21",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-06-30",
                "signIn": "10:30",
                "signOut": "15:00",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-01",
                "signIn": "09:00",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-01",
                "signIn": "11:25",
                "signOut": "20:50",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李若彤",
                "date": "2026-07-01",
                "signIn": "12:13",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-01",
                "signIn": "09:48",
                "signOut": "16:30",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-01",
                "signIn": "12:26",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-01",
                "signIn": "10:17",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "迟骋",
                "date": "2026-07-01",
                "signIn": "12:56",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-01",
                "signIn": "10:20",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-02",
                "signIn": "09:57",
                "signOut": "15:30",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-02",
                "signIn": "10:19",
                "signOut": "18:19",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-02",
                "signIn": "11:25",
                "signOut": "20:48",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-02",
                "signIn": "09:00",
                "signOut": "13:00",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-02",
                "signIn": "11:54",
                "signOut": "21:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-02",
                "signIn": "10:23",
                "signOut": "18:07",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-02",
                "signIn": "12:57",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-02",
                "signIn": "10:20",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-02",
                "signIn": "10:20",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-02",
                "signIn": "16:50",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-02",
                "signIn": "10:19",
                "signOut": "15:32",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "陈昕媛",
                "date": "2026-07-02",
                "signIn": "09:00",
                "signOut": "15:00",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-03",
                "signIn": "07:59",
                "signOut": "09:39",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-03",
                "signIn": "07:56",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "104.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-03",
                "signIn": "07:36",
                "signOut": "09:31",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-03",
                "signIn": "07:55",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "99"
        },
        {
                "name": "李若彤",
                "date": "2026-07-03",
                "signIn": "07:51",
                "signOut": "09:38",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-03",
                "signIn": "07:48",
                "signOut": "21:33",
                "status": "打卡正常",
                "totalHours": "121"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-03",
                "signIn": "07:48",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "104.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-03",
                "signIn": "07:35",
                "signOut": "09:39",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-03",
                "signIn": "07:45",
                "signOut": "16:17",
                "status": "打卡正常",
                "totalHours": "82.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-03",
                "signIn": "07:52",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "19"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-03",
                "signIn": "缺卡",
                "signOut": "缺卡",
                "status": "缺勤",
                "totalHours": "0"
        },
        {
                "name": "祖白代",
                "date": "2026-07-03",
                "signIn": "07:47",
                "signOut": "09:39",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-03",
                "signIn": "07:47",
                "signOut": "09:39",
                "status": "打卡正常",
                "totalHours": "1.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-03",
                "signIn": "13:28",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-03",
                "signIn": "13:00",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-03",
                "signIn": "07:47",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "82.5"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-04",
                "signIn": "10:20",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-04",
                "signIn": "13:27",
                "signOut": "22:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-04",
                "signIn": "12:11",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-04",
                "signIn": "12:00",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-04",
                "signIn": "12:19",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-04",
                "signIn": "12:01",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-04",
                "signIn": "11:18",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-04",
                "signIn": "09:53",
                "signOut": "18:35",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-04",
                "signIn": "10:42",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-04",
                "signIn": "10:42",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-07-04",
                "signIn": "10:20",
                "signOut": "19:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-04",
                "signIn": "09:30",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-04",
                "signIn": "09:58",
                "signOut": "18:55",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-05",
                "signIn": "10:23",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-05",
                "signIn": "10:28",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-05",
                "signIn": "12:12",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-05",
                "signIn": "09:53",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-05",
                "signIn": "13:19",
                "signOut": "19:21",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-05",
                "signIn": "10:41",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-05",
                "signIn": "13:00",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-05",
                "signIn": "12:22",
                "signOut": "19:21",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "迟骋",
                "date": "2026-07-05",
                "signIn": "11:23",
                "signOut": "19:21",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-05",
                "signIn": "12:09",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-05",
                "signIn": "11:00",
                "signOut": "13:00",
                "status": "打卡异常",
                "totalHours": "2"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-05",
                "signIn": "12:09",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-06",
                "signIn": "12:14",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-06",
                "signIn": "11:28",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-06",
                "signIn": "11:26",
                "signOut": "20:33",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-06",
                "signIn": "10:21",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-06",
                "signIn": "09:41",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-06",
                "signIn": "12:50",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-06",
                "signIn": "10:27",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-06",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-07",
                "signIn": "09:55",
                "signOut": "15:01",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-07",
                "signIn": "12:53",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "李若彤",
                "date": "2026-07-07",
                "signIn": "10:30",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-07",
                "signIn": "12:02",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-07",
                "signIn": "11:14",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代",
                "date": "2026-07-07",
                "signIn": "10:19",
                "signOut": "19:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-07",
                "signIn": "10:19",
                "signOut": "19:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-07",
                "signIn": "12:18",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-07",
                "signIn": "11:22",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-08",
                "signIn": "09:57",
                "signOut": "16:01",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-08",
                "signIn": "09:58",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-08",
                "signIn": "12:22",
                "signOut": "21:15",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-08",
                "signIn": "11:10",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-08",
                "signIn": "12:47",
                "signOut": "21:42",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-08",
                "signIn": "12:10",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-08",
                "signIn": "10:26",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-08",
                "signIn": "10:30",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-09",
                "signIn": "10:26",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-09",
                "signIn": "12:13",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-09",
                "signIn": "10:28",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-07-09",
                "signIn": "10:59",
                "signOut": "17:05",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-09",
                "signIn": "11:17",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-09",
                "signIn": "10:14",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-09",
                "signIn": "09:53",
                "signOut": "17:34",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-09",
                "signIn": "10:28",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-09",
                "signIn": "12:01",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-09",
                "signIn": "12:01",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-09",
                "signIn": "13:24",
                "signOut": "21:31",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-09",
                "signIn": "09:57",
                "signOut": "16:13",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-10",
                "signIn": "11:23",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-10",
                "signIn": "09:42",
                "signOut": "16:19",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-10",
                "signIn": "10:10",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-10",
                "signIn": "12:11",
                "signOut": "21:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-10",
                "signIn": "10:17",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-10",
                "signIn": "10:17",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-10",
                "signIn": "12:58",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-10",
                "signIn": "14:00",
                "signOut": "21:30",
                "status": "打卡异常",
                "totalHours": "7"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-10",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-11",
                "signIn": "10:02",
                "signOut": "13:08",
                "status": "打卡正常",
                "totalHours": "2.5"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-11",
                "signIn": "10:20",
                "signOut": "14:30",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-11",
                "signIn": "12:55",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-11",
                "signIn": "12:53",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-11",
                "signIn": "12:08",
                "signOut": "19:15",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "李健华",
                "date": "2026-07-11",
                "signIn": "10:59",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李若彤",
                "date": "2026-07-11",
                "signIn": "12:10",
                "signOut": "19:16",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-11",
                "signIn": "13:15",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-11",
                "signIn": "12:21",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-11",
                "signIn": "09:44",
                "signOut": "14:00",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-11",
                "signIn": "10:40",
                "signOut": "15:00",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "迟骋",
                "date": "2026-07-11",
                "signIn": "11:28",
                "signOut": "18:00",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-12",
                "signIn": "10:24",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-12",
                "signIn": "11:20",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-12",
                "signIn": "11:23",
                "signOut": "20:33",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李若彤",
                "date": "2026-07-12",
                "signIn": "09:56",
                "signOut": "15:30",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-12",
                "signIn": "10:51",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-12",
                "signIn": "13:16",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-12",
                "signIn": "12:54",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-12",
                "signIn": "10:14",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-12",
                "signIn": "11:26",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-12",
                "signIn": "12:22",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-12",
                "signIn": "12:14",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-12",
                "signIn": "10:25",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-13",
                "signIn": "10:26",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-13",
                "signIn": "12:11",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-13",
                "signIn": "09:50",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-13",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-13",
                "signIn": "12:23",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "121"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-13",
                "signIn": "12:40",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-13",
                "signIn": "11:13",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "祖白代",
                "date": "2026-07-13",
                "signIn": "10:20",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-13",
                "signIn": "10:20",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-14",
                "signIn": "10:33",
                "signOut": "19:01",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "李若彤",
                "date": "2026-07-14",
                "signIn": "11:27",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-14",
                "signIn": "09:42",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-14",
                "signIn": "12:32",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-14",
                "signIn": "10:29",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-14",
                "signIn": "12:18",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代·阿不利孜",
                "date": "2026-07-14",
                "signIn": "12:18",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-14",
                "signIn": "10:27",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-14",
                "signIn": "12:53",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-14",
                "signIn": "12:12",
                "signOut": "21:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-15",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-15",
                "signIn": "12:28",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-15",
                "signIn": "11:21",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-15",
                "signIn": "09:56",
                "signOut": "15:35",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-15",
                "signIn": "12:07",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-15",
                "signIn": "12:52",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-15",
                "signIn": "10:11",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "陈广权",
                "date": "2026-07-15",
                "signIn": "10:30",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-15",
                "signIn": "10:25",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-16",
                "signIn": "缺卡",
                "signOut": "缺卡",
                "status": "缺勤",
                "totalHours": "0"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-16",
                "signIn": "11:27",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李若彤",
                "date": "2026-07-16",
                "signIn": "09:58",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-16",
                "signIn": "12:05",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-16",
                "signIn": "10:13",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-16",
                "signIn": "12:42",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-16",
                "signIn": "12:09",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-16",
                "signIn": "10:28",
                "signOut": "16:30",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-17",
                "signIn": "11:20",
                "signOut": "20:34",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-17",
                "signIn": "12:57",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-17",
                "signIn": "12:09",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-17",
                "signIn": "10:29",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-07-17",
                "signIn": "13:29",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-17",
                "signIn": "10:13",
                "signOut": "14:05",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-17",
                "signIn": "09:46",
                "signOut": "18:34",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-17",
                "signIn": "13:00",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-18",
                "signIn": "10:23",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-18",
                "signIn": "12:54",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-18",
                "signIn": "10:55",
                "signOut": "20:02",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-18",
                "signIn": "09:57",
                "signOut": "17:32",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "李若彤",
                "date": "2026-07-18",
                "signIn": "11:26",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-18",
                "signIn": "10:27",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-18",
                "signIn": "11:57",
                "signOut": "21:18",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-18",
                "signIn": "13:19",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-18",
                "signIn": "12:08",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-18",
                "signIn": "12:20",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-18",
                "signIn": "10:58",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-18",
                "signIn": "10:27",
                "signOut": "17:30",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-19",
                "signIn": "10:28",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "吴丹",
                "date": "2026-07-19",
                "signIn": "缺卡",
                "signOut": "",
                "status": "打卡进行中",
                "totalHours": "0"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-19",
                "signIn": "11:28",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-19",
                "signIn": "10:22",
                "signOut": "17:01",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "李健华",
                "date": "2026-07-19",
                "signIn": "12:30",
                "signOut": "21:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-07-19",
                "signIn": "10:58",
                "signOut": "19:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-19",
                "signIn": "12:02",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-19",
                "signIn": "12:39",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-19",
                "signIn": "12:06",
                "signOut": "18:51",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-19",
                "signIn": "13:17",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-19",
                "signIn": "12:16",
                "signOut": "21:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-19",
                "signIn": "09:55",
                "signOut": "16:30",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "陈广权",
                "date": "2026-07-19",
                "signIn": "11:00",
                "signOut": "20:00",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-20",
                "signIn": "12:55",
                "signOut": "17:33",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-20",
                "signIn": "10:17",
                "signOut": "19:08",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-20",
                "signIn": "09:56",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-07-20",
                "signIn": "10:29",
                "signOut": "19:06",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-20",
                "signIn": "12:52",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "4"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-20",
                "signIn": "11:44",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-20",
                "signIn": "11:23",
                "signOut": "20:37",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-20",
                "signIn": "12:03",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-20",
                "signIn": "12:50",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-20",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-20",
                "signIn": "12:10",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-21",
                "signIn": "11:28",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-21",
                "signIn": "12:13",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-21",
                "signIn": "12:29",
                "signOut": "21:08",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-21",
                "signIn": "10:16",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-21",
                "signIn": "09:53",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-21",
                "signIn": "12:52",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-21",
                "signIn": "10:29",
                "signOut": "18:21",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-22",
                "signIn": "12:56",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-22",
                "signIn": "11:20",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-22",
                "signIn": "11:15",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-22",
                "signIn": "11:58",
                "signOut": "21:03",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-22",
                "signIn": "09:46",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-22",
                "signIn": "10:17",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-22",
                "signIn": "10:23",
                "signOut": "19:05",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "陈广权",
                "date": "2026-07-22",
                "signIn": "12:30",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-23",
                "signIn": "12:10",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-23",
                "signIn": "10:18",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-23",
                "signIn": "12:30",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-23",
                "signIn": "12:51",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-23",
                "signIn": "11:15",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-23",
                "signIn": "10:24",
                "signOut": "17:33",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-23",
                "signIn": "10:47",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "4.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-23",
                "signIn": "09:58",
                "signOut": "17:32",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-23",
                "signIn": "12:50",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何思嘉",
                "date": "2026-07-24",
                "signIn": "10:22",
                "signOut": "19:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-24",
                "signIn": "10:24",
                "signOut": "19:07",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-24",
                "signIn": "10:59",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-24",
                "signIn": "09:55",
                "signOut": "16:30",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "李若彤",
                "date": "2026-07-24",
                "signIn": "10:54",
                "signOut": "19:10",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-24",
                "signIn": "12:00",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-24",
                "signIn": "12:07",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-24",
                "signIn": "13:24",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-24",
                "signIn": "12:33",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-24",
                "signIn": "13:20",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-24",
                "signIn": "11:22",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "何思嘉",
                "date": "2026-07-25",
                "signIn": "12:23",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-25",
                "signIn": "12:10",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-25",
                "signIn": "12:53",
                "signOut": "21:36",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-25",
                "signIn": "09:56",
                "signOut": "16:01",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-25",
                "signIn": "13:15",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-25",
                "signIn": "09:52",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "李健华",
                "date": "2026-07-25",
                "signIn": "10:26",
                "signOut": "18:31",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-25",
                "signIn": "10:24",
                "signOut": "16:02",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-25",
                "signIn": "11:25",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "祖白代",
                "date": "2026-07-25",
                "signIn": "11:18",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-25",
                "signIn": "12:45",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-25",
                "signIn": "10:49",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "7"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-25",
                "signIn": "12:07",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-25",
                "signIn": "09:04",
                "signOut": "18:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "严佳铮",
                "date": "2026-07-26",
                "signIn": "10:26",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "10"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-26",
                "signIn": "13:24",
                "signOut": "22:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-26",
                "signIn": "12:11",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-26",
                "signIn": "12:26",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李若彤",
                "date": "2026-07-26",
                "signIn": "11:18",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-26",
                "signIn": "09:52",
                "signOut": "16:01",
                "status": "打卡正常",
                "totalHours": "5.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-26",
                "signIn": "10:15",
                "signOut": "16:00",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-26",
                "signIn": "10:12",
                "signOut": "16:01",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-26",
                "signIn": "11:58",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-26",
                "signIn": "10:53",
                "signOut": "19:34",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-26",
                "signIn": "11:58",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-26",
                "signIn": "11:19",
                "signOut": "17:01",
                "status": "打卡正常",
                "totalHours": "5"
        },
        {
                "name": "迟骋",
                "date": "2026-07-26",
                "signIn": "12:55",
                "signOut": "21:32",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何思嘉",
                "date": "2026-07-27",
                "signIn": "12:26",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-27",
                "signIn": "10:24",
                "signOut": "19:04",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-27",
                "signIn": "取消",
                "signOut": "取消",
                "status": "取消",
                "totalHours": "0"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-27",
                "signIn": "11:21",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李健华",
                "date": "2026-07-27",
                "signIn": "12:32",
                "signOut": "21:01",
                "status": "打卡异常",
                "totalHours": "7.5"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-27",
                "signIn": "09:49",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-27",
                "signIn": "09:46",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-27",
                "signIn": "12:52",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-27",
                "signIn": "12:00",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何秋烨",
                "date": "2026-07-28",
                "signIn": "09:53",
                "signOut": "18:31",
                "status": "打卡正常",
                "totalHours": "7.5"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-28",
                "signIn": "10:23",
                "signOut": "19:07",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-28",
                "signIn": "11:16",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-28",
                "signIn": "12:52",
                "signOut": "16:35",
                "status": "打卡正常",
                "totalHours": "3.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-28",
                "signIn": "09:51",
                "signOut": "18:42",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-28",
                "signIn": "12:03",
                "signOut": "21:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-28",
                "signIn": "12:50",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-28",
                "signIn": "10:16",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-28",
                "signIn": "12:19",
                "signOut": "21:05",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "吴嘉莹",
                "date": "2026-07-29",
                "signIn": "12:24",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-29",
                "signIn": "12:56",
                "signOut": "21:41",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-29",
                "signIn": "10:27",
                "signOut": "19:44",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "李健华",
                "date": "2026-07-29",
                "signIn": "10:25",
                "signOut": "19:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-29",
                "signIn": "11:51",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-29",
                "signIn": "09:48",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "祖白代",
                "date": "2026-07-29",
                "signIn": "11:24",
                "signOut": "20:31",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "贾长乐",
                "date": "2026-07-29",
                "signIn": "11:16",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "迟骋",
                "date": "2026-07-29",
                "signIn": "11:30",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "唐蓉",
                "date": "2026-07-30",
                "signIn": "10:26",
                "signOut": "19:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-30",
                "signIn": "09:48",
                "signOut": "18:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王龙宇",
                "date": "2026-07-30",
                "signIn": "10:21",
                "signOut": "19:07",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "玛依拉",
                "date": "2026-07-30",
                "signIn": "12:10",
                "signOut": "21:02",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "迟骋",
                "date": "2026-07-30",
                "signIn": "12:54",
                "signOut": "21:31",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "邓奇缘",
                "date": "2026-07-30",
                "signIn": "11:21",
                "signOut": "20:33",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "龚赟昊",
                "date": "2026-07-30",
                "signIn": "10:23",
                "signOut": "19:09",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "何思嘉",
                "date": "2026-07-31",
                "signIn": "10:22",
                "signOut": "19:01",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "孔祥宇",
                "date": "2026-07-31",
                "signIn": "12:46",
                "signOut": "21:30",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "朱凯赟",
                "date": "2026-07-31",
                "signIn": "11:19",
                "signOut": "20:30",
                "status": "打卡正常",
                "totalHours": "8.5"
        },
        {
                "name": "李健华",
                "date": "2026-07-31",
                "signIn": "12:50",
                "signOut": "21:34",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "杨子豪",
                "date": "2026-07-31",
                "signIn": "09:47",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "6.5"
        },
        {
                "name": "梁实秋",
                "date": "2026-07-31",
                "signIn": "10:38",
                "signOut": "19:33",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "王雅澜",
                "date": "2026-07-31",
                "signIn": "10:08",
                "signOut": "17:00",
                "status": "打卡正常",
                "totalHours": "6"
        },
        {
                "name": "王靳毓",
                "date": "2026-07-31",
                "signIn": "12:02",
                "signOut": "21:00",
                "status": "打卡正常",
                "totalHours": "8"
        },
        {
                "name": "田佳乐",
                "date": "2026-07-31",
                "signIn": "13:18",
                "signOut": "22:00",
                "status": "打卡正常",
                "totalHours": "8"
        }
        ]
    },

            performanceData: {
      april: { month: '2026-04', totalSales: 407876, avgHourlyOutput: 285.0,
        records: [
          { name: '田佳乐', sales: 58772, salesShare: 0.1441, workHours: 0, hourlyOutput: 0 },
          { name: '迟骋', sales: 45330, salesShare: 0.1111, workHours: 0, hourlyOutput: 0 },
          { name: '王靳毓', sales: 44876, salesShare: 0.1100, workHours: 0, hourlyOutput: 0 },
          { name: '孔祥宇', sales: 42846, salesShare: 0.1050, workHours: 0, hourlyOutput: 0 },
          { name: '杨子豪', sales: 38892, salesShare: 0.0954, workHours: 0, hourlyOutput: 0 },
          { name: '李若彤', sales: 32582, salesShare: 0.0799, workHours: 0, hourlyOutput: 0 },
          { name: '王龙宇', sales: 29346, salesShare: 0.0719, workHours: 0, hourlyOutput: 0 },
          { name: '何秋烨', sales: 26576, salesShare: 0.0652, workHours: 0, hourlyOutput: 0 },
          { name: '龚赟昊', sales: 26200, salesShare: 0.0642, workHours: 0, hourlyOutput: 0 },
        ]
      },
      may: {
        month: '2026-05', totalSales: 447042, avgUPT: 1.25,
        note: '5月退货追溯：李若彤-1298(7/3全退,鞋履)',
        records: [
          { name: '李若彤', sales: 60550, qty: 40, tickets: 31, upt: 1.29, avgPrice: 1514, workHours: 0, hourlyOutput: 0, salesShare: 0.135, categories: '鞋履 96.0% / 服装 3.4% / 配件 0.6%' },
          { name: '何秋烨', sales: 58358, qty: 47, tickets: 31, upt: 1.52, avgPrice: 1242, workHours: 0, hourlyOutput: 0, salesShare: 0.13, categories: '鞋履 75.4% / 服装 23.1% / 配件 1.5%' },
          { name: '邓奇缘', sales: 39526, qty: 33, tickets: 21, upt: 1.57, avgPrice: 1198, workHours: 0, hourlyOutput: 0, salesShare: 0.088, categories: '鞋履 75.9% / 服装 21.8% / 配件 2.3%' },
          { name: '杨子豪', sales: 38000, qty: 30, tickets: 24, upt: 1.25, avgPrice: 1267, workHours: 0, hourlyOutput: 0, salesShare: 0.085, categories: '鞋履 77.8% / 服装 21.3% / 配件 0.9%' },
          { name: '龚赟昊', sales: 34856, qty: 32, tickets: 25, upt: 1.28, avgPrice: 1089, workHours: 0, hourlyOutput: 0, salesShare: 0.078, categories: '鞋履 67.3% / 服装 28.1% / 配件 4.6%' },
          { name: '朱凯赟', sales: 32860, qty: 30, tickets: 27, upt: 1.11, avgPrice: 1095, workHours: 0, hourlyOutput: 0, salesShare: 0.073, categories: '鞋履 83.6% / 服装 11.8% / 配件 4.6%' },
          { name: '田佳乐', sales: 29978, qty: 22, tickets: 18, upt: 1.22, avgPrice: 1363, workHours: 0, hourlyOutput: 0, salesShare: 0.067, categories: '鞋履 79.8% / 服装 18.0% / 配件 2.2%' },
          { name: '王龙宇', sales: 25258, qty: 21, tickets: 18, upt: 1.17, avgPrice: 1203, workHours: 0, hourlyOutput: 0, salesShare: 0.056, categories: '鞋履 93.3% / 服装 6.7%' },
          { name: '迟骋', sales: 19868, qty: 16, tickets: 14, upt: 1.14, avgPrice: 1242, workHours: 0, hourlyOutput: 0, salesShare: 0.044, categories: '鞋履 96.0% / 服装 4.0%' },
          { name: '王雅澜', sales: 16648, qty: 12, tickets: 12, upt: 1.0, avgPrice: 1387, workHours: 0, hourlyOutput: 0, salesShare: 0.037, categories: '鞋履 97.8% / 配件 2.2%' },
          { name: '孔祥宇', sales: 13476, qty: 12, tickets: 9, upt: 1.33, avgPrice: 1123, workHours: 0, hourlyOutput: 0, salesShare: 0.03, categories: '鞋履 76.3% / 服装 17.0% / 配件 6.7%' },
          { name: '夏思源', sales: 9100, qty: 10, tickets: 7, upt: 1.43, avgPrice: 910, workHours: 0, hourlyOutput: 0, salesShare: 0.02, categories: '鞋履 29.6% / 服装 64.7% / 配件 5.6%' },
          { name: '王靳毓', sales: 7888, qty: 6, tickets: 5, upt: 1.2, avgPrice: 1315, workHours: 0, hourlyOutput: 0, salesShare: 0.018, categories: '鞋履 70.9% / 服装 29.1%' },
          { name: '李若彤', sales: 0, qty: 0, tickets: 0, upt: 0, avgPrice: 0, workHours: 0, hourlyOutput: 0, salesShare: 0, categories: '-' },
          { name: '唐蓉', sales: 0, qty: 0, tickets: 0, upt: 0, avgPrice: 0, workHours: 0, hourlyOutput: 0, salesShare: 0, categories: '-' },
          { name: '玛依拉', sales: 0, qty: 0, tickets: 0, upt: 0, avgPrice: 0, workHours: 0, hourlyOutput: 0, salesShare: 0, categories: '-' },
        ]
      },
      june: {
        month: '2026-06', totalSales: 294854, avgUPT: 1.41,
        note: '6月退货追溯：李若彤-1398(7/3全退,鞋履)',
        records: [
      {
            "name": "杨子豪",
            "sales": 35502,
            "qty": 29,
            "tickets": 22,
            "upt": 1.32,
            "avgPrice": 1224,
            "workHours": 125.5,
            "hourlyOutput": 282.9,
            "salesShare": 0.12,
            "categories": "鞋履 93.0% / 服装 6.7% / 配件 0.3%"
      },
      {
            "name": "李若彤",
            "sales": 32300,
            "qty": 30,
            "tickets": 22,
            "upt": 1.36,
            "avgPrice": 1077,
            "workHours": 135.5,
            "hourlyOutput": 238.4,
            "salesShare": 0.110,
            "categories": "鞋履 84.4% / 服装 9.2% / 配件 6.4%"
      },
      {
            "name": "王雅澜",
            "sales": 33466,
            "qty": 27,
            "tickets": 22,
            "upt": 1.23,
            "avgPrice": 1239,
            "workHours": 118,
            "hourlyOutput": 283.6,
            "salesShare": 0.113,
            "categories": "鞋履 86.5% / 服装 11.3% / 配件 2.1%"
      },
      {
            "name": "王靳毓",
            "sales": 26228,
            "qty": 22,
            "tickets": 15,
            "upt": 1.47,
            "avgPrice": 1192,
            "workHours": 117.5,
            "hourlyOutput": 223.2,
            "salesShare": 0.089,
            "categories": "鞋履 77.7% / 服装 18.3% / 配件 4.1%"
      },
      {
            "name": "龚赟昊",
            "sales": 25858,
            "qty": 23,
            "tickets": 21,
            "upt": 1.1,
            "avgPrice": 1124,
            "workHours": 118,
            "hourlyOutput": 219.1,
            "salesShare": 0.087,
            "categories": "鞋履 83.8% / 服装 13.3% / 配件 2.9%"
      },
      {
            "name": "孔祥宇",
            "sales": 22959,
            "qty": 23,
            "tickets": 13,
            "upt": 1.77,
            "avgPrice": 998,
            "workHours": 127.5,
            "hourlyOutput": 180.1,
            "salesShare": 0.077,
            "categories": "鞋履 64.3% / 服装 35.7%"
      },
      {
            "name": "何秋烨",
            "sales": 20434,
            "qty": 23,
            "tickets": 13,
            "upt": 1.77,
            "avgPrice": 888,
            "workHours": 105,
            "hourlyOutput": 194.6,
            "salesShare": 0.069,
            "categories": "鞋履 69.4% / 服装 22.9% / 配件 7.7%"
      },
      {
            "name": "朱凯赟",
            "sales": 17654,
            "qty": 18,
            "tickets": 12,
            "upt": 1.5,
            "avgPrice": 981,
            "workHours": 105.5,
            "hourlyOutput": 167.3,
            "salesShare": 0.06,
            "categories": "鞋履 60.0% / 服装 39.0% / 配件 1.1%"
      },
      {
            "name": "邓奇缘",
            "sales": 16005,
            "qty": 15,
            "tickets": 12,
            "upt": 1.25,
            "avgPrice": 1067,
            "workHours": 139.5,
            "hourlyOutput": 114.7,
            "salesShare": 0.054,
            "categories": "鞋履 90.7% / 服装 8.1% / 配件 1.2%"
      },
      {
            "name": "迟骋",
            "sales": 15586,
            "qty": 17,
            "tickets": 8,
            "upt": 2.12,
            "avgPrice": 917,
            "workHours": 109.5,
            "hourlyOutput": 142.3,
            "salesShare": 0.053,
            "categories": "鞋履 67.3% / 服装 23.0% / 配件 9.7%"
      },
      {
            "name": "田佳乐",
            "sales": 8944,
            "qty": 8,
            "tickets": 7,
            "upt": 1.14,
            "avgPrice": 1118,
            "workHours": 125.5,
            "hourlyOutput": 71.3,
            "salesShare": 0.03,
            "categories": "鞋履 86.0% / 服装 8.9% / 配件 5.1%"
      },
      {
            "name": "王龙宇",
            "sales": 5450,
            "qty": 5,
            "tickets": 4,
            "upt": 1.25,
            "avgPrice": 1090,
            "workHours": 58.5,
            "hourlyOutput": 93.2,
            "salesShare": 0.018,
            "categories": "鞋履 93.4% / 配件 6.6%"
      }
]
      },
            july: {
              month: '2026-07',
              totalSales: 185562,
              totalQty: 175,
              totalTickets: 156,
              avgUPT: 1.25,
              avgHourlyOutput: 200,
              avgPrice: 1060,
              note: '7月业绩(全月7/1-7/31) - totalSales=全店结算金额185562(含全职), 兼职总额189182(从小票备注拼音首字母+中文名匹配提取); JCL=贾长乐; 李若彤7/29离职保留7月数据; 唐蓉无历史工时',
              records: [

                { name: '龚赟昊', sales: 23794, qty: 23, tickets: 16, upt: 1.44, avgPrice: 1035, workHours: 78.3, hourlyOutput: 304, salesShare: 0.1258, categories: '鞋履 85.2% / 服装 13.0% / 配件 1.8%' },
                { name: '何秋烨', sales: 21362, qty: 19, tickets: 14, upt: 1.36, avgPrice: 1124, workHours: 60.9, hourlyOutput: 351, salesShare: 0.1129, categories: '鞋履 77.1% / 服装 21.5% / 配件 1.4%' },
                { name: '王雅澜', sales: 20990, qty: 20, tickets: 17, upt: 1.18, avgPrice: 1050, workHours: 83.6, hourlyOutput: 251, salesShare: 0.111, categories: '鞋履 87.1% / 服装 9.0% / 配件 3.9%' },
                { name: '孔祥宇', sales: 19576, qty: 17, tickets: 14, upt: 1.21, avgPrice: 1152, workHours: 82.1, hourlyOutput: 238, salesShare: 0.1035, categories: '鞋履 96.4% / 服装 3.1% / 配件 0.6%' },
                { name: '朱凯赟', sales: 15632, qty: 14, tickets: 11, upt: 1.27, avgPrice: 1117, workHours: 61.5, hourlyOutput: 254, salesShare: 0.0826, categories: '鞋履 88.1% / 服装 8.9% / 配件 2.9%' },
                { name: '王靳毓', sales: 14880, qty: 11, tickets: 9, upt: 1.22, avgPrice: 1353, workHours: 63.7, hourlyOutput: 234, salesShare: 0.0787, categories: '鞋履 72.5% / 服装 15.3% / 配件 12.2%' },
                { name: '李若彤', sales: 14670, qty: 16, tickets: 9, upt: 1.78, avgPrice: 917, workHours: 68.1, hourlyOutput: 215, salesShare: 0.0775, categories: '鞋履 68.1% / 服装 27.9% / 配件 4.1%' },
                { name: '邓奇缘', sales: 11240, qty: 10, tickets: 8, upt: 1.25, avgPrice: 1124, workHours: 63.3, hourlyOutput: 178, salesShare: 0.0594, categories: '鞋履 88.8% / 服装 8.0% / 配件 3.2%' },
                { name: '田佳乐', sales: 11160, qty: 10, tickets: 6, upt: 1.67, avgPrice: 1116, workHours: 59.9, hourlyOutput: 186, salesShare: 0.059, categories: '鞋履 92.7% / 配件 7.3%' },
                { name: '玛依拉', sales: 8186, qty: 7, tickets: 6, upt: 1.17, avgPrice: 1169, workHours: 71.2, hourlyOutput: 115, salesShare: 0.0433, categories: '鞋履 93.9% / 服装 6.1%' },
                { name: '迟骋', sales: 8088, qty: 6, tickets: 6, upt: 1.0, avgPrice: 1348, workHours: 49.0, hourlyOutput: 165, salesShare: 0.0428, categories: '鞋履 88.9% / 服装 11.1%' },
                { name: '王龙宇', sales: 6868, qty: 6, tickets: 6, upt: 1.0, avgPrice: 1145, workHours: 32.1, hourlyOutput: 214, salesShare: 0.0363, categories: '鞋履 78.5% / 服装 21.5%' },
                { name: '杨子豪', sales: 6548, qty: 6, tickets: 5, upt: 1.2, avgPrice: 1091, workHours: 95.9, hourlyOutput: 68, salesShare: 0.0346, categories: '鞋履 94.5% / 配件 5.5%' },
                { name: '梁实秋', sales: 3494, qty: 3, tickets: 3, upt: 1.0, avgPrice: 1165, workHours: 79.4, hourlyOutput: 44, salesShare: 0.0185, categories: '鞋履 100.0%' },
                { name: '唐蓉', sales: 1496, qty: 2, tickets: 2, upt: 1.0, avgPrice: 748, workHours: 0, hourlyOutput: 0, salesShare: 0.0079, categories: '鞋履 66.7% / 服装 33.3%' },
                { name: '贾长乐', sales: 1198, qty: 1, tickets: 1, upt: 1.0, avgPrice: 1198, workHours: 56.4, hourlyOutput: 21, salesShare: 0.0063, categories: '鞋履 100.0%' },

              ]
            },
    },

    // 顾客好评记录（大众点评5星好评）
    customerReviews: [
      { id: 2, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '店门口很适合拍照，店员都好帅。那天碰到一个小哥态度很好很和善，问他说是叫CC，下次还找他服务。', keywords: ['态度好', '和善', '适合拍照', '下次还找'], source: '大众点评（煤球斯基，Lv1）' },
      { id: 3, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '本次购物体验很棒，导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 4, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，小朱帮忙挑选也很用心，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 5, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，没有半点推销感。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '无推销感'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 6, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，服务贴心周到。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '贴心周到'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 7, staffName: '李若彤', month: '2026-06', rating: 5, reviewDate: '2026-06-20', snippet: '买了两双安福路店限定whisper，来上海旅游的目的就是这两双，店员好亲切，进来了两次，第一次试穿店员并不会因为我来试试而置之不理，非常惊讶。特别点名小和，非常非常非常用心！', keywords: ['服务态度好', '热情亲切', '耐心接待', '小和用心', '购买转化'], source: '大众点评（匿名用户，Lv2）' },
      { id: 8, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-21', snippet: '来Salomon安福路店逛街，CC接待的我，人特别热情，讲鞋子都讲得很细，耐心跟我说各个款式的区别，选鞋给的建议也很实在，逛着很舒服，体验挺好的～', keywords: ['热情', '讲解细致', '耐心介绍', '建议实在', '体验好'], source: '大众点评（勇善可爱的小柔，Lv1）' },
      { id: 9, staffName: '杨子豪', month: '2026-06', rating: 5, reviewDate: '2026-06-26', snippet: '第一次光临很愉快的购物体验，子豪很热情，耐心介绍产品，非常专业，店内环境也很好，有空再来逛一逛。', keywords: ['热情', '耐心介绍', '非常专业', '店内环境好'], source: '大众点评（匿名用户，Lv2）' },
      { id: 10, staffName: '杨子豪', month: '2026-06', rating: 5, reviewDate: '2026-06-26', snippet: '门店环境很好，一进门导购非常热情，店员杨子豪小哥哥耐心的介绍产品，非常贴心拿尺码给我试穿，根据我的需求给我推荐的鞋子，穿起来还蛮舒服的，很用心，也是很愉快的购物体验～', keywords: ['环境很好', '非常热情', '耐心介绍', '贴心拿尺码', '推荐专业', '舒适', '愉快体验'], source: '大众点评（匿名用户，Lv1）' },
      { id: 11, staffName: '朱凯赟', month: '2026-07', rating: 5, reviewDate: '2026-07-03', snippet: '今天来到了上海萨洛蒙旗舰店 小朱服务的特别好买了一双 xt6', keywords: ['服务特别好', '超预期', 'xt6'], source: '大众点评（嘟嘟_9163，Lv3）', amount: 1398 },
      { id: 12, staffName: '田佳乐', month: '2026-07', rating: 5, reviewDate: '2026-07-09', snippet: '在萨洛蒙挑鞋，全程是佳乐小哥接待的。试了好几双，纠结特别久 但是这位佳乐小伙全程不催，聊得很轻松。懂每款鞋子的上脚区别，给出的建议很实在，不会一味主推贵。购物体验很舒服，想买萨洛蒙直接找他就行!!', keywords: ['耐心', '轻松', '懂鞋', '建议实在', '不推销'], source: '大众点评（土拨鼠哥哥）' },
      { id: 13, staffName: '田佳乐', month: '2026-07', rating: 5, reviewDate: '2026-07-09', snippet: '特意来评价下佳乐，人挺好相处的。选鞋的时候很有耐心，会真心实意给建议，不会一味硬推款式，全程聊得很轻松，服务细心靠谱，下次还来找他买鞋嘿嘿', keywords: ['好相处', '耐心', '真心建议', '不硬推', '细心靠谱'], source: '大众点评（蛤蜊小公举～）' },
      { id: 14, staffName: '王靳毓', month: '2026-07', rating: 5, reviewDate: '2026-07-09', snippet: '这里有一些特别款，看上去很酷。小哥哥 JINYU 服务的挺好，爽快买单', keywords: ['特别款', '服务挺好', '爽快买单'], source: '大众点评（拾荒_3520，打卡后评价）' },
      { id: 15, staffName: '王靳毓', month: '2026-07', rating: 5, reviewDate: '2026-07-09', snippet: '小哥哥的服务很有耐心，JINYU 小哥哥，下次来还找他。这幢楼也是一个不错的打卡点', keywords: ['服务耐心', '下次还找', '打卡点'], source: '大众点评（绿豆棒冰，打卡后评价）' },
      { id: 16, staffName: '田佳乐', month: '2026-07', rating: 5, reviewDate: '2026-07-09', snippet: '好久没逛街了 路过安福路过来挑鞋，接待我的是佳乐小哥哥。人特别随和，全程不会刻意推销，会结合喜好耐心帮忙挑选，说话舒服接地气，服务很贴心，这次购物体验很不错，想买鞋可以找他～', keywords: ['随和', '不刻意推销', '耐心', '接地气', '贴心'], source: '大众点评（尘尘，Lv3）' },
      { id: 17, staffName: '孔祥宇', month: '2026-07', rating: 5, reviewDate: '2026-07-11', snippet: '来这边旅游，逛到了这家salomon小白楼，在外面看就感觉很漂亮，有小孔导览员（孔祥宇）带着我们逛了整栋楼，全程都很热情，耐心。整栋楼的装修很像韩国那边的店很精致，漂亮，听说是亚洲最大的旗舰店，喜欢salomon的可以来感受一下氛围。', keywords: ['热情', '耐心导览', '旗舰氛围', '装修精致', '韩国风格', '超预期'], source: '大众点评（海参拌黑松露，Lv1）' },
      { id: 18, staffName: '王雅澜', month: '2026-07', rating: 5, reviewDate: '2026-07-13', snippet: '今天来安福路偶然看到萨洛蒙小白楼，的很漂亮，是雅澜带着我们试的鞋，很耐心，店里很漂亮，小姐姐态度很好😊', keywords: ['耐心试鞋', '态度很好', '店内环境美'], source: '大众点评（Karen，Lv2）' },
      { id: 19, staffName: '王雅澜', month: '2026-07', rating: 5, reviewDate: '2026-07-14', snippet: '早就听说萨洛蒙这个小白楼，今天来实地看了，装修很独特，款式也很多，进来高个子妹妹雅澜接待，态度非常好说话也很温柔，试了好几双也没有一点不耐烦，虽然最后没有购入，但全程给人感觉非常舒适，推荐大家来逛一逛。', keywords: ['态度温柔', '耐心试穿', '不催促', '装修独特', '款式多', '推荐'], source: '大众点评（dpuser_3495845063，Lv1）' },
      { id: 20, staffName: '龚赟昊', month: '2026-07', rating: 5, reviewDate: '2026-07-15', snippet: '接待人员昊昊很热情推荐，买了喜欢的鞋，全程服务都很耐心，讲解的也超级仔细~总之购物体验超级棒！', keywords: ['热情推荐', '服务耐心', '讲解仔细', '购物体验棒'], source: '大众点评（香瓜子先生，Lv2）' },
      { id: 21, staffName: '杨子豪', month: '2026-07', rating: 5, reviewDate: '2026-07-16', snippet: '杨子豪全程耐心周到，办事高效靠谱，服务很棒', keywords: ['耐心周到', '高效靠谱', '服务棒'], source: '大众点评（锅包肉，Lv1）' },
      { id: 22, staffName: '杨子豪', month: '2026-07', rating: 5, reviewDate: '2026-07-16', snippet: '安福路萨洛蒙，店员杨子豪服务很好，介绍鞋子很专业，耐心帮我试穿，体验不错。对产品知识掌握得特别透彻，根据我的需求耐心选鞋，试穿全程细心，讲解清晰，全程无过度推销', keywords: ['专业介绍', '耐心试穿', '产品知识', '细心讲解', '无过度推销'], source: '大众点评（忠刚清香的小邹，Lv1）' },
      { id: 23, staffName: '孔祥宇', month: '2026-07', rating: 5, reviewDate: '2026-07-18', snippet: '第二次来萨洛蒙小白楼！上次买的鞋穿了大半年超舒服，这次想入新款，小孔推荐的款式完全踩在我的审美上。店里三层空间超好拍，法式小白楼超出片，全程没有过度推销，体验感满分，已经推荐朋友来逛逛街！', keywords: ['二次到店', '款式推荐准', '三层空间', '超出片', '无过度推销', '超预期'], source: '大众点评（匿名用户，Lv3）' },
      { id: 24, staffName: '孔祥宇', month: '2026-07', rating: 4, reviewDate: '2026-07-18', snippet: '安福路萨洛蒙小白楼真的超好逛！接待我的店员小孔人特别温柔，耐心给我挨个试热门小白XT，还主动带我逛三楼隐藏打卡空间，讲解鞋子面料和穿搭思路。整栋白色小楼氛围感拉满，款式齐全现货足，脚感轻便百搭，逛街徒步都合适，小孔服务贴心又专业，来买鞋认准她！', keywords: ['温柔耐心', '挨个试穿', '三楼隐藏打卡', '面料讲解', '穿搭思路', '氛围感', '款式齐全', '专业'], source: '大众点评（dpuser_2583924661，Lv1）' },
      { id: 25, staffName: '王龙宇', month: '2026-07', rating: 5, reviewDate: '2026-07-19', snippet: '王龙宇服务很好，特别有耐心讲解，根据需求为我挑选合适的鞋子，店里陈列美观，感受到了店员的用心，下次还去这里来！', keywords: ['耐心讲解', '按需推荐', '陈列美观', '下次还去', '超预期'], source: '大众点评（海的孩子，Lv1）', amount: 600 },
      { id: 26, staffName: '邓奇缘', month: '2026-07', rating: 5, reviewDate: '2026-07-19', snippet: '在店里看中了一款复古鞋，经过天天小哥的介绍之后打算买下，非常愉快的一次购物经历。', keywords: ['复古鞋', '天天介绍', '愉快购物', '超预期'], source: '大众点评（jjjjjjj，Lv1）', amount: 1298 },
      { id: 27, staffName: '邓奇缘', month: '2026-07', rating: 5, reviewDate: '2026-07-19', snippet: '来安福路逛街发现这里居然开了一家salomon，听销售天天介绍这家店的潮流款式最多，他带我们逛完了整栋楼也介绍了很多，特别好的一次体验。', keywords: ['潮流款式多', '天天带逛', '整栋楼导览', '详细介绍', '超预期'], source: '大众点评（MineMine，Lv1）', amount: 1500 },
      { id: 28, staffName: '玛依拉', month: '2026-07', rating: 5, reviewDate: '2026-07-19', snippet: 'The place is amazing! Also Kiki\'s service is really amazing! Helping us a lot', keywords: ['Amazing', 'Kiki服务好', '帮助很多', '超预期'], source: '大众点评（Kay，Lv6）' },
      { id: 29, staffName: '王龙宇', month: '2026-07', rating: 5, reviewDate: '2026-07-20', snippet: '导购龙宇专业又贴心，讲解细致，试鞋全程耐心帮忙，无过度推销，推荐精准，服务体验极佳，款式齐全，环境好看，值得专程来逛！', keywords: ['专业贴心', '讲解细致', '全程耐心', '无过度推销', '推荐精准', '环境好看', '值得专程', '超预期'], source: '大众点评（Lil_花，Lv1）', amount: 700 },
      { id: 30, staffName: '玛依拉', month: '2026-07', rating: 5, reviewDate: '2026-07-20', snippet: '导购kiki人超好，耐心讲品牌故事，对产品门儿清。店装修有格调，细节处见用心，比如那块大S标和黑板墙，氛围感拉满。体验很舒服，值得来逛～', keywords: ['kiki人超好', '品牌故事', '产品专业', '装修有格调', '大S标', '黑板墙', '细节用心', '氛围感', '超预期'], source: '大众点评（阿宁，Lv1）' },
      { id: 31, staffName: '王龙宇', month: '2026-07', rating: 5, reviewDate: '2026-07-20', snippet: '我去，龙宇哥太帅了，你还别说龙宇哥这么帅一大模特没有一点架子，超级亲和！导览员做得还是有点东西啊，今天逛店爽了，享受服务还能见超模', keywords: ['亲和', '超模颜值', '无架子', '导览专业', '超预期'], source: '大众点评（匿名用户，Lv3）' },
      { id: 32, staffName: '王雅澜', month: '2026-07', rating: 5, reviewDate: '2026-07-19', snippet: '雅澜的服务很热情，线下购物的体验很好！', keywords: ['服务热情', '体验好', '超预期'], source: '大众点评（noangel220，Lv4）' },
      { id: 33, staffName: '王龙宇', month: '2026-07', rating: 5, reviewDate: '2026-07-20', snippet: '强烈安利导购龙宇！待人温和又细心，耐心解答我好多小白问题，不强行推销，安安静静帮我挑选合适的鞋子，体验感满分啦', keywords: ['强烈安利', '温和细心', '耐心解答', '不强行推销', '安安静静', '体验满分', '超预期'], source: '大众点评（小张胃胀，Lv1）' },
      { id: 34, staffName: '王龙宇', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '这次Salomon门店购物体验非常满意！店内环境舒适，产品展示清晰。感谢龙宇的耐心服务和专业讲解，会根据我的需求推荐合适的鞋款，并详细介绍产品特点。试穿过程中也会结合实际脚感给出建议，整个过程轻松愉快！', keywords: ['耐心服务', '专业讲解', '按需推荐', '产品特点', '试穿建议', '轻松愉快'], source: '大众点评（信德聪慧的小鹤，Lv1）' },
      { id: 35, staffName: '邓奇缘', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '散步路过安福路Salomon进来逛逛，小白楼店面颜值拉满，每层都有不一样的小设计。天天小哥哥态度特别好，问鞋子相关问题都认真解答，帮忙拿码数、对比款式很主动，不会冷淡也不会强行推销。逛得很放松，下次还会再来。', keywords: ['态度好', '认真解答', '主动帮忙', '不强行推销', '逛得放松'], source: '大众点评（溺水的鱼，Lv1）' },
      { id: 36, staffName: '迟骋', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '来安福路打卡萨洛蒙小白楼，整栋法式洋楼环境超有氛围感，三层空间设计很有巧思，拍照逛店都很舒服。特别感谢店员cc，专业又有耐心，会根据我的脚型和日常穿搭需求，细致讲解不同鞋款的性能，从城市通勤款到户外徒步款都介绍得很清楚，没有过度推销。', keywords: ['专业', '有耐心', '根据脚型', '穿搭需求', '细致讲解', '无过度推销'], source: '大众点评（Yin，Lv1）' },
      { id: 37, staffName: '杨子豪', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '店装修的好看，商品很酷。谢谢子豪，很快理解到我的品味推荐一双非常舒服的鞋子！', keywords: ['理解品味', '推荐合适', '舒服'], source: '大众点评（earthcreests，Lv2）' },
      { id: 38, staffName: '玛依拉', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '强烈安利导购Kiki，人美心善的小姐姐，非常热情地给我们介绍！店面装修保留了法式美学，商品种类齐全，超级好逛。', keywords: ['人美心善', '热情介绍', '法式美学', '商品齐全', '超级好逛'], source: '大众点评（匿名用户，Lv2）' },
      { id: 39, staffName: '迟骋', month: '2026-07', rating: 5, reviewDate: '2026-07-21', snippet: '首先要夸导购CC小哥，人超级nice，全程耐心讲解，店里的款式很新，越野鞋和户外风服饰质感都在线。三楼的法式灵感空间特别出片，光影和装置设计很有氛围感。', keywords: ['人nice', '耐心讲解', '款式新', '法式灵感空间', '氛围感', '质感在线'], source: '大众点评（匿名用户，Lv5）' },
      { id: 40, staffName: '迟骋', month: '2026-07', rating: 5, reviewDate: '2026-07-27', snippet: '店内货品款式很丰富，不少热门款线下都有现货。店员服务细致耐心，挑选鞋子时会给出合适的尺码和穿搭建议，试穿体验很放松。迟骋导购小哥哥专业度很高，非常帅气，整个购物过程十分舒心，很推荐这家门店。', keywords: ['款式丰富', '现货', '细致耐心', '尺码建议', '专业帅气', '舒心', '超预期'], source: '大众点评（空调，Lv1）', amount: 1200 },
      { id: 41, staffName: '何秋烨', month: '2026-07', rating: 5, reviewDate: '2026-07-29', snippet: '路过安福路这家萨洛蒙 在店门口就被吸引了 装修风格特别简约 最主要的是门店小姐姐态度非常好 秋秋帮我热心的试款式 而且鞋码和颜色都很齐全 非常喜欢', keywords: ['装修简约', '门店小姐姐', '态度非常好', '热心的试款式', '鞋码齐全', '非常喜欢', '超预期'], source: '大众点评（谦虚睿眼嚷嚷鱼，Lv1）' },
      { id: 42, staffName: '迟骋', month: '2026-07', rating: 5, reviewDate: '2026-07-27', snippet: '店里款式挺多，好多网上抢不到的款这边居然有。店员态度超级好，问尺码给建议都挺耐心的，试穿完全没有压力。逛着很舒服，下次来还要找找一个叫迟骋的小哥哥来给我导购、人超级帅服务态度也好，喜欢这家店!!!!!!', keywords: ['款式多', '态度超级好', '耐心建议', '试穿无压力', '下次还找', '服务态度好', '超预期'], source: '大众点评（忠礼甜蜜的小水，Lv2）' },
      { id: 43, staffName: '何秋烨', month: '2026-07', rating: 5, reviewDate: '2026-07-27', snippet: '感谢秋秋导览员 很好的一次购物体验！希望下次再来！', keywords: ['感谢秋秋', '导览员', '购物体验', '希望再来', '超预期'], source: '大众点评（真毅稳重的小铃，Lv1，打卡后评价）', amount: 2396 },
      { id: 44, staffName: '何秋烨', month: '2026-07', rating: 5, reviewDate: '2026-07-28', snippet: '从北京来上海玩 逛到这家很漂亮的店 店员秋秋很热情 服务很好 买到了心仪的鞋子', keywords: ['从北京来', '很漂亮', '秋秋很热情', '服务很好', '心仪的鞋子', '超预期'], source: '大众点评（欢乐，Lv3，打卡后评价）', amount: 998 },
      { id: 45, staffName: '邓奇缘', month: '2026-07', rating: 5, reviewDate: '2026-07-31', snippet: '来上海旅游想买双鞋，进了Salomon是天天接待的，经过细心介绍试了很多双终于买到了双自己喜欢的鞋~', keywords: ['旅游买鞋', '天天接待', '细心介绍', '试多双', '超预期'], source: '大众点评（Abbott_3448，Lv1）' },
    ],

    _dataVersion: '2026-08-01-v168',
  },

  _cache: null,  // in-memory cache to avoid repeated JSON.parse

  // P2-3 fix: localStorage 安全包装 — 隐私模式/配额耗尽时不崩溃，降级为内存模式
  _lsAvailable: null,  // 缓存 localStorage 可用性检测结果
  _checkLS() {
    if (this._lsAvailable !== null) return this._lsAvailable;
    try {
      const _test = '__ls_test__';
      localStorage.setItem(_test, '1');
      localStorage.removeItem(_test);
      this._lsAvailable = true;
    } catch (e) {
      this._lsAvailable = false;
      console.warn('[Store] localStorage 不可用，降级为内存模式（数据不持久化）');
    }
    return this._lsAvailable;
  },
  _safeGetItem(key) {
    try { return this._checkLS() ? localStorage.getItem(key) : null; }
    catch (e) { return null; }
  },
  _safeSetItem(key, value) {
    try {
      if (this._checkLS()) { localStorage.setItem(key, value); return true; }
    } catch (e) {
      this._lsAvailable = false;  // 配额耗尽等情况，标记为不可用
      console.warn('[Store] localStorage 写入失败，本次操作仅在内存生效:', e.message);
    }
    return false;
  },
  _safeRemoveItem(key) {
    try { if (this._checkLS()) localStorage.removeItem(key); }
    catch (e) { /* ignore */ }
  },
  init() {
    try {
      if (!this._safeGetItem(this.KEY)) {
        this._safeSetItem(this.KEY, JSON.stringify(this.defaults));
        this._cache = JSON.parse(JSON.stringify(this.defaults));
        return;
      }
      const data = JSON.parse(this._safeGetItem(this.KEY));
      const DATA_VERSION = '2026-08-01-v168';
      const isVersionMismatch = data._dataVersion !== DATA_VERSION;
      const isMissingCritical = !data.ratings || !data.linggongAttendance || !data.performanceData || !data.customerReviews || !data.staff;
      
      if (isVersionMismatch || isMissingCritical) {
        // 升级前自动创建安全备份（防升级失败丢数据）
        if (isVersionMismatch) {
          this.createSafetyBackup();
        }
        // 智能合并：保留用户添加的数据，只更新默认数据结构
        const merged = JSON.parse(JSON.stringify(this.defaults));
        merged._dataVersion = DATA_VERSION;
        
        // staff: 以 id 为主键、name 为兜底键合并（P1-2 fix: 原 name-only 导致改名后数据重复）
        const defaultStaffIds = new Set(this.defaults.staff.map(s => String(s.id)));
        const defaultStaffNames = new Set(this.defaults.staff.map(s => s.name));
        // 构建两个索引：id→userVersion 和 name→userVersion
        const existingById = new Map();
        const existingByName = new Map();
        if (Array.isArray(data.staff)) {
          data.staff.forEach(s => {
            if (s.id != null) existingById.set(String(s.id), s);
            if (s.name) existingByName.set(s.name, s);
          });
        }
        // 默认数据覆盖同名条目，但保留用户自定义新增的
        // 对默认成员：dept / transferredFrom / status 始终取默认值（防止旧用户数据覆盖部门调整）
        // 其他字段（mbti, avatar_color 等）保留用户编辑
        // 匹配优先级：id 相同 > name 相同（兼容旧数据 id 缺失的场景）
        merged.staff = merged.staff.map(s => {
          // 优先按 id 匹配用户版本（健壮的主键），回退到 name 匹配（兼容历史数据）
          const userVersion = existingById.get(String(s.id)) || existingByName.get(s.name);
          if (!userVersion) return s;
          return { ...s, ...userVersion, id: s.id, dept: s.dept, transferredFrom: s.transferredFrom || userVersion.transferredFrom, serviceTeamStartDate: s.serviceTeamStartDate || userVersion.serviceTeamStartDate };
        });
        // 追加用户自定义新增的（id 和 name 都不在默认列表中的）
        data.staff.forEach(s => {
          const _inDefault = (s.id != null && defaultStaffIds.has(String(s.id))) || defaultStaffNames.has(s.name);
          if (!_inDefault) {
            merged.staff.push(s);
          }
        });

        // ratings: 保留用户添加的自定义评分（staffId不在默认列表中的）
        const defaultRatingKeys = new Set(this.defaults.ratings.map(r => `${r.staffId}-${r.month}`));
        // v50: 陈昕媛转正，清除其7月评分残留（id:101, staffId:1-month:2026-07）
        const _isFullTimeStaff = (staffId) => {
          const _sid = String(staffId);
          const s = this.defaults.staff.find(s => String(s.id) === _sid);
          return s && s.status === 'full_time';
        };
        if (Array.isArray(data.ratings)) {
          data.ratings.forEach(r => {
            const key = `${r.staffId}-${r.month}`;
            if (!defaultRatingKeys.has(key)) {
              // 跳过已转正成员的评分条目
              if (_isFullTimeStaff(r.staffId)) return;
              merged.ratings.push(r);
            }
          });
        }

        // 其他数组类数据：保留用户数据
        // v44 新增：先过滤掉乱码条目（mojibake）再合并
        const _isCorrupt = (s) => {
          if (typeof s !== 'string') return false;
          return /[\u00c0-\u00ff]{2,}/.test(s) || /[ÃÂ]/.test(s);
        };
        const _recClean = (rec) => {
          if (!rec || typeof rec !== 'object') return false;
          for (const v of Object.values(rec)) {
            if (typeof v === 'string' && _isCorrupt(v)) return false;
            if (v && typeof v === 'object' && !_recClean(v)) return false;
          }
          return true;
        };
        ['doorSchedule', 'storeSupport', 'shiftChanges', 'schedules', 'attendance'].forEach(key => {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            // 过滤乱码条目（type/detail/staff 等字段含 mojibake）
            const cleaned = data[key].filter(_recClean);
            if (cleaned.length > 0) {
              merged[key] = cleaned;
            } else {
              // 全部是乱码，用默认数据
              merged[key] = JSON.parse(JSON.stringify(this.defaults[key] || []));
            }
          }
        });

        // availability: 保留用户编辑的月份数据
        // v63: 同时处理标准 months 结构和历史扁平结构
        const userAvail = data.availability || {};
        if (userAvail) {
          // v86 P1-1: dynamic current month fallback
          const _nowYM = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
          if (!merged.availability) merged.availability = { currentMonth: _nowYM, months: {} };

          // 1. 收集所有月份数据（标准 months + 扁平结构）
          const monthMap = {};
          if (userAvail.months) {
            Object.keys(userAvail.months).forEach(mk => {
              monthMap[mk] = userAvail.months[mk];
            });
          }
          Object.keys(userAvail).forEach(mk => {
            if (mk === 'currentMonth' || mk === 'months') return;
            // 扁平结构: avail['2026-07'] = { data: {...} } 或 { person: data }
            if (userAvail[mk] && typeof userAvail[mk] === 'object') {
              if (!monthMap[mk]) monthMap[mk] = userAvail[mk];
            }
          });

          // 2. 合并每个月份数据，清理乱码 key
          Object.keys(monthMap).forEach(mk => {
            const mv = monthMap[mk];
            if (!mv || typeof mv !== 'object') return;
            const personMap = (mv.data && typeof mv.data === 'object') ? mv.data : mv;
            const cleanedData = {};
            Object.entries(personMap).forEach(([name, pdata]) => {
              // 简单乱码过滤
              if (/[\u00a0-\u00ff]{2,}/.test(name)) {
                console.warn('[Store] init 跳过乱码人名:', name.slice(0, 30));
                return;
              }
              cleanedData[name] = pdata;
            });

            // 确保新 staff 在所有月份有空条目
            this.defaults.staff.filter(s => s.dept === 'Service Team' && s.status === 'active').forEach(s => {
              if (!cleanedData[s.name]) {
                cleanedData[s.name] = { total: 0, unavailable: [], note: '', dates: {} };
              }
            });
            merged.availability.months[mk] = { data: cleanedData };
          });

          // v86 P1-1: dynamic current month fallback
          {
            const _d = new Date();
            const _ym = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}`;
            merged.availability.currentMonth = userAvail.currentMonth || _ym;
          }
        }

        // performanceData: 以默认数据为准（含最新录入），但保留用户可能在其他月份录入的自定义数据
        if (data.performanceData) {
          // 默认数据覆盖用户数据中的同名月份（P1-5 fix: 深拷贝，避免修改污染 defaults.performanceData）
          Object.keys(this.defaults.performanceData).forEach(mk => {
            data.performanceData[mk] = JSON.parse(JSON.stringify(this.defaults.performanceData[mk]));
          });
          merged.performanceData = data.performanceData;
        }
        // linggongAttendance: 以默认数据为准（含最新拉取的考勤），但保留用户可能手动添加的自定义记录
        if (data.linggongAttendance && data.linggongAttendance.records) {
          // 用默认记录作为基础（P1-5 fix: 深拷贝 records，避免引用污染 defaults）
          const defaultRecords = JSON.parse(JSON.stringify(this.defaults.linggongAttendance.records || []));
          const defaultKeys = new Set(this.defaults.linggongAttendance.records.map(r => `${r.name}-${r.date}`));
          // 保留用户数据中不在默认列表里的记录（手动添加的）
          const extraRecords = data.linggongAttendance.records.filter(r => !defaultKeys.has(`${r.name}-${r.date}`));
          merged.linggongAttendance = {
            ...this.defaults.linggongAttendance,
            records: [...defaultRecords, ...extraRecords]
          };
        }
        // customerReviews: defaults 为准（好评是手工录入的权威数据），合并用户手动添加的
        {
          const defaultIds = new Set((this.defaults.customerReviews || []).map(r => r.id));
          const userExtras = (data.customerReviews || []).filter(r => !defaultIds.has(r.id));
          merged.customerReviews = [...this.defaults.customerReviews, ...userExtras];
        }
        // staffStats: 保留
        if (data.staffStats) {
          merged.staffStats = data.staffStats;
        }

        this._safeSetItem(this.KEY, JSON.stringify(merged));
      }

      // ===== v132: 每次 init 都强制同步 staff dept（不依赖版本号）=====
      // 根因：_migrateData 只在版本不匹配时才执行。如果用户 localStorage 已存
      // 当前版本号但 staff 数据陈旧，后续访问永远跳过 migration，导致代码层
      // 的人员调整（如转部门）永远无法生效。
      // 修复：无论版本是否匹配，都用 defaults.staff 的 dept/status/transferredFrom/
      // serviceTeamStartDate 强制覆盖用户数据中的同名成员。
      // v140 增强：同时补齐 defaults 中新增但用户数据缺失的成员（如新增兼职）
      // v158 改造：改用 name 匹配（不用 id）——因为 defaults.staff.id 与数据库 staff.id 错位
      //   （defaults.id=6=孔祥宇，但数据库 id=6=邓奇缘）。按 id 匹配会错误覆盖。
      try {
        const _cur = JSON.parse(this._safeGetItem(this.KEY) || '{}');
        if (Array.isArray(_cur.staff) && Array.isArray(this.defaults.staff)) {
          // v158: 按 name 映射（而非 id）
          const _defMap = new Map(this.defaults.staff.map(s => [s.name, s]));
          let _changed = false;
          _cur.staff = _cur.staff.map(s => {
            const _def = _defMap.get(s.name);
            if (!_def) return s;
            // 强制同步部门相关字段
            if (s.dept !== _def.dept ||
                s.status !== _def.status ||
                (s.transferredFrom || '') !== (_def.transferredFrom || '') ||
                (s.serviceTeamStartDate || '') !== (_def.serviceTeamStartDate || '')) {
              _changed = true;
              return {
                ...s,
                dept: _def.dept,
                status: _def.status,
                transferredFrom: _def.transferredFrom || s.transferredFrom,
                serviceTeamStartDate: _def.serviceTeamStartDate || s.serviceTeamStartDate
              };
            }
            return s;
          });
          // v158: 补齐 defaults 中新增但用户数据缺失的成员（按 name 去重）
          const _curNames = new Set(_cur.staff.map(s => s.name));
          this.defaults.staff.forEach(_def => {
            if (!_curNames.has(_def.name)) {
              _cur.staff.push({ ..._def });
              _changed = true;
              console.log('[Store] v158: 补齐新增成员', _def.name);
            }
          });
          if (_changed) {
            this._safeSetItem(this.KEY, JSON.stringify(_cur));
            console.log('[Store] v132/v140: staff 强制同步完成');
          }
        }
      } catch (_syncErr) {
        console.warn('[Store] staff dept 同步失败(非致命):', _syncErr);
      }
      // ===== v132/v140 staff 强制同步 END =====

      // ===== v160: 脏数据自愈——把存量 ratings 的 staffId 按 name 对齐到 blob id =====
      // 根因：v157 的 saveRating 非管理员守卫写了 _auth.staffId（数据库 id），与 blob id
      // 错位，导致 4004 行的 'r.staffId === _auth.staffId' 永远查不到、hasRating 防重失效。
      // 修复：按 name 反查 blob id 重写 staffId；幂等可重复执行。
      try {
        const _cur2 = JSON.parse(this._safeGetItem(this.KEY) || '{}');
        if (Array.isArray(_cur2.staff) && Array.isArray(_cur2.ratings)) {
          const _idByName = new Map(_cur2.staff.map(s => [s.name, s.id]));
          let _ratedChanged = false;
          _cur2.ratings.forEach(r => {
            if (!r) return;
            // 优先按 staffName 反查；否则按 staffId 在 staff 里找 name 再反查（兼容老数据）
            let _name = r.staffName;
            if (!_name && r.staffId != null) {
              _name = (_cur2.staff.find(s => s.id === r.staffId) || {}).name;
            }
            if (_name) {
              const _correctId = _idByName.get(_name);
              if (_correctId != null && r.staffId !== _correctId) {
                r.staffId = _correctId;
                r.staffName = _name;  // 顺便补齐 staffName 字段
                _ratedChanged = true;
              }
            }
          });
          if (_ratedChanged) {
            this._safeSetItem(this.KEY, JSON.stringify(_cur2));
            console.log('[Store] v160: ratings.staffId 按 name 对齐完成');
          }
        }
      } catch (_ratedErr) {
        console.warn('[Store] v160 ratings 修复失败(非致命):', _ratedErr);
      }
      // ===== v160 ratings 自愈 END =====

    } catch (e) {
      console.error('[Store] 数据解析失败，尝试安全备份后重置:', e);
      // Safety backup before reset to prevent total data loss
      // v90: 改为固定 key 覆盖式备份，避免反复崩溃时无限堆积 error_backup 条目
      const existing = this._safeGetItem(this.KEY);
      if (existing) {
        this._safeSetItem(this.KEY + '_error_backup', existing);
      }
      // P0-3 fix + P2-3 fix: 使用安全方法，隐私模式自动降级为内存模式
      this._safeSetItem(this.KEY, JSON.stringify(this.defaults));
    }
    // Always populate cache after init
    try {
      this._cache = JSON.parse(this._safeGetItem(this.KEY) || JSON.stringify(this.defaults));
    } catch(e) {
      this._cache = JSON.parse(JSON.stringify(this.defaults));
    }
  },

  get(key) {
    try {
      // v86 P1-3: _cache may be null after cross-tab invalidation — re-parse and repopulate
      if (!this._cache) {
        this._cache = JSON.parse(this._safeGetItem(this.KEY) || '{}');
      }
      const data = this._cache;
      let val = data[key];
      // P0 fix: null/undefined → 回退到 defaults（P1-4 fix: 深拷贝避免污染 defaults）
      if (val === undefined || val === null) {
        const _def = this.defaults[key];
        val = (typeof _def === 'object' && _def !== null)
          ? JSON.parse(JSON.stringify(_def))
          : _def;
      }
      // 再次兜底：确保 array 类型的 key 永远返回数组
      if ((val === undefined || val === null) && Array.isArray(this.defaults[key])) {
        val = [];
      }
      if (val === undefined || val === null) {
        val = {};
      }
      return val;
    } catch (e) {
      console.error('[Store.get] 读取失败，返回默认值:', key, e);
      // P1-4 fix: 深拷贝 defaults，避免调用方修改污染默认数据
      const fallback = this.defaults[key];
      if (fallback === undefined) return Array.isArray(this.defaults[key]) ? [] : {};
      return typeof fallback === 'object' && fallback !== null
        ? JSON.parse(JSON.stringify(fallback))
        : fallback;
    }
  },

  // P0 fix: 安全获取数组，保证永远返回 Array
  getList(key) {
    const val = this.get(key);
    return Array.isArray(val) ? val : [];
  },

  set(key, value) {
    try {
      // P0-2 fix: 深拷贝写入值，防止调用方引用直接进入 cache 后被外部修改
      const safeValue = typeof value === 'object' && value !== null
        ? JSON.parse(JSON.stringify(value))
        : value;
      const data = this._cache
        ? JSON.parse(JSON.stringify(this._cache))
        : JSON.parse(this._safeGetItem(this.KEY) || '{}');
      data[key] = safeValue;
      // P2-3 fix: 使用安全写入，隐私模式时至少更新内存 cache
      if (this._safeSetItem(this.KEY, JSON.stringify(data))) {
        this._cache = data;  // only update cache after successful write
      } else {
        // localStorage 不可用，降级为仅内存更新
        this._cache = data;
      }
    } catch (e) {
      console.error('[Store.set] 写入失败:', key, e);
      // quota exceeded 等 — cache 保持旧值，不污染
      if (typeof showToast === 'function') {
        showToast('存储空间已满，请清理旧数据', 'error');
      }
    }
  },

  getAll() {
    try {
      // v86 P1-3: reparse if cache invalidated
      if (!this._cache) {
        this._cache = JSON.parse(this._safeGetItem(this.KEY) || JSON.stringify(this.defaults));
      }
      return this._cache;
    } catch (e) {
      console.error('[Store.getAll] 读取失败，返回默认数据:', e);
      return this.defaults;
    }
  },

  reset() {
    // P2-3 fix: 隐私模式安全处理
    this._safeSetItem(this.KEY, JSON.stringify(this.defaults));
    this._cache = JSON.parse(JSON.stringify(this.defaults));
  },

  // ===== 数据导出/导入/备份 =====
  exportData() {
    const data = this._safeGetItem(this.KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    const exportPayload = {
      _exportMeta: {
        appName: '安福路 Salomon 兼职管理系统',
        exportTime: new Date().toISOString(),
        dataVersion: parsed._dataVersion || 'unknown',
        staffCount: (parsed.staff || []).length,
        recordSummary: {
          staff: (parsed.staff || []).length,
          ratings: (parsed.ratings || []).length,
          doorSchedule: (parsed.doorSchedule || []).length,
          attendance: (parsed.linggongAttendance && parsed.linggongAttendance.records || []).length,
          customerReviews: (parsed.customerReviews || []).length,
        }
      },
      data: parsed
    };
    return JSON.stringify(exportPayload, null, 2);
  },

  downloadBackup() {
    const jsonStr = this.exportData();
    if (!jsonStr) { showToast('没有可导出的数据', 'error'); return; }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `salomon-backup-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('数据已导出到下载文件夹', 'success');
  },

  importData(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      // Support both wrapped format (with _exportMeta) and raw format
      const actualData = parsed.data ? parsed.data : parsed;
      // Basic validation — must have staff array
      if (!actualData.staff || !Array.isArray(actualData.staff)) {
        return { success: false, error: '文件格式不正确：缺少 staff 数据' };
      }
      // Write to localStorage (P2-3 fix: 隐私模式安全处理)
      if (!this._safeSetItem(this.KEY, JSON.stringify(actualData))) {
        // localStorage 不可用，至少更新内存 cache
        this._cache = actualData;
      }
      return { success: true, data: actualData };
    } catch (e) {
      return { success: false, error: 'JSON 解析失败: ' + e.message };
    }
  },

  // Create safety backup before version upgrade (called in Store.init)
  createSafetyBackup() {
    try {
      const existing = this._safeGetItem(this.KEY);
      if (!existing) return;
      const backupKey = this.KEY + '_safety_backup';
      this._safeSetItem(backupKey, existing);
    } catch (e) {
      console.warn('[Store] 安全备份创建失败:', e);
    }
  },

  restoreSafetyBackup() {
    // P2-3 fix: 使用安全方法 + P2-4 fix: 数据完整性校验
    try {
      const backupKey = this.KEY + '_safety_backup';
      const backup = this._safeGetItem(backupKey);
      if (!backup) return false;
      // P2-4 fix: 校验备份数据完整性（防止恢复损坏备份导致循环崩溃）
      let parsed;
      try {
        parsed = JSON.parse(backup);
      } catch (parseErr) {
        console.error('[Store] 安全备份 JSON 解析失败，丢弃损坏备份:', parseErr.message);
        this._safeRemoveItem(backupKey);
        return false;
      }
      // 基本结构校验：必须有 staff 数组（最小数据单元）
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.staff)) {
        console.error('[Store] 安全备份结构无效（缺少 staff 数组），丢弃损坏备份');
        this._safeRemoveItem(backupKey);
        return false;
      }
      this._safeSetItem(this.KEY, backup);
      this._safeRemoveItem(backupKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Helper: get staff by id (P1-1 fix: 类型归一，DOM data-id 传字符串也能匹配 Number id)
  getStaff(id) {
    const staff = this.getList('staff');
    const _id = String(id);
    return staff.find(s => String(s.id) === _id) || null;
  },

  // Helper: get staff name
  getStaffName(id) {
    const s = this.getStaff(id);
    return s ? s.name : '未知';
  },

  // Helper: next id for a collection
  nextId(collection) {
    const items = this.getList(collection);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

// ===== Global scoring month — controls which months data all rating functions use =====
// v86 P1-1: 默认值在 Store.init() 后由 MonthConfig 动态推导（原硬编码 '2026-07'）
//
// 【P2-5 全局月份变量分布说明】
// 系统有 4 个跨文件共享的月份状态变量，分布在两个文件中：
//   app.js:  _scoringMonth (本行), _scheduleMonth (下方)
//   pages.js: _attMonth (pages.js:1189), perfMonth (pages.js:2969)
// 这些变量用 let 声明在各自文件顶层，通过全局作用域共享。
// 修改/读取时必须用 typeof 守卫（P1-3 fix），因为跨文件 let 在加载时序中可能处于 TDZ。
// 收拢到单一对象（如 MonthState）理论更优雅，但会破坏几十处引用 + 闭包捕获，
// 重构风险高于收益，故保留分散声明 + 集中文档说明。
let _scoringMonth = null; // null = auto-derive on first render

// ===== Global schedule view month — controls which month renderSchedule displays =====
let _scheduleMonth = null; // null = follow availability.currentMonth; set to 'YYYY-MM' to lock

// ===== Month switcher functions (exposed on window for inline onclick) =====
// Using window.xxx = function ensures inline onclick handlers can reliably access these
// regardless of let/const script-scope behavior differences across browsers
window.switchScoringMonth = function(m) {
  _scoringMonth = m;
  Router.render();
};
window.switchScheduleMonth = function(m) {
  if (typeof _scheduleMonth !== 'undefined') _scheduleMonth = m;
  if (typeof Router !== 'undefined' && Router.render) Router.render();
};
window.switchAttMonth = function(m) {
  // P1-3 fix: 安全赋值，避免 _attMonth 仍在 TDZ 时报错（_attMonth 在 pages.js 中 let 声明）
  if (typeof _attMonth !== 'undefined') _attMonth = m;
  if (typeof Router !== 'undefined' && Router.render) Router.render();
};

// ===== Router =====
// P1-7 fix: 渲染状态标记（提前声明，避免 TDZ；用于全局 error handler 判断是否渲染失败）
let _lastRenderOk = true;

const Router = {
  current: 'dashboard',

  navigate(page) {
    // P1-6 fix: 同步 hash 到 URL，让浏览器前进/后退生效
    if (page && page !== this.current) {
      const newHash = '#/' + page;
      if (location.hash !== newHash) {
        location.hash = newHash;  // 触发 hashchange → render，避免重复渲染
        return;
      }
    }
    this.current = page;
    this.render();
    // Close mobile sidebar
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
  },

  render() {
    const content = document.getElementById('page-content');
    
    // P0-2 fix: 重绘前销毁所有 Chart.js 实例，防止内存泄漏
    if (typeof Chart !== 'undefined' && Chart.helpers && Chart.helpers.each) {
      Chart.helpers.each(Chart.instances, function(instance) {
        instance.destroy();
      });
    }
    
    // P0-2 fix: 同一页面 re-render 时保存滚动位置
    const isSamePage = this._lastPage === this.current;
    const savedScroll = isSamePage ? (content.scrollTop || content.parentElement?.scrollTop || window.scrollY) : 0;
    
    const pages = {
      dashboard: () => renderDashboard(),
      staff: () => renderStaff(),
      schedule: () => renderSchedule(),
      doorSchedule: () => renderDoorSchedule(),
      attendance: () => renderAttendance(),
      ratings: () => renderRatings(),
      performance: () => renderPerformance(),
      support: () => renderSupport(),
      reviews: () => renderCustomerReviews(),
      handbook: () => renderHandbook(),
      myforms: () => renderMyForms(),
      dataManage: () => renderDataManagement(),
    };

    if (pages[this.current]) {
      try {
        content.innerHTML = pages[this.current]();
        _lastRenderOk = true;  // P1-7 fix: 标记渲染成功
        this._lastPage = this.current;
        
        // P0-2 fix: 恢复滚动位置
        if (isSamePage && savedScroll > 0) {
          requestAnimationFrame(() => {
            content.scrollTop = savedScroll;
            window.scrollTo(0, savedScroll);
          });
        }
        if (this.current === 'dashboard') {
          initDashboardCharts();
          // v167: 工作台待处理密码重置提醒（仅管理员）。
          // 加 typeof 守卫：万一 SW 缓存导致 app.js 已更新而 pages.js 还是旧版，
          // 也不会因 ReferenceError 把首页整个打成错误页。
          if (typeof loadDashboardResetRequests === 'function') loadDashboardResetRequests();
        }
        if (this.current === 'dataManage') loadResetRequests();
      } catch (e) {
        _lastRenderOk = false;  // P1-7 fix: 标记渲染失败，供全局 error handler 判断
        console.error('[App.render] 页面渲染失败:', this.current, e);
        content.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">' +
          '<p style="font-size:16px;margin-bottom:8px;">该页面加载出错</p>' +
          '<p style="font-size:13px;color:#999;">' + (e.message || 'Unknown error') + '</p>' +
          '<button data-action="reload" style="margin-top:16px;padding:8px 20px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">刷新重试</button></div>';
      }
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === this.current);
    });

    // Update header title
    const titles = {
      dashboard: '工作台',
      staff: '人员管理',
      schedule: '排班管理',
      doorSchedule: '门迎排班',
      attendance: '考勤记录',
      ratings: '表现评分',
      performance: '业绩数据',
      support: '店务支援',
      reviews: '顾客好评',
      handbook: '工作手册',
      myforms: '我的填报',
      dataManage: '数据管理',
    };
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titles[this.current] || '';
  }
};

// ===== v86 P1-2: Event Delegation System =====
// 第一性原则：onclick 挂在 HTML 字符串上 → 通过全局变量查找 → 不可测试。
// 解法：在 document 上注册一个委托监听器，用 data-action 属性路由。
// 新代码用 <button data-action="foo" data-params='{"id":123}'>，
// 老代码的 onclick 继续工作（双轨并行），渐进迁移。
const ActionHandler = {
  _handlers: {},

  // 注册一个 handler
  register(actionName, fn) {
    this._handlers[actionName] = fn;
  },

  // 批量注册
  registerAll(map) {
    Object.assign(this._handlers, map);
  },

  // 内部：解析 data-params，兼容 JSON 字符串和原始字符串
  _parseParams(el) {
    const raw = el.dataset.params;
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (_) { return { value: raw }; }
  },

  // 初始化全局委托监听（只调用一次）
  init() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      const handler = this._handlers[action];
      if (handler) {
        e.preventDefault();
        const params = this._parseParams(el);
        handler(params, el, e);
      }
    });
  }
};

// 注册通用 handlers（替代 window.xxx 模式）
// P1-3 fix: 所有跨文件 let 变量用 typeof 守卫，避免 TDZ 引用错误
ActionHandler.registerAll({
  navigate: (p) => Router.navigate(p.page),
  switchScoringMonth: (p) => { if (typeof _scoringMonth !== 'undefined') _scoringMonth = p.month; Router.render(); },
  switchScheduleMonth: (p) => { if (typeof _scheduleMonth !== 'undefined') _scheduleMonth = p.month; Router.render(); },
  switchAttMonth: (p) => { if (typeof _attMonth !== 'undefined') _attMonth = p.month; Router.render(); },
  switchPerfMonth: (p) => { if (typeof perfMonth !== 'undefined') perfMonth = p.month; Router.render(); },
  reload: () => location.reload(),
});

// ===== Toast Notification =====
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconSpan = document.createElement('span');
  iconSpan.textContent = icons[type] || '✅';
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message; // v168: 用 textContent 防 XSS（姓名/备注经 toast 渲染）
  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Utility Functions =====
function formatDate(dateStr) {
  if (!dateStr) return '-';
  // Handle ISO date strings (YYYY-MM-DD) without timezone issues
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parts = dateStr.slice(0, 10).split('-');
    return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  }
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getInitials(name) {
  return name ? name.charAt(name.length > 2 ? 1 : 0) : '?';
}

function getScoreClass(score) {
  if (score >= 4.5) return 'excellent';
  if (score >= 3.5) return 'good';
  if (score >= 2.5) return 'average';
  return 'poor';
}

function renderStars(count) {
  if (!count) return '-';
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    // Build YYYY-MM-DD manually to avoid timezone offset from toISOString
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const SHIFT_LABELS = { morning: '早班', afternoon: '晚班', fullday: '全天' };

// 考核标准 - 对应 Service Team 工作手册
const RATING_DIMENSIONS = [
  { key: 'availability', label: '工时支持', desc: '基础5分·每周不达标-1·换班>1次每次-0.5·顶班每次+0.5(上限+1)' },
  { key: 'performance', label: '销售业绩', desc: '时产×50% + UPT×50% + 月销≥2万加0.5分(封顶5)' },
  { key: 'behavior', label: '行为规范', desc: '门迎时长+店务时长对标团队平均·基础4·低于均线各-0.5·前三名加成(+1/+0.7/+0.4)' },
  { key: 'attendance', label: '考勤纪律', desc: '灵工打卡联动·基础5分·补卡1次免费·超出每次-1·迟到-1·旷工-2(最低1)' },
  { key: 'customerReview', label: '顾客好评', desc: '基础1分·首条好评+1·之后每条+0.5(封顶5)' },
];

// 薪资标准
const HOURLY_RATE_PASS = 60;  // 达标时薪
const HOURLY_RATE_FAIL = 28;  // 未达标时薪

// KPI 指标
const KPI = {
  hourlySalesTarget: 210,  // KPI达标检查合格线（时产≥210/h即合格）
  uptTarget: 1.25,          // KPI达标检查合格线（UPT≥1.25即合格）
  minWeeklyShifts: 3,      // 最低周排班天数
  idealWeeklyShifts: 4,    // 理想周可排班天数
};

// 三大核心职责
const CORE_ROLES = [
  { key: 'guide', label: '导览 Guide', icon: '🗺️', desc: '讲好品牌故事，传递户外精神', tasks: ['主动迎宾，微笑问候', '传递 Born in the Mountains 精神', '解读产品机能美学 & Gorpcore 风格', '邀请入会，引导关注社群'] },
  { key: 'seller', label: '销售 Seller', icon: '💰', desc: '精准匹配需求，创造销售业绩', tasks: ['探需求：问对问题，挖真实使用场景', '推产品：匹配场景 + 全套搭配建议', '做演示：邀请试穿，展示核心科技', '促连带：推荐关联单品，提升客单'] },
  { key: 'operator', label: '营运 Operator', icon: '🏪', desc: '守护门店体验，确保运营顺畅', tasks: ['保整洁：店面干净有序，陈列整齐', '助发售：维护秩序，流程顺畅', '管货品：尺码齐全，标签清晰', '促协作：团队配合，互相支持'] },
];

// 每日自检清单
const DAILY_CHECKLIST = [
  { category: '导览', items: ['我今天主动和多少顾客打了招呼、开启了对话？', '我今天向顾客传递了哪些品牌故事或产品亮点？'] },
  { category: '销售', items: ['我今天帮顾客解决了什么真实的户外需求？', '我今天主动推荐了哪些关联产品？UPT够了吗？'] },
  { category: '营运', items: ['我今天负责的区域是否整洁、陈列整齐？', '我今天配合团队完成了什么运营任务？'] },
  { category: '纪律', items: ['我今天准时到岗了吗？工装整洁了吗？'] },
  { category: '成长', items: ['我今天学到了什么新的产品知识或搭配技巧？'] },
];

// ===== Initialize =====
// Global error handler - prevents white screen on data corruption
// P1-7 fix: 放宽触发条件 — 不仅看 children.length===0，还检测当前页面渲染失败或错误内容为空
// _lastRenderOk 已在 Router 定义前声明（避免 TDZ）
window.addEventListener('error', function(e) {
  console.error('[Global Error]', e.message, e.filename + ':' + e.lineno);
  const main = document.getElementById('main-content') || document.querySelector('main');
  if (!main) return;
  // 条件：内容为空，或最近一次渲染失败，或错误发生在 page-content 渲染过程中
  const isEmpty = !main.innerHTML.trim() || (main.children.length === 0);
  const renderFailed = !_lastRenderOk;
  if (isEmpty || renderFailed) {
    main.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">' +
      '<p style="font-size:18px;margin-bottom:12px;">页面加载出错了</p>' +
      '<p style="font-size:14px;">请刷新页面重试，如问题持续请清除浏览器缓存。</p>' +
      '<p style="font-size:12px;color:#999;margin-top:16px;">' + (e.message || 'Unknown error') + '</p></div>';
  }
});

Store.init();

// v86 P1-3: cross-tab cache invalidation — another tab writes to localStorage, this tabs _cache goes stale
window.addEventListener('storage', function(e) {
  if (e.key === Store.KEY) {
    Store._cache = null;  // invalidate; next get() will re-parse from localStorage
  }
});

// v86 P1-2: 启动事件委托
ActionHandler.init();

// v86 P1-1 + P2-1 fix: 启动时自动推导评分月份
// 注意：app.js 执行时 MonthConfig（定义在 pages.js）尚未加载，此分支正常情况下不执行。
// 真正的初始化在 pages.js:5777（MonthConfig 定义之后）。此处保留作为防御性兜底，
// 以防将来脚本加载顺序变化。typeof 守卫保证不会因 MonthConfig 未定义而崩溃。
if (!_scoringMonth && typeof MonthConfig !== 'undefined') {
  _scoringMonth = MonthConfig.getActiveScoringMonth();
}

// P1-6 fix: hashchange 路由 — 支持浏览器前进/后退，并在首次加载时恢复 hash 指定的页面
if (typeof window !== 'undefined') {
  const _validPages = ['dashboard','staff','schedule','doorSchedule','attendance','ratings','performance','support','reviews','handbook','myforms','dataManage'];
  const _parseHash = () => {
    const m = (location.hash || '').match(/^#\/(\w+)/);
    return m ? m[1] : null;
  };
  // 首次加载：如果 URL 带 hash 且是合法页面，切换到该页
  const _initialPage = _parseHash();
  if (_initialPage && _validPages.indexOf(_initialPage) !== -1) {
    Router.current = _initialPage;
  }
  // 监听 hashchange（前进/后退/手动改 URL）
  window.addEventListener('hashchange', function() {
    const page = _parseHash();
    if (page && _validPages.indexOf(page) !== -1 && Router.current !== page) {
      Router.current = page;
      Router.render();
      document.querySelector('.sidebar')?.classList.remove('open');
      document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
  });
}
