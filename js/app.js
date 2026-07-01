/**
 * ========================================
 * 安福路 Salomon 兼职管理系统 - 核心应用逻辑
 * Store + Router + Components
 * ========================================
 */

// ===== Data Store (LocalStorage Persistence) =====
const Store = {
  KEY: 'salomon_parttime_mgmt',

  defaults: {
    staff: [
      // ===== Service Team (门店兼职) =====
      { id: 1, name: '陈昕媛', gender: '女', dept: 'Service Team', joinDate: '2026-01-15', status: 'active', avatar_color: '#3b82f6', availableDays: 29 },
      { id: 2, name: '田佳乐', gender: '男', dept: 'Service Team', joinDate: '2026-02-01', status: 'active', avatar_color: '#8b5cf6', availableDays: 27 },
      { id: 3, name: '迟骋', gender: '男', dept: 'Service Team', joinDate: '2026-01-20', status: 'active', avatar_color: '#ec4899', availableDays: 26 },
      { id: 4, name: '王靳毓', gender: '女', dept: 'Service Team', joinDate: '2026-03-01', status: 'active', avatar_color: '#f59e0b', availableDays: 25 },
      { id: 5, name: '朱凯赟', gender: '男', dept: 'Service Team', joinDate: '2026-02-15', status: 'active', avatar_color: '#10b981', availableDays: 24 },
      { id: 6, name: '孔祥宇', gender: '女', dept: 'Service Team', joinDate: '2026-01-10', status: 'active', avatar_color: '#06b6d4', availableDays: 29 },
      { id: 7, name: '邓奇缘', gender: '男', dept: 'Service Team', joinDate: '2026-03-10', status: 'active', avatar_color: '#f43f5e', availableDays: 28 },
      { id: 8, name: '杨子豪', gender: '男', dept: 'Service Team', joinDate: '2026-02-20', status: 'active', avatar_color: '#6366f1', availableDays: 26 },
      { id: 9, name: '王雅澜', gender: '女', dept: 'Service Team', joinDate: '2026-01-05', status: 'active', avatar_color: '#a855f7', availableDays: 26 },
      { id: 10, name: '李若彤', gender: '女', dept: 'Service Team', joinDate: '2026-02-10', status: 'active', avatar_color: '#14b8a6', availableDays: 30 },
      { id: 11, name: '王龙宇', gender: '男', dept: 'Service Team', joinDate: '2026-04-01', status: 'active', avatar_color: '#eab308', availableDays: 10, note: '19日到30日出差，请假' },
      { id: 12, name: '何秋烨', gender: '女', dept: 'Service Team', joinDate: '2026-03-15', status: 'active', avatar_color: '#f97316', availableDays: 23 },
      { id: 13, name: '龚赟昊', gender: '男', dept: 'Service Team', joinDate: '2026-02-25', status: 'active', avatar_color: '#84cc16', availableDays: 25 },
      // ===== 仓库兼职 =====
      { id: 14, name: '严佳铮', gender: '男', dept: '仓库兼职', joinDate: '2026-03-01', status: 'active', avatar_color: '#22d3ee', availableDays: 7 },
      { id: 15, name: '祖白代', gender: '女', dept: '仓库兼职', joinDate: '2026-01-20', status: 'active', avatar_color: '#fb923c', availableDays: 29 },
      { id: 16, name: '陈广权', gender: '男', dept: '仓库兼职', joinDate: '2026-02-05', status: 'active', avatar_color: '#a78bfa', availableDays: 26 },
      { id: 17, name: '贾长乐', gender: '男', dept: '仓库兼职', joinDate: '2026-03-10', status: 'active', avatar_color: '#f472b6', availableDays: 13 },
      { id: 18, name: '玛依拉', gender: '女', dept: '仓库兼职', joinDate: '2026-02-15', status: 'active', avatar_color: '#34d399', availableDays: 23 },
      { id: 19, name: '梁实秋', gender: '男', dept: '仓库兼职', joinDate: '2026-01-25', status: 'active', avatar_color: '#fbbf24', availableDays: 19 },
    ],

    // 供班数据（多月结构，支持逐日状态+备注）
    // 旧结构 { month, data: { name: { total, unavailable, note } } } 已在 Store.init 中迁移
    availability: {
      currentMonth: '2026-06',
      months: {
        '2026-06': {
          data: {
            '陈昕媛': { total: 27, unavailable: ['6/15', '6/25', '6/26'], note: '', dates: null },
            '田佳乐': { total: 26, unavailable: ['6/1', '6/7', '6/13', '6/15'], note: '', dates: null },
            '迟骋': { total: 26, unavailable: ['6/3', '6/9', '6/16', '6/30'], note: '', dates: null },
            '王靳毓': { total: 25, unavailable: ['6/3', '6/13', '6/14', '6/15', '6/18'], note: '', dates: null },
            '朱凯赟': { total: 24, unavailable: ['6/4', '6/5', '6/9', '6/15', '6/17', '6/30'], note: '', dates: null },
            '孔祥宇': { total: 29, unavailable: ['6/6'], note: '', dates: null },
            '邓奇缘': { total: 28, unavailable: ['6/5', '6/25'], note: '', dates: null },
            '杨子豪': { total: 26, unavailable: ['6/3', '6/11', '6/13', '6/14'], note: '', dates: null },
            '王雅澜': { total: 26, unavailable: ['6/13', '6/14', '6/15', '6/16'], note: '', dates: null },
            '李若彤': { total: 30, unavailable: [], note: '', dates: null },
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
        { time: '10:00-11:00', staff: '陈昕媛' },
        { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '李若彤' },
        { time: '13:00-14:00', staff: '杨子豪' },
        { time: '14:00-15:00', staff: '王靳毓' },
        { time: '15:00-16:00', staff: '陈昕媛' },
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
        { time: '14:00-15:00', staff: '陈昕媛' },
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
        { time: '16:00-17:00', staff: '陈昕媛' },
        { time: '18:00-19:00', staff: '孔祥宇' },
        { time: '19:00-20:00', staff: '朱凯赟' },
        { time: '20:00-21:00', staff: '陈昕媛' },
        { time: '21:00-21:30', staff: '陈昕媛' }
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
        { time: '11:00-12:00', staff: '陈昕媛' },
        { time: '12:00-13:00', staff: '孔祥宇' },
        { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '邓奇缘' },
        { time: '15:00-16:00', staff: '王靳毓' },
        { time: '16:00-17:00', staff: '陈昕媛' },
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
        { time: '12:00-13:00', staff: '陈昕媛' },
        { time: '13:00-14:00', staff: '王靳毓' },
        { time: '14:00-15:00', staff: '田佳乐' },
        { time: '15:00-16:00', staff: '孔祥宇' },
        { time: '16:00-17:00', staff: '李若彤' },
        { time: '17:00-18:00', staff: '陈昕媛' },
        { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '田佳乐' }
      ]},
      { date: '2026-06-12', slots: [
        { time: '10:00-11:00', staff: '何秋烨' },
        { time: '11:00-12:00', staff: '王龙宇' },
        { time: '12:00-13:00', staff: '王龙宇' },
        { time: '13:00-14:00', staff: '陈昕媛' },
        { time: '15:00-16:00', staff: '王雅澜' },
        { time: '16:00-17:00', staff: '何秋烨' },
        { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '陈昕媛' },
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
        { time: '12:00-13:00', staff: '陈昕媛' },
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
        { time: '12:00-13:00', staff: '陈昕媛' },
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
        { time: '14:00-15:00', staff: '陈昕媛' },
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
        { time: '10:00-11:00', staff: '陈昕媛' },
        { time: '11:00-12:00', staff: '田佳乐' },
        { time: '12:00-13:00', staff: '何秋烨' },
        { time: '13:00-14:00', staff: '李若彤' },
        { time: '14:00-15:00', staff: '朱凯赟' },
        { time: '15:00-16:00', staff: '杨子豪' },
        { time: '16:00-17:00', staff: '陈昕媛' },
        { time: '17:00-18:00', staff: '田佳乐' },
        { time: '18:00-19:00', staff: '何秋烨' },
        { time: '19:00-20:00', staff: '李若彤' },
        { time: '20:00-21:00', staff: '朱凯赟' }
      ]},
      { date: '2026-06-24', slots: [
        { time: '10:00-11:00', staff: '田佳乐' },
        { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '迟骋' },
        { time: '13:00-14:00', staff: '陈昕媛' },
        { time: '14:00-15:00', staff: '王雅澜' },
        { time: '15:00-16:00', staff: '朱凯赟' },
        { time: '16:00-17:00', staff: '田佳乐' },
        { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '迟骋' },
        { time: '19:00-20:00', staff: '陈昕媛' },
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
        { time: '17:00-18:00', staff: '陈昕媛' },
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
      { id: 4, staff: '陈昕媛', date: '2026-06-02', type: '货品-查鞋盒', duration: '0.5小时', detail: '货架5-1、5-2' },
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
      { id: 22, staff: '陈昕媛', date: '2026-06-09', type: '货品-整理仓库', duration: '1.5小时', detail: '盘点鞋花' },
      { id: 23, staff: '陈昕媛', date: '2026-06-09', type: '货品-查鞋盒', duration: '0.5小时', detail: '2号货架' },
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
      { id: 37, staff: '陈昕媛', date: '2026-06-13', type: '货品-整理仓库', duration: '0.5小时', detail: '整理1.5内舱' },
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
      { id: 80, staff: '陈昕媛', date: '2026-06-24', type: '货品-辅助收货', duration: '0.5小时', detail: '收货贴标签' },
      { id: 81, staff: '王靳毓', date: '2026-06-25', type: '陈列-翻场支援', duration: '0.5小时', detail: '陈列熨烫 衣服归仓' },
      { id: 82, staff: '龚赟昊', date: '2026-06-25', type: '陈列-新品熨烫', duration: '1.5小时', detail: '拆包装 烫衣服' },
      { id: 83, staff: '田佳乐', date: '2026-06-25', type: '陈列-翻场支援', duration: '0.5小时', detail: '补货品调陈列' },
      { id: 84, staff: '孔祥宇', date: '2026-06-26', type: '货品-整理仓库', duration: '1.5小时', detail: '叠归陈列退下来的衣服' },
      { id: 85, staff: '王雅澜', date: '2026-06-26', type: '陈列-翻场支援', duration: '0.4小时', detail: '叠陈列衣服' },
      { id: 86, staff: '朱凯赟', date: '2026-06-27', type: '货品-查鞋盒', duration: '1小时', detail: '查鞋盒理尺码26和地面' },
      { id: 87, staff: '田佳乐', date: '2026-06-27', type: '陈列-翻场支援', duration: '0.5小时', detail: '叠陈列整理内仓' },
      { id: 88, staff: '邓奇缘', date: '2026-06-27', type: '货品-整理仓库', duration: '0.5小时', detail: '贴袜子价签' },
      { id: 89, staff: '田佳乐', date: '2026-06-28', type: '陈列-新品熨烫', duration: '0.5小时', detail: '出样熨烫' },
      { id: 90, staff: '陈昕媛', date: '2026-06-28', type: '货品-整理仓库', duration: '0.5小时', detail: '整理仓库' },
      { id: 91, staff: '王雅澜', date: '2026-06-28', type: '货品-查鞋盒', duration: '1小时', detail: '查鞋盒' }
    ],

    // 换班统计（缺卡/迟到/旷工已改为从灵工打卡动态计算，门迎/点评已移至各自模块）
                staffStats: {
      '陈昕媛': { doorCount: 20, shiftChange: 0, shiftedCount: 0 },
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
    { "id": 101, "staffId": 1, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 },
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
    { "id": 113, "staffId": 13, "month": "2026-07", scores: { availability: 5, performance: 0, behavior: 0, attendance: 5, customerReview: 1 }, comment: "7月待评", avgScore: 0, hourlyRate: 28 }
    ],



        // 灵工打卡考勤数据（从 scripts/fetch_linggong.js 自动拉取）
linggongAttendance: {
      lastSync: new Date().toISOString(),
      records: [
        { "name": "何秋烨", "date": "2026-06-01", "signIn": "07:27", "signOut": "09:31", "status": "打卡正常", "totalHours": "2" },
        { "name": "孔祥宇", "date": "2026-06-01", "signIn": "07:26", "signOut": "09:32", "status": "打卡正常", "totalHours": "2" },
        { "name": "朱凯赟", "date": "2026-06-01", "signIn": "07:23", "signOut": "09:31", "status": "打卡正常", "totalHours": "2" },
        { "name": "李若彤", "date": "2026-06-01", "signIn": "11:09", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "杨子豪", "date": "2026-06-01", "signIn": "09:31", "signOut": "21:07", "status": "打卡正常", "totalHours": "8" },
        { "name": "梁实秋", "date": "2026-06-01", "signIn": "11:19", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-01", "signIn": "06:59", "signOut": "09:33", "status": "打卡正常", "totalHours": "2" },
        { "name": "王靳毓", "date": "2026-06-01", "signIn": "11:56", "signOut": "21:34", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-01", "signIn": "07:24", "signOut": "09:37", "status": "打卡正常", "totalHours": "2" },
        { "name": "田佳乐", "date": "2026-06-01", "signIn": "07:24", "signOut": "09:44", "status": "打卡正常", "totalHours": "2" },
        { "name": "迟骋", "date": "2026-06-01", "signIn": "07:23", "signOut": "09:35", "status": "打卡正常", "totalHours": "2" },
        { "name": "邓奇缘", "date": "2026-06-01", "signIn": "07:25", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-01", "signIn": "11:00", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-01", "signIn": "09:38", "signOut": "18:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-02", "signIn": "09:00", "signOut": "13:00", "status": "打卡正常", "totalHours": "4" },
        { "name": "孔祥宇", "date": "2026-06-02", "signIn": "10:27", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-02", "signIn": "12:08", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-02", "signIn": "11:16", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-02", "signIn": "取消", "signOut": "取消", "status": "取消", "totalHours": "0" },
        { "name": "田佳乐", "date": "2026-06-02", "signIn": "09:58", "signOut": "16:37", "status": "打卡正常", "totalHours": "6" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-02", "signIn": "10:48", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-02", "signIn": "08:55", "signOut": "17:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-02", "signIn": "12:51", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-03", "signIn": "09:52", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-03", "signIn": "10:24", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-03", "signIn": "09:00", "signOut": "17:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "梁实秋", "date": "2026-06-03", "signIn": "10:57", "signOut": "20:01", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-03", "signIn": "11:57", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-03", "signIn": "11:23", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "田佳乐", "date": "2026-06-03", "signIn": "12:56", "signOut": "21:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-03", "signIn": "11:25", "signOut": "20:34", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-03", "signIn": "09:00", "signOut": "15:00", "status": "打卡正常", "totalHours": "6" },
        { "name": "杨子豪", "date": "2026-06-04", "signIn": "11:16", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-04", "signIn": "10:51", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-04", "signIn": "10:13", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-04", "signIn": "12:56", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-04", "signIn": "12:13", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-04", "signIn": "11:21", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-04", "signIn": "09:56", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-05", "signIn": "17:24", "signOut": "21:16", "status": "打卡正常", "totalHours": "3.5" },
        { "name": "孔祥宇", "date": "2026-06-05", "signIn": "17:25", "signOut": "21:15", "status": "打卡正常", "totalHours": "3.5" },
        { "name": "杨子豪", "date": "2026-06-05", "signIn": "09:48", "signOut": "20:01", "status": "打卡正常", "totalHours": "9.5" },
        { "name": "王雅澜", "date": "2026-06-05", "signIn": "17:01", "signOut": "21:15", "status": "打卡正常", "totalHours": "3.5" },
        { "name": "迟骋", "date": "2026-06-05", "signIn": "17:03", "signOut": "23:04", "status": "打卡正常", "totalHours": "5.5" },
        { "name": "陈昕媛", "date": "2026-06-05", "signIn": "09:57", "signOut": "20:02", "status": "打卡正常", "totalHours": "9.5" },
        { "name": "龚赟昊", "date": "2026-06-05", "signIn": "17:17", "signOut": "23:05", "status": "打卡正常", "totalHours": "5.5" },
        { "name": "严佳铮", "date": "2026-06-06", "signIn": "10:19", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "何秋烨", "date": "2026-06-06", "signIn": "12:57", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-06", "signIn": "12:10", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-06", "signIn": "取消", "signOut": "取消", "status": "取消", "totalHours": "0" },
        { "name": "王雅澜", "date": "2026-06-06", "signIn": "10:42", "signOut": "20:20", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-06", "signIn": "11:26", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "贾长乐", "date": "2026-06-06", "signIn": "11:18", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-06", "signIn": "12:13", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-06", "signIn": "11:00", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-06", "signIn": "09:42", "signOut": "18:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "严佳铮", "date": "2026-06-07", "signIn": "10:22", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "孔祥宇", "date": "2026-06-07", "signIn": "10:57", "signOut": "19:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-07", "signIn": "11:20", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "李若彤", "date": "2026-06-07", "signIn": "12:14", "signOut": "21:05", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-07", "signIn": "10:19", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-07", "signIn": "11:16", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "贾长乐", "date": "2026-06-07", "signIn": "10:42", "signOut": "20:02", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "邓奇缘", "date": "2026-06-07", "signIn": "12:07", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-07", "signIn": "12:57", "signOut": "21:39", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-07", "signIn": "09:57", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-08", "signIn": "12:58", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-08", "signIn": "10:11", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-08", "signIn": "10:00", "signOut": "18:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-08", "signIn": "12:17", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-08", "signIn": "11:26", "signOut": "20:34", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-08", "signIn": "12:14", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-08", "signIn": "10:30", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-09", "signIn": "11:29", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-09", "signIn": "11:52", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-09", "signIn": "09:47", "signOut": "18:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-09", "signIn": "19:48", "signOut": "次日02:46", "status": "打卡正常", "totalHours": "6" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-09", "signIn": "缺卡", "signOut": "缺卡", "status": "缺勤", "totalHours": "0" },
        { "name": "贾长乐", "date": "2026-06-09", "signIn": "12:18", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-09", "signIn": "12:58", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-09", "signIn": "17:00", "signOut": "次日02:45", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-09", "signIn": "10:20", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-10", "signIn": "11:21", "signOut": "20:34", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "朱凯赟", "date": "2026-06-10", "signIn": "12:51", "signOut": "21:38", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-10", "signIn": "11:45", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-10", "signIn": "10:45", "signOut": "19:00", "status": "打卡异常", "totalHours": "7.5" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-10", "signIn": "12:19", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-10", "signIn": "10:15", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-10", "signIn": "09:55", "signOut": "18:41", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-11", "signIn": "09:57", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-11", "signIn": "10:32", "signOut": "19:00", "status": "打卡异常", "totalHours": "7.5" },
        { "name": "梁实秋", "date": "2026-06-11", "signIn": "10:17", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-11", "signIn": "11:57", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-11", "signIn": "12:54", "signOut": "21:38", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-11", "signIn": "12:12", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-11", "signIn": "11:15", "signOut": "20:50", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "何秋烨", "date": "2026-06-12", "signIn": "09:58", "signOut": "18:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-12", "signIn": "11:15", "signOut": "20:34", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-12", "signIn": "12:19", "signOut": "21:06", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-12", "signIn": "11:43", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-12", "signIn": "10:24", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-12", "signIn": "10:20", "signOut": "19:04", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-12", "signIn": "12:52", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-12", "signIn": "10:42", "signOut": "19:44", "status": "打卡正常", "totalHours": "8" },
        { "name": "严佳铮", "date": "2026-06-13", "signIn": "10:28", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "孔祥宇", "date": "2026-06-13", "signIn": "12:55", "signOut": "21:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-13", "signIn": "11:00", "signOut": "19:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-13", "signIn": "12:10", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-13", "signIn": "11:14", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-13", "signIn": "09:59", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-13", "signIn": "11:28", "signOut": "20:34", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈广权", "date": "2026-06-13", "signIn": "11:00", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-13", "signIn": "11:54", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-13", "signIn": "09:57", "signOut": "18:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "严佳铮", "date": "2026-06-14", "signIn": "取消", "signOut": "取消", "status": "取消", "totalHours": "0" },
        { "name": "孔祥宇", "date": "2026-06-14", "signIn": "12:12", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-14", "signIn": "09:53", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-14", "signIn": "11:27", "signOut": "20:08", "status": "打卡正常", "totalHours": "8" },
        { "name": "梁实秋", "date": "2026-06-14", "signIn": "11:11", "signOut": "20:05", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-14", "signIn": "10:51", "signOut": "19:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-14", "signIn": "10:53", "signOut": "19:36", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-14", "signIn": "10:48", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-14", "signIn": "09:53", "signOut": "19:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-14", "signIn": "11:25", "signOut": "20:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-14", "signIn": "12:53", "signOut": "21:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-15", "signIn": "10:24", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-15", "signIn": "12:12", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-15", "signIn": "11:19", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-15", "signIn": "12:14", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-15", "signIn": "09:56", "signOut": "18:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "迟骋", "date": "2026-06-15", "signIn": "12:56", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-15", "signIn": "11:28", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈广权", "date": "2026-06-15", "signIn": "10:30", "signOut": "18:00", "status": "打卡异常", "totalHours": "7" },
        { "name": "何秋烨", "date": "2026-06-16", "signIn": "09:56", "signOut": "18:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-16", "signIn": "12:57", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-16", "signIn": "10:32", "signOut": "19:01", "status": "打卡异常", "totalHours": "7.5" },
        { "name": "邓奇缘", "date": "2026-06-16", "signIn": "10:19", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-16", "signIn": "12:30", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-16", "signIn": "11:44", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-16", "signIn": "11:24", "signOut": "20:35", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "孔祥宇", "date": "2026-06-17", "signIn": "09:55", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-17", "signIn": "11:16", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-17", "signIn": "12:16", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-17", "signIn": "10:17", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王龙宇", "date": "2026-06-17", "signIn": "12:06", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-17", "signIn": "10:57", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "田佳乐", "date": "2026-06-17", "signIn": "12:57", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-17", "signIn": "10:17", "signOut": "19:02", "status": "打卡正常", "totalHours": "7" },
        { "name": "朱凯赟", "date": "2026-06-18", "signIn": "12:48", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-18", "signIn": "11:27", "signOut": "20:35", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-18", "signIn": "11:59", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-18", "signIn": "10:07", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-18", "signIn": "10:30", "signOut": "19:06", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-18", "signIn": "12:14", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "迟骋", "date": "2026-06-18", "signIn": "11:20", "signOut": "18:30", "status": "打卡异常", "totalHours": "6.5" },
        { "name": "邓奇缘", "date": "2026-06-18", "signIn": "10:57", "signOut": "19:00", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "严佳铮", "date": "2026-06-19", "signIn": "10:22", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "何秋烨", "date": "2026-06-19", "signIn": "12:07", "signOut": "21:03", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-19", "signIn": "10:23", "signOut": "19:06", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-19", "signIn": "12:59", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-19", "signIn": "11:16", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-19", "signIn": "10:23", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-19", "signIn": "10:58", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王靳毓", "date": "2026-06-19", "signIn": "12:53", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-19", "signIn": "12:09", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-19", "signIn": "09:51", "signOut": "18:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-19", "signIn": "11:00", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-19", "signIn": "10:46", "signOut": "19:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-19", "signIn": "12:11", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "严佳铮", "date": "2026-06-20", "signIn": "10:27", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "何秋烨", "date": "2026-06-20", "signIn": "12:52", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-20", "signIn": "10:52", "signOut": "19:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-20", "signIn": "12:14", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-20", "signIn": "12:09", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "梁实秋", "date": "2026-06-20", "signIn": "12:09", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-20", "signIn": "11:13", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "田佳乐", "date": "2026-06-20", "signIn": "09:56", "signOut": "18:38", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-20", "signIn": "10:45", "signOut": "20:00", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-20", "signIn": "10:52", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-20", "signIn": "10:29", "signOut": "19:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-20", "signIn": "09:54", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-21", "signIn": "10:25", "signOut": "19:04", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-21", "signIn": "11:25", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "杨子豪", "date": "2026-06-21", "signIn": "13:20", "signOut": "22:03", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-21", "signIn": "10:44", "signOut": "19:47", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-21", "signIn": "12:01", "signOut": "21:23", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-21", "signIn": "10:26", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-21", "signIn": "12:12", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "迟骋", "date": "2026-06-21", "signIn": "09:59", "signOut": "17:30", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "陈广权", "date": "2026-06-21", "signIn": "11:00", "signOut": "20:03", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈昕媛", "date": "2026-06-21", "signIn": "12:01", "signOut": "17:05", "status": "打卡正常", "totalHours": "4.5" },
        { "name": "龚赟昊", "date": "2026-06-21", "signIn": "12:57", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-22", "signIn": "12:13", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-22", "signIn": "10:27", "signOut": "17:08", "status": "打卡正常", "totalHours": "6.5" },
        { "name": "王靳毓", "date": "2026-06-22", "signIn": "09:42", "signOut": "16:35", "status": "打卡正常", "totalHours": "6.5" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-22", "signIn": "11:52", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-22", "signIn": "10:08", "signOut": "17:30", "status": "打卡正常", "totalHours": "7" },
        { "name": "迟骋", "date": "2026-06-22", "signIn": "12:13", "signOut": "20:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-22", "signIn": "12:57", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-22", "signIn": "11:28", "signOut": "19:34", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-23", "signIn": "11:27", "signOut": "20:32", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "朱凯赟", "date": "2026-06-23", "signIn": "12:00", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-23", "signIn": "12:10", "signOut": "21:03", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-23", "signIn": "12:51", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-23", "signIn": "10:28", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-23", "signIn": "12:21", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-23", "signIn": "10:30", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-23", "signIn": "09:58", "signOut": "18:34", "status": "打卡正常", "totalHours": "8" },
        { "name": "朱凯赟", "date": "2026-06-24", "signIn": "12:51", "signOut": "21:32", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-24", "signIn": "11:48", "signOut": "21:05", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-24", "signIn": "10:28", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-24", "signIn": "09:59", "signOut": "18:36", "status": "打卡正常", "totalHours": "8" },
        { "name": "迟骋", "date": "2026-06-24", "signIn": "10:59", "signOut": "19:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-24", "signIn": "10:29", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-24", "signIn": "12:30", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-24", "signIn": "11:28", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "孔祥宇", "date": "2026-06-25", "signIn": "12:12", "signOut": "21:09", "status": "打卡正常", "totalHours": "8" },
        { "name": "李若彤", "date": "2026-06-25", "signIn": "11:29", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "杨子豪", "date": "2026-06-25", "signIn": "11:17", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-25", "signIn": "09:44", "signOut": "17:03", "status": "打卡正常", "totalHours": "7" },
        { "name": "王靳毓", "date": "2026-06-25", "signIn": "10:16", "signOut": "17:01", "status": "打卡正常", "totalHours": "6.5" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-25", "signIn": "12:12", "signOut": "21:03", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-25", "signIn": "12:51", "signOut": "21:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-25", "signIn": "10:11", "signOut": "19:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-25", "signIn": "12:09", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-26", "signIn": "09:53", "signOut": "17:01", "status": "打卡正常", "totalHours": "7" },
        { "name": "李若彤", "date": "2026-06-26", "signIn": "12:52", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-26", "signIn": "10:18", "signOut": "17:02", "status": "打卡正常", "totalHours": "6.5" },
        { "name": "梁实秋", "date": "2026-06-26", "signIn": "10:20", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-26", "signIn": "11:19", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-26", "signIn": "12:47", "signOut": "22:17", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-26", "signIn": "12:55", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-26", "signIn": "11:16", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "龚赟昊", "date": "2026-06-26", "signIn": "12:10", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-27", "signIn": "10:27", "signOut": "18:02", "status": "打卡正常", "totalHours": "7" },
        { "name": "孔祥宇", "date": "2026-06-27", "signIn": "10:54", "signOut": "19:17", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "朱凯赟", "date": "2026-06-27", "signIn": "09:58", "signOut": "18:02", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "杨子豪", "date": "2026-06-27", "signIn": "11:21", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "梁实秋", "date": "2026-06-27", "signIn": "12:52", "signOut": "21:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-27", "signIn": "11:46", "signOut": "21:02", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-27", "signIn": "12:55", "signOut": "21:33", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-27", "signIn": "11:21", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "迟骋", "date": "2026-06-27", "signIn": "11:21", "signOut": "19:33", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "邓奇缘", "date": "2026-06-27", "signIn": "12:14", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-27", "signIn": "10:30", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈昕媛", "date": "2026-06-27", "signIn": "10:51", "signOut": "19:14", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "严佳铮", "date": "2026-06-28", "signIn": "10:23", "signOut": "21:30", "status": "打卡正常", "totalHours": "10" },
        { "name": "朱凯赟", "date": "2026-06-28", "signIn": "10:56", "signOut": "18:00", "status": "打卡正常", "totalHours": "7" },
        { "name": "李若彤", "date": "2026-06-28", "signIn": "12:13", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "梁实秋", "date": "2026-06-28", "signIn": "11:22", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "王雅澜", "date": "2026-06-28", "signIn": "10:45", "signOut": "19:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-28", "signIn": "11:16", "signOut": "17:30", "status": "打卡正常", "totalHours": "6" },
        { "name": "田佳乐", "date": "2026-06-28", "signIn": "10:27", "signOut": "17:33", "status": "打卡正常", "totalHours": "7" },
        { "name": "迟骋", "date": "2026-06-28", "signIn": "12:55", "signOut": "21:31", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-28", "signIn": "11:26", "signOut": "20:30", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "陈广权", "date": "2026-06-28", "signIn": "16:30", "signOut": "21:00", "status": "打卡正常", "totalHours": "4.5" },
        { "name": "陈昕媛", "date": "2026-06-28", "signIn": "09:57", "signOut": "17:05", "status": "打卡正常", "totalHours": "7" },
        { "name": "龚赟昊", "date": "2026-06-28", "signIn": "12:58", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "孔祥宇", "date": "2026-06-29", "signIn": "09:56", "signOut": "18:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "杨子豪", "date": "2026-06-29", "signIn": "12:51", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "王雅澜", "date": "2026-06-29", "signIn": "11:15", "signOut": "20:31", "status": "打卡正常", "totalHours": "8.5" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-29", "signIn": "10:26", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "祖白代·阿不利孜", "date": "2026-06-29", "signIn": "12:19", "signOut": "21:03", "status": "打卡正常", "totalHours": "8" },
        { "name": "贾长乐", "date": "2026-06-29", "signIn": "10:19", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "邓奇缘", "date": "2026-06-29", "signIn": "10:26", "signOut": "19:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "龚赟昊", "date": "2026-06-29", "signIn": "12:15", "signOut": "21:01", "status": "打卡正常", "totalHours": "8" },
        { "name": "何秋烨", "date": "2026-06-30", "signIn": "11:23", "signOut": "19:04", "status": "打卡正常", "totalHours": "7.5" },
        { "name": "孔祥宇", "date": "2026-06-30", "signIn": "10:27", "signOut": "15:00", "status": "打卡正常", "totalHours": "4.5" },
        { "name": "李若彤", "date": "2026-06-30", "signIn": "10:01", "signOut": "15:00", "status": "打卡异常", "totalHours": "4.5" },
        { "name": "梁实秋", "date": "2026-06-30", "signIn": "12:24", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "王靳毓", "date": "2026-06-30", "signIn": "12:49", "signOut": "21:30", "status": "打卡正常", "totalHours": "8" },
        { "name": "玛依拉·努尔夏提", "date": "2026-06-30", "signIn": "12:11", "signOut": "21:00", "status": "打卡正常", "totalHours": "8" },
        { "name": "田佳乐", "date": "2026-06-30", "signIn": "12:12", "signOut": "21:21", "status": "打卡正常", "totalHours": "8" },
        { "name": "陈广权", "date": "2026-06-30", "signIn": "10:30", "signOut": "15:00", "status": "打卡正常", "totalHours": "4.5" }
      ]
    },

        performanceData: {
      april: {
        month: '2026-04',
        totalSales: 407876,
        avgHourlyOutput: 285.98,
        records: [
          { name: '龚赟昊', sales: 55736, salesShare: 0.1366, workHours: 114.5, hourlyOutput: 486.78 },
          { name: '陈昕媛', sales: 53428, salesShare: 0.1310, workHours: 84, hourlyOutput: 636.05 },
          { name: '何秋烨', sales: 43268, salesShare: 0.1061, workHours: 80, hourlyOutput: 540.85 },
          { name: '李若彤', sales: 41488, salesShare: 0.1017, workHours: 122, hourlyOutput: 340.07 },
          { name: '田佳乐', sales: 34148, salesShare: 0.0837, workHours: 110.5, hourlyOutput: 309.03 },
          { name: '徐思懿', sales: 32868, salesShare: 0.0806, workHours: 96, hourlyOutput: 342.38 },
          { name: '邓奇缘', sales: 32208, salesShare: 0.0790, workHours: 138, hourlyOutput: 233.39 },
          { name: '朱凯赟', sales: 24958, salesShare: 0.0612, workHours: 105, hourlyOutput: 237.70 },
          { name: '孔祥宇', sales: 23652, salesShare: 0.0580, workHours: 130, hourlyOutput: 181.94 },
          { name: '迟骋', sales: 21132, salesShare: 0.0518, workHours: 109.5, hourlyOutput: 192.99 },
          { name: '王龙宇', sales: 17074, salesShare: 0.0419, workHours: 80, hourlyOutput: 213.43 },
          { name: '杨子豪', sales: 13338, salesShare: 0.0327, workHours: 83.5, hourlyOutput: 159.74 },
          { name: '王雅澜', sales: 7588, salesShare: 0.0186, workHours: 99.5, hourlyOutput: 76.26 },
          { name: '王靳毓', sales: 6990, salesShare: 0.0171, workHours: 131.5, hourlyOutput: 53.16 },
        ]
      },
      may: {
        month: '2026-05',
        totalSales: 440577,
        avgUPT: 1.27,
        avgHourlyOutput: 281.34,
        records: [
          { name: '李若彤', sales: 61848, salesShare: 0.1404, workHours: 143, hourlyOutput: 432.50 },
          { name: '陈昕媛', sales: 60276, salesShare: 0.1368, workHours: 138.5, hourlyOutput: 435.21 },
          { name: '何秋烨', sales: 58358, salesShare: 0.1325, workHours: 120.5, hourlyOutput: 484.30 },
          { name: '杨子豪', sales: 39398, salesShare: 0.0894, workHours: 120, hourlyOutput: 328.32 },
          { name: '邓奇缘', sales: 38528, salesShare: 0.0874, workHours: 141.5, hourlyOutput: 272.28 },
          { name: '龚赟昊', sales: 36192, salesShare: 0.0821, workHours: 120, hourlyOutput: 301.60 },
          { name: '朱凯赟', sales: 32860, salesShare: 0.0746, workHours: 89, hourlyOutput: 369.21 },
          { name: '田佳乐', sales: 29979, salesShare: 0.0680, workHours: 107, hourlyOutput: 280.18 },
          { name: '王龙宇', sales: 25258, salesShare: 0.0573, workHours: 110.5, hourlyOutput: 228.58 },
          { name: '迟骋', sales: 19868, salesShare: 0.0451, workHours: 112.5, hourlyOutput: 176.60 },
          { name: '王雅澜', sales: 16648, salesShare: 0.0378, workHours: 120, hourlyOutput: 138.73 },
          { name: '孔祥宇', sales: 13476, salesShare: 0.0306, workHours: 112, hourlyOutput: 120.32 },
          { name: '王靳毓', sales: 7888, salesShare: 0.0179, workHours: 88, hourlyOutput: 89.64 },
        ]
      },
            june: {
        totalSales: 293250,
        avgUPT: 1.36,
        avgHourlyOutput: 193.3,
        records: [
          {
            name: "杨子豪",
            sales: 35502,
            qty: 29,
            tickets: 22,
            upt: 1.32,
            avgPrice: 1224,
            workHours: 123.5,
            workDays: 15,
            hourlyOutput: 287.5,
            salesShare: 0.121,
            categories: "鞋履 93.0% / 服装 6.7% / 配件 0.3%"
          },
          {
            name: "陈昕媛",
            sales: 34360,
            qty: 28,
            tickets: 26,
            upt: 1.08,
            avgPrice: 1227,
            workHours: 139.5,
            workDays: 18,
            hourlyOutput: 246.3,
            salesShare: 0.117,
            categories: "鞋履 85.4% / 服装 8.5% / 配件 6.2%"
          },
          {
            name: "王雅澜",
            sales: 33466,
            qty: 27,
            tickets: 22,
            upt: 1.23,
            avgPrice: 1239,
            workHours: 118,
            workDays: 16,
            hourlyOutput: 283.6,
            salesShare: 0.114,
            categories: "鞋履 86.5% / 服装 11.3% / 配件 2.1%"
          },
          {
            name: "李若彤",
            sales: 32500,
            qty: 31,
            tickets: 23,
            upt: 1.35,
            avgPrice: 1048,
            workHours: 133.5,
            workDays: 17,
            hourlyOutput: 243.4,
            salesShare: 0.111,
            categories: "鞋履 84.4% / 服装 9.2% / 配件 6.4%"
          },
          {
            name: "王靳毓",
            sales: 26228,
            qty: 22,
            tickets: 15,
            upt: 1.47,
            avgPrice: 1192,
            workHours: 115.5,
            workDays: 15,
            hourlyOutput: 227.1,
            salesShare: 0.089,
            categories: "鞋履 77.7% / 服装 18.3% / 配件 4.1%"
          },
          {
            name: "龚赟昊",
            sales: 25858,
            qty: 24,
            tickets: 21,
            upt: 1.14,
            avgPrice: 1077,
            workHours: 118,
            workDays: 15,
            hourlyOutput: 219.1,
            salesShare: 0.088,
            categories: "鞋履 83.8% / 服装 13.3% / 配件 2.9%"
          },
          {
            name: "孔祥宇",
            sales: 22959,
            qty: 23,
            tickets: 13,
            upt: 1.77,
            avgPrice: 998,
            workHours: 127.5,
            workDays: 18,
            hourlyOutput: 180.1,
            salesShare: 0.078,
            categories: "鞋履 64.3% / 服装 35.7%"
          },
          {
            name: "何秋烨",
            sales: 19536,
            qty: 23,
            tickets: 13,
            upt: 1.77,
            avgPrice: 849,
            workHours: 105,
            workDays: 15,
            hourlyOutput: 186.1,
            salesShare: 0.067,
            categories: "鞋履 69.4% / 服装 22.9% / 配件 7.7%"
          },
          {
            name: "朱凯赟",
            sales: 16856,
            qty: 18,
            tickets: 12,
            upt: 1.50,
            avgPrice: 936,
            workHours: 105.5,
            workDays: 14,
            hourlyOutput: 159.8,
            salesShare: 0.057,
            categories: "鞋履 60.0% / 服装 39.0% / 配件 1.1%"
          },
          {
            name: "邓奇缘",
            sales: 16005,
            qty: 15,
            tickets: 12,
            upt: 1.25,
            avgPrice: 1067,
            workHours: 137.5,
            workDays: 17,
            hourlyOutput: 116.4,
            salesShare: 0.055,
            categories: "鞋履 90.7% / 服装 8.1% / 配件 1.2%"
          },
          {
            name: "迟骋",
            sales: 15586,
            qty: 17,
            tickets: 8,
            upt: 2.12,
            avgPrice: 916,
            workHours: 109.5,
            workDays: 15,
            hourlyOutput: 142.3,
            salesShare: 0.053,
            categories: "鞋履 67.3% / 服装 23.0% / 配件 9.7%"
          },
          {
            name: "田佳乐",
            sales: 8944,
            qty: 8,
            tickets: 7,
            upt: 1.14,
            avgPrice: 1118,
            workHours: 125.5,
            workDays: 17,
            hourlyOutput: 71.3,
            salesShare: 0.030,
            categories: "鞋履 86.0% / 服装 8.9% / 配件 5.1%"
          },
          {
            name: "王龙宇",
            sales: 5450,
            qty: 5,
            tickets: 4,
            upt: 1.25,
            avgPrice: 1090,
            workHours: 58.5,
            workDays: 8,
            hourlyOutput: 93.2,
            salesShare: 0.019,
            categories: "鞋履 93.4% / 配件 6.6%"
          },
        ]
      },

      // ===== 7月数据（空白模板，随月度更新录入） =====
      july: {
        month: '2026-07',
        totalSales: 0,
        avgUPT: 0,
        avgHourlyOutput: 0,
        records: []
      },

    },

    // 顾客好评记录（大众点评5星好评）
    customerReviews: [
      { id: 1, staffName: '陈昕媛', month: '2026-06', rating: 5, reviewDate: '2026-06-16', snippet: '逛街看到小白楼进来逛逛，Kelly的导览非常详细，带我了解到了很多新的活动和品牌历史，对Salomon有了新的了解。', keywords: ['导览详细', '品牌历史', '新活动', '超预期'], source: '大众点评（陆慧，Lv4）' },
      { id: 2, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '店门口很适合拍照，店员都好帅。那天碰到一个小哥态度很好很和善，问他说是叫CC，下次还找他服务。', keywords: ['态度好', '和善', '适合拍照', '下次还找'], source: '大众点评（煤球斯基，Lv1）' },
      { id: 3, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '本次购物体验很棒，导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 4, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，小朱帮忙挑选也很用心，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 5, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，没有半点推销感。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '无推销感'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 6, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，服务贴心周到。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '贴心周到'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 7, staffName: '李若彤', month: '2026-06', rating: 5, reviewDate: '2026-06-20', snippet: '买了两双安福路店限定whisper，来上海旅游的目的就是这两双，店员好亲切，进来了两次，第一次试穿店员并不会因为我来试试而置之不理，非常惊讶。特别点名小和，非常非常非常用心！', keywords: ['服务态度好', '热情亲切', '耐心接待', '小和用心', '购买转化'], source: '大众点评（匿名用户，Lv2）' },
      { id: 8, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-21', snippet: '来Salomon安福路店逛街，CC接待的我，人特别热情，讲鞋子都讲得很细，耐心跟我说各个款式的区别，选鞋给的建议也很实在，逛着很舒服，体验挺好的～', keywords: ['热情', '讲解细致', '耐心介绍', '建议实在', '体验好'], source: '大众点评（勇善可爱的小柔，Lv1）' },
      { id: 9, staffName: '杨子豪', month: '2026-06', rating: 5, reviewDate: '2026-06-26', snippet: '第一次光临很愉快的购物体验，子豪很热情，耐心介绍产品，非常专业，店内环境也很好，有空再来逛一逛。', keywords: ['热情', '耐心介绍', '非常专业', '店内环境好'], source: '大众点评（匿名用户，Lv2）' },
      { id: 10, staffName: '杨子豪', month: '2026-06', rating: 5, reviewDate: '2026-06-26', snippet: '门店环境很好，一进门导购非常热情，店员杨子豪小哥哥耐心的介绍产品，非常贴心拿尺码给我试穿，根据我的需求给我推荐的鞋子，穿起来还蛮舒服的，很用心，也是很愉快的购物体验～', keywords: ['环境很好', '非常热情', '耐心介绍', '贴心拿尺码', '推荐专业', '舒适', '愉快体验'], source: '大众点评（匿名用户，Lv1）' },
    ],

        _dataVersion: '2026-07-02-v10',
  },

  init() {
    try {
      if (!localStorage.getItem(this.KEY)) {
        localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
        return;
      }
      const data = JSON.parse(localStorage.getItem(this.KEY));
      const DATA_VERSION = '2026-07-02-v10';
      const isVersionMismatch = data._dataVersion !== DATA_VERSION;
      const isMissingCritical = !data.ratings || !data.linggongAttendance || !data.performanceData || !data.customerReviews || !data.staff;
      if (isVersionMismatch || isMissingCritical) {
        localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
      }
    } catch (e) {
      console.error('[Store] 数据解析失败，重置为默认值:', e);
      localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
    }
  },

  get(key) {
    try {
      const data = JSON.parse(localStorage.getItem(this.KEY) || '{}');
      return data[key] !== undefined ? data[key] : (this.defaults[key] || []);
    } catch (e) {
      console.error('[Store.get] 读取失败，返回默认值:', key, e);
      return this.defaults[key] || [];
    }
  },

  set(key, value) {
    try {
      const data = JSON.parse(localStorage.getItem(this.KEY) || '{}');
      data[key] = value;
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Store.set] 写入失败:', key, e);
    }
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || JSON.stringify(this.defaults));
    } catch (e) {
      console.error('[Store.getAll] 读取失败，返回默认数据:', e);
      return this.defaults;
    }
  },

  reset() {
    localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
  },

  // Helper: get staff by id
  getStaff(id) {
    return this.get('staff').find(s => s.id === id);
  },

  // Helper: get staff name
  getStaffName(id) {
    const s = this.getStaff(id);
    return s ? s.name : '未知';
  },

  // Helper: next id for a collection
  nextId(collection) {
    const items = this.get(collection);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

// ===== Global scoring month — controls which month's data all rating functions use =====
let _scoringMonth = '2026-06'; // default to latest month with complete data

// ===== Router =====
const Router = {
  current: 'dashboard',

  navigate(page) {
    this.current = page;
    this.render();
    // Close mobile sidebar
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
  },

  render() {
    const content = document.getElementById('page-content');
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
    };

    if (pages[this.current]) {
      try {
        content.innerHTML = pages[this.current]();
        if (this.current === 'dashboard') initDashboardCharts();
      } catch (e) {
        console.error('[App.render] 页面渲染失败:', this.current, e);
        content.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">' +
          '<p style="font-size:16px;margin-bottom:8px;">该页面加载出错</p>' +
          '<p style="font-size:13px;color:#999;">' + (e.message || 'Unknown error') + '</p>' +
          '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;">刷新重试</button></div>';
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
    };
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titles[this.current] || '';
  }
};

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
  toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${message}</span>`;
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
    dates.push(d.toISOString().split('T')[0]);
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
window.addEventListener('error', function(e) {
  console.error('[Global Error]', e.message, e.filename + ':' + e.lineno);
  const main = document.getElementById('main-content') || document.querySelector('main');
  if (main && main.children.length === 0) {
    main.innerHTML = '<div style="padding:40px;text-align:center;color:#666;">' +
      '<p style="font-size:18px;margin-bottom:12px;">页面加载出错了</p>' +
      '<p style="font-size:14px;">请刷新页面重试，如问题持续请清除浏览器缓存。</p>' +
      '<p style="font-size:12px;color:#999;margin-top:16px;">' + (e.message || 'Unknown error') + '</p></div>';
  }
});

Store.init();
