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
      { id: 3, name: '迟骋', gender: '男', dept: 'Service Team', joinDate: '2026-01-20', status: 'active', avatar_color: '#ec4899', availableDays: 28 },
      { id: 4, name: '王靳毓', gender: '女', dept: 'Service Team', joinDate: '2026-03-01', status: 'active', avatar_color: '#f59e0b', availableDays: 25 },
      { id: 5, name: '朱凯赟', gender: '男', dept: 'Service Team', joinDate: '2026-02-15', status: 'active', avatar_color: '#10b981', availableDays: 25 },
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

    // 6月供班数据（从腾讯文档PT供班表导入）
    availability: {
      month: '2026-06',
      data: {
        '陈昕媛': { total: 27, unavailable: ['6/15', '6/25', '6/26'], note: '' },
        '田佳乐': { total: 26, unavailable: ['6/1', '6/7', '6/13', '6/15'], note: '' },
        '迟骋': { total: 27, unavailable: ['6/3', '6/9', '6/16'], note: '' },
        '王靳毓': { total: 25, unavailable: ['6/3', '6/13', '6/14', '6/15', '6/18'], note: '' },
        '朱凯赟': { total: 25, unavailable: ['6/4', '6/5', '6/9', '6/15', '6/17'], note: '' },
        '孔祥宇': { total: 29, unavailable: ['6/6'], note: '' },
        '邓奇缘': { total: 28, unavailable: ['6/5', '6/25'], note: '' },
        '杨子豪': { total: 26, unavailable: ['6/3', '6/11', '6/13', '6/14'], note: '' },
        '王雅澜': { total: 26, unavailable: ['6/13', '6/14', '6/15', '6/16'], note: '' },
        '李若彤': { total: 30, unavailable: [], note: '' },
        '王龙宇': { total: 10, unavailable: ['6/2','6/3','6/7','6/9','6/12','6/13','6/16','6/18','6/19','6/20','6/21','6/22','6/23','6/24','6/25','6/26','6/27','6/28','6/29','6/30'], note: '19日到30日出差，请假' },
        '何秋烨': { total: 23, unavailable: ['6/1', '6/8', '6/9', '6/13', '6/14', '6/15', '6/17'], note: '' },
        '龚赟昊': { total: 25, unavailable: ['6/1', '6/4', '6/8', '6/15', '6/17'], note: '' },
      }
    },

    // 门迎排班数据（6月1日-14日，来源：腾讯文档PT供班）
    doorSchedule: [
      { date: '2026-06-01', slots: [
        { time: '10:00-11:00', staff: '陈昕媛' }, { time: '11:00-12:00', staff: '邓奇缘' },
        { time: '12:00-13:00', staff: '李若彤' }, { time: '13:00-14:00', staff: '杨子豪' },
        { time: '14:00-15:00', staff: '王靳毓' }, { time: '15:00-16:00', staff: '陈昕媛' },
        { time: '16:00-17:00', staff: '邓奇缘' }, { time: '17:00-18:00', staff: '杨子豪' },
        { time: '18:00-19:00', staff: '王靳毓' }, { time: '19:00-20:00', staff: '李若彤' },
      ]},
      { date: '2026-06-02', slots: [
        { time: '10:00-11:00', staff: '田佳乐' }, { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '12:00-13:00', staff: '王靳毓' }, { time: '13:00-14:00', staff: '龚赟昊' },
        { time: '14:00-15:00', staff: '陈昕媛' }, { time: '15:00-16:00', staff: '李若彤' },
        { time: '17:00-18:00', staff: '孔祥宇' }, { time: '18:00-19:00', staff: '王靳毓' },
        { time: '19:00-20:00', staff: '龚赟昊' }, { time: '20:00-21:00', staff: '李若彤' },
      ]},
      { date: '2026-06-03', slots: [
        { time: '10:00-11:00', staff: '何秋烨' }, { time: '11:00-12:00', staff: '朱凯赟' },
        { time: '12:00-13:00', staff: '邓奇缘' }, { time: '13:00-14:00', staff: '王雅澜/何秋烨' },
        { time: '14:00-15:00', staff: '田佳乐' }, { time: '15:00-16:00', staff: '何秋烨' },
        { time: '16:00-17:00', staff: '朱凯赟' }, { time: '17:00-18:00', staff: '邓奇缘' },
        { time: '18:00-19:00', staff: '王雅澜' }, { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '澜/天/佳乐' },
      ]},
      { date: '2026-06-04', slots: [
        { time: '10:00-11:00', staff: '迟骋' }, { time: '11:00-12:00', staff: '王雅澜' },
        { time: '12:00-13:00', staff: '杨子豪' }, { time: '13:00-14:00', staff: '王龙宇' },
        { time: '14:00-15:00', staff: '田佳乐' }, { time: '15:00-16:00', staff: '迟骋' },
        { time: '16:00-17:00', staff: '王雅澜' }, { time: '17:00-18:00', staff: '王龙宇' },
        { time: '18:00-19:00', staff: '田佳乐' }, { time: '19:00-20:00', staff: '杨子豪' },
        { time: '20:00-21:00', staff: '王龙宇/田佳乐' },
      ]},
      { date: '2026-06-05', slots: [] },
      { date: '2026-06-06', slots: [
        { time: '11:00-12:00', staff: '王龙宇' }, { time: '16:00-17:00', staff: '王龙宇' },
        { time: '18:00-19:00', staff: '王雅澜' }, { time: '19:00-20:00', staff: '迟骋' },
        { time: '20:00-21:00', staff: '何秋烨' }, { time: '21:00-21:30', staff: '何秋烨' },
      ]},
      { date: '2026-06-07', slots: [
        { time: '10:00-11:00', staff: '龚赟昊' }, { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '孔祥宇' }, { time: '13:00-14:00', staff: '朱凯赟' },
        { time: '14:00-15:00', staff: '邓奇缘' }, { time: '16:00-17:00', staff: '陈昕媛' },
        { time: '18:00-19:00', staff: '孔祥宇' }, { time: '19:00-20:00', staff: '朱凯赟' },
        { time: '20:00-21:00', staff: '陈昕媛' }, { time: '21:00-21:30', staff: '陈昕媛' },
      ]},
      { date: '2026-06-08', slots: [
        { time: '10:00-11:00', staff: '王龙宇' }, { time: '12:00-13:00', staff: '李若彤' },
        { time: '13:00-14:00', staff: '田佳乐' }, { time: '14:00-15:00', staff: '迟骋' },
        { time: '15:00-16:00', staff: '王龙宇' }, { time: '17:00-18:00', staff: '李若彤' },
        { time: '18:00-19:00', staff: '田佳乐' },
      ]},
      { date: '2026-06-09', slots: [
        { time: '10:00-11:00', staff: '王靳毓' }, { time: '11:00-12:00', staff: '陈昕媛' },
        { time: '12:00-13:00', staff: '孔祥宇' }, { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '邓奇缘' }, { time: '15:00-16:00', staff: '王靳毓' },
        { time: '16:00-17:00', staff: '陈昕媛' }, { time: '17:00-18:00', staff: '孔祥宇' },
        { time: '18:00-19:00', staff: '王雅澜' }, { time: '19:00-20:00', staff: '邓奇缘' },
      ]},
      { date: '2026-06-10', slots: [
        { time: '10:00-11:00', staff: '龚赟昊' }, { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '朱凯赟' }, { time: '13:00-14:00', staff: '王雅澜' },
        { time: '14:00-15:00', staff: '何秋烨' }, { time: '15:00-16:00', staff: '龚赟昊' },
        { time: '16:00-17:00', staff: '王靳毓' }, { time: '17:00-18:00', staff: '何秋烨' },
        { time: '18:00-19:00', staff: '王雅澜' }, { time: '19:00-20:00', staff: '朱凯赟' },
      ]},
      { date: '2026-06-11', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' }, { time: '11:00-12:00', staff: '李若彤' },
        { time: '12:00-13:00', staff: '陈昕媛' }, { time: '13:00-14:00', staff: '王靳毓' },
        { time: '14:00-15:00', staff: '田佳乐' }, { time: '15:00-16:00', staff: '孔祥宇' },
        { time: '16:00-17:00', staff: '李若彤' }, { time: '17:00-18:00', staff: '陈昕媛' },
        { time: '18:00-19:00', staff: '王靳毓' }, { time: '19:00-20:00', staff: '田佳乐' },
        { time: '20:00-21:00', staff: '田佳乐' },
      ]},
      { date: '2026-06-12', slots: [
        { time: '10:00-11:00', staff: '何秋烨' }, { time: '11:00-12:00', staff: '王龙宇' },
        { time: '12:00-13:00', staff: '王龙宇' }, { time: '13:00-14:00', staff: '陈昕媛' },
        { time: '15:00-16:00', staff: '王雅澜' }, { time: '16:00-17:00', staff: '何秋烨' },
        { time: '17:00-18:00', staff: '邓奇缘' }, { time: '18:00-19:00', staff: '陈昕媛' },
        { time: '19:00-20:00', staff: '王雅澜' }, { time: '20:00-21:00', staff: '邓奇缘' },
      ]},
      { date: '2026-06-13', slots: [
        { time: '10:00-11:00', staff: '龚赟昊' }, { time: '11:00-12:00', staff: '迟骋' },
        { time: '12:00-13:00', staff: '朱凯赟' }, { time: '13:00-14:00', staff: '邓奇缘' },
        { time: '14:00-15:00', staff: '陈昕媛' }, { time: '15:00-16:00', staff: '李若彤' },
        { time: '16:00-17:00', staff: '孔祥宇' }, { time: '17:00-18:00', staff: '龚赟昊' },
        { time: '18:00-19:00', staff: '朱凯赟' }, { time: '19:00-20:00', staff: '邓奇缘' },
        { time: '21:00-21:30', staff: '孔祥宇' },
      ]},
      { date: '2026-06-14', slots: [
        { time: '10:00-11:00', staff: '朱凯赟' }, { time: '11:00-12:00', staff: '迟骋' },
        { time: '12:00-13:00', staff: '王龙宇' }, { time: '14:00-15:00', staff: '邓奇缘' },
      ]},
      { date: '2026-06-15', slots: [
        { time: '10:00-11:00', staff: '王龙宇' }, { time: '11:00-12:00', staff: '孔祥宇' },
        { time: '12:00-13:00', staff: '杨子豪' }, { time: '13:00-14:00', staff: '邓奇缘' },
        { time: '14:00-15:00', staff: '李若彤' }, { time: '15:00-16:00', staff: '迟骋' },
      ]},
      { date: '2026-06-16', slots: [
        { time: '11:00-12:00', staff: '邓奇缘' }, { time: '12:00-13:00', staff: '龚赟昊' },
        { time: '13:00-14:00', staff: '陈昕媛' }, { time: '14:00-15:00', staff: '孔祥宇' },
      ]},
      { date: '2026-06-17', slots: [
        { time: '10:00-11:00', staff: '孔祥宇' }, { time: '11:00-12:00', staff: '王靳毓' },
        { time: '12:00-13:00', staff: '杨子豪' }, { time: '13:00-14:00', staff: '王龙宇' },
        { time: '14:00-15:00', staff: '田佳乐' }, { time: '16:00-17:00', staff: '王靳毓' },
        { time: '17:00-18:00', staff: '杨子豪' }, { time: '18:00-19:00', staff: '王龙宇' },
        { time: '19:00-20:00', staff: '田佳乐' },
      ]},
    ],

    // 换班记录
    shiftChanges: [
      { id: 1, applicant: '李若彤', applyDate: '2026-05-30', applicantShift: '6/3 12:15-21:00', target: '王雅澜', targetShift: '6/2 12:15-21:00' },
      { id: 2, applicant: '杨子豪', applyDate: '2026-06-01', applicantShift: '6/7 10:30-19:00', target: '王靳毓', targetShift: '6/4 11:30-20:30' },
      { id: 3, applicant: '杨子豪', applyDate: '2026-06-06', applicantShift: '6/9 12:15-21:00', target: '王雅澜', targetShift: '6/8 10:30-19:00' },
      { id: 4, applicant: '王靳毓', applyDate: '2026-06-09', applicantShift: '6/12 10:30-19:00', target: '王龙宇', targetShift: '6/10 10:30-19:00' },
      { id: 5, applicant: '孔祥宇', applyDate: '2026-06-20', applicantShift: '6/20 11:30-20:30', target: '王靳毓', targetShift: '6/16 13:00-21:30' },
      { id: 6, applicant: '王雅澜', applyDate: '2026-06-17', applicantShift: '6/22 12:15-21:00', target: '何秋烨', targetShift: '6/24 12:15-21:00' },
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
    ],

    // 店务统计（来自店务支援表）
        staffStats: {
      '陈昕媛': { doorCount: 14, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 1 },
      '田佳乐': { doorCount: 13, shiftChange: 0, shiftedCount: 0, missedPunch: 1, lateCount: 0, absentCount: 0, dianping: 0 },
      '迟骋': { doorCount: 9, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '王靳毓': { doorCount: 13, shiftChange: 1, shiftedCount: 2, missedPunch: 0, lateCount: 1, absentCount: 0, dianping: 0 },
      '朱凯赟': { doorCount: 9, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '孔祥宇': { doorCount: 17, shiftChange: 1, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '邓奇缘': { doorCount: 16, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '杨子豪': { doorCount: 8, shiftChange: 2, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '王雅澜': { doorCount: 10, shiftChange: 2, shiftedCount: 2, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '李若彤': { doorCount: 13, shiftChange: 1, shiftedCount: 0, missedPunch: 1, lateCount: 1, absentCount: 1, dianping: 0 },
      '王龙宇': { doorCount: 13, shiftChange: 0, shiftedCount: 1, missedPunch: 1, lateCount: 0, absentCount: 0, dianping: 0 },
      '何秋烨': { doorCount: 8, shiftChange: 0, shiftedCount: 1, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
      '龚赟昊': { doorCount: 11, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 }
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
      { id: 1, staffId: 1, date: '2026-06-01', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 2, staffId: 7, date: '2026-06-01', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 3, staffId: 2, date: '2026-06-02', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 4, staffId: 6, date: '2026-06-02', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 5, staffId: 12, date: '2026-06-03', checkIn: '10:00', checkOut: '21:30', status: 'normal', shift: 'fullday' },
      { id: 6, staffId: 5, date: '2026-06-03', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 7, staffId: 3, date: '2026-06-04', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
      { id: 8, staffId: 9, date: '2026-06-04', checkIn: '10:00', checkOut: '21:00', status: 'normal', shift: 'fullday' },
    ],

    ratings: [
    {
      "id": 1,
      "staffId": 1,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4,
        "behavior": 5,
        "attendance": 5,
        "customerReview": 5
      },
      "comment": "6月11天出勤90h，门迎14次，销售¥20,428时产¥227/h，品类(鞋履81.0% / 服装9.8% / 配件9.2%)，大众点评好评1条",
      "avgScore": 4.8,
      "hourlyRate": 60
    },
    {
      "id": 2,
      "staffId": 2,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 5,
        "attendance": 4,
        "customerReview": 4
      },
      "comment": "6月9天出勤62h，缺卡1次，门迎13次，销售¥3,552时产¥57/h，品类(鞋履64.6% / 服装22.5% / 配件12.9%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 3,
      "staffId": 3,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 4,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月8天出勤56h，门迎9次，销售¥1,298时产¥23/h，品类(鞋履100.0%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 4,
      "staffId": 4,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 5,
        "attendance": 4,
        "customerReview": 4
      },
      "comment": "6月7天出勤58h，迟到1次，门迎13次，销售¥2,884时产¥50/h，品类(鞋履45.0% / 服装20.7% / 配件34.3%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 5,
      "staffId": 5,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 4,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月7天出勤50h，门迎9次，销售¥4,072时产¥81/h，品类(鞋履68.7% / 服装29.4% / 配件1.9%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 6,
      "staffId": 6,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 3,
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月11天出勤78h，门迎17次，销售¥15,327时产¥196/h，品类(鞋履75.2% / 服装24.8%)",
      "avgScore": 4.4,
      "hourlyRate": 60
    },
    {
      "id": 7,
      "staffId": 7,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月9天出勤76h，门迎16次，销售¥6,998时产¥93/h，品类(鞋履98.5% / 配件1.5%)",
      "avgScore": 4.0,
      "hourlyRate": 60
    },
    {
      "id": 8,
      "staffId": 8,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 5,
        "behavior": 4,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月7天出勤62h，门迎8次，销售¥20,226时产¥329/h，品类(鞋履90.1% / 服装9.4% / 配件0.5%)",
      "avgScore": 4.6,
      "hourlyRate": 60
    },
    {
      "id": 9,
      "staffId": 9,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4,
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月8天出勤54h，门迎10次，销售¥14,378时产¥269/h，品类(鞋履84.7% / 服装15.3%)",
      "avgScore": 4.6,
      "hourlyRate": 60
    },
    {
      "id": 10,
      "staffId": 10,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4,
        "behavior": 5,
        "attendance": 1,
        "customerReview": 4
      },
      "comment": "6月9天出勤74h，迟到1次，缺卡1次，旷工1次，门迎13次，销售¥17,526时产¥237/h，品类(鞋履82.6% / 服装11.9% / 配件5.4%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 11,
      "staffId": 11,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 1,
        "behavior": 5,
        "attendance": 4,
        "customerReview": 4
      },
      "comment": "6月8天出勤58h，缺卡1次，门迎13次，销售¥5,450时产¥93/h，品类(鞋履93.4% / 配件6.6%)",
      "avgScore": 3.8,
      "hourlyRate": 28
    },
    {
      "id": 12,
      "staffId": 12,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 2,
        "behavior": 4,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月8天出勤50h，门迎8次，销售¥5,350时产¥107/h，品类(鞋履93.3% / 配件6.7%)",
      "avgScore": 4.0,
      "hourlyRate": 60
    },
    {
      "id": 13,
      "staffId": 13,
      "month": "2026-06",
      "scores": {
        "availability": 5,
        "performance": 4,
        "behavior": 5,
        "attendance": 5,
        "customerReview": 4
      },
      "comment": "6月7天出勤54h，门迎11次，销售¥12,078时产¥224/h，品类(鞋履82.7% / 服装17.3%)",
      "avgScore": 4.6,
      "hourlyRate": 60
    }
    ],

        // 灵工打卡考勤数据（从 scripts/fetch_linggong.js 自动拉取）
        linggongAttendance: {
      lastSync: '2026-06-17T17:07:58.798Z',
      records: [
      {
            "name": "何秋烨",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:27-09:31",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "07:27",
            "signOut": "09:31"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:26-09:32",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "07:26",
            "signOut": "09:32"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:23-09:31",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "07:23",
            "signOut": "09:31"
      },
      {
            "name": "李若彤",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:24-09:35",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "07:24",
            "signOut": "09:35"
      },
      {
            "name": "李若彤",
            "date": "2026/06/01",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:09-20:32",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "11:09",
            "signOut": "20:32"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:23-09:31",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "07:23",
            "signOut": "09:31"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/01",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "09:31-21:07",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "09:31",
            "signOut": "21:07"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "06:59-09:33",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "06:59",
            "signOut": "09:33"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:19-09:35",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "07:19",
            "signOut": "09:35"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/01",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "11:56-21:34",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "11:56",
            "signOut": "21:34"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:24-09:37",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "07:24",
            "signOut": "09:37"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:24-09:44",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "07:24",
            "signOut": "09:44"
      },
      {
            "name": "迟骋",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:23-09:35",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "07:23",
            "signOut": "09:35"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:25-09:30",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "07:25",
            "signOut": "09:30"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/01",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "07:25-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "07:25",
            "signOut": "19:00"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/01",
            "scheduleTime": "07:30-09:30",
            "restTime": "-",
            "clockInTime": "07:29-09:38",
            "status": "考勤正常",
            "totalHours": 2,
            "scheduleHours": 2,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "07:29",
            "signOut": "09:38"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/01",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:38-18:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "09:38",
            "signOut": "18:32"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/02",
            "scheduleTime": "09:00-13:00",
            "restTime": "-",
            "clockInTime": "09:00-13:00",
            "status": "考勤正常",
            "totalHours": 4,
            "scheduleHours": 4,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "09:00",
            "signOut": "13:00"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/02",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:27-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "10:27",
            "signOut": "19:00"
      },
      {
            "name": "李若彤",
            "date": "2026/06/02",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:08-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "12:08",
            "signOut": "21:00"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/02",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:16-20:31",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "11:16",
            "signOut": "20:31"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/02",
            "scheduleTime": "10:00-16:30",
            "restTime": "15:00-15:30",
            "clockInTime": "09:58-16:37",
            "status": "考勤正常",
            "totalHours": 6,
            "scheduleHours": 6,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "09:58",
            "signOut": "16:37"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/02",
            "scheduleTime": "09:00-17:30",
            "restTime": "12:00-12:30",
            "clockInTime": "08:55-17:33",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "08:55",
            "signOut": "17:33"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/02",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:51-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "12:51",
            "signOut": "21:30"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/03",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:52-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "09:52",
            "signOut": "18:30"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/03",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:24-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "10:24",
            "signOut": "19:00"
      },
      {
            "name": "李若彤",
            "date": "2026/06/03",
            "scheduleTime": "09:00-17:00",
            "restTime": "-",
            "clockInTime": "09:00-17:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "09:00",
            "signOut": "17:00"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/03",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:57-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "11:57",
            "signOut": "21:00"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/03",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:56-21:33",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "12:56",
            "signOut": "21:33"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/03",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:25-20:34",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "11:25",
            "signOut": "20:34"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/03",
            "scheduleTime": "09:00-15:00",
            "restTime": "-",
            "clockInTime": "09:00-15:00",
            "status": "考勤正常",
            "totalHours": 6,
            "scheduleHours": 6,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "09:00",
            "signOut": "15:00"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/04",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:16-20:31",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "11:16",
            "signOut": "20:31"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/04",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:13-19:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "10:13",
            "signOut": "19:01"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/04",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:56-21:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "12:56",
            "signOut": "21:31"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/04",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:13-21:02",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "12:13",
            "signOut": "21:02"
      },
      {
            "name": "迟骋",
            "date": "2026/06/04",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:56-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "09:56",
            "signOut": "18:30"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/05",
            "scheduleTime": "17:30-21:15",
            "restTime": "-",
            "clockInTime": "17:24-21:16",
            "status": "考勤正常",
            "totalHours": 3.5,
            "scheduleHours": 3.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "17:24",
            "signOut": "21:16"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/05",
            "scheduleTime": "17:30-21:15",
            "restTime": "-",
            "clockInTime": "17:25-21:15",
            "status": "考勤正常",
            "totalHours": 3.5,
            "scheduleHours": 3.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "17:25",
            "signOut": "21:15"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/05",
            "scheduleTime": "10:00-20:00",
            "restTime": "12:00-12:30",
            "clockInTime": "09:48-20:01",
            "status": "考勤正常",
            "totalHours": 9.5,
            "scheduleHours": 9.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "09:48",
            "signOut": "20:01"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/05",
            "scheduleTime": "17:30-21:15",
            "restTime": "-",
            "clockInTime": "17:01-21:15",
            "status": "考勤正常",
            "totalHours": 3.5,
            "scheduleHours": 3.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "17:01",
            "signOut": "21:15"
      },
      {
            "name": "迟骋",
            "date": "2026/06/05",
            "scheduleTime": "17:30-23:00",
            "restTime": "-",
            "clockInTime": "17:03-23:04",
            "status": "考勤正常",
            "totalHours": 5.5,
            "scheduleHours": 5.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "17:03",
            "signOut": "23:04"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/05",
            "scheduleTime": "10:00-20:00",
            "restTime": "12:00-12:30",
            "clockInTime": "09:57-20:02",
            "status": "考勤正常",
            "totalHours": 9.5,
            "scheduleHours": 9.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "09:57",
            "signOut": "20:02"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/05",
            "scheduleTime": "17:30-23:00",
            "restTime": "-",
            "clockInTime": "17:17-23:05",
            "status": "考勤正常",
            "totalHours": 5.5,
            "scheduleHours": 5.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "17:17",
            "signOut": "23:05"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/06",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:57-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "12:57",
            "signOut": "21:30"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/06",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:10-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "12:10",
            "signOut": "21:00"
      },
      {
            "name": "李若彤",
            "date": "2026/06/06",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "取消-取消",
            "status": "取消",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "取消",
            "signOut": "取消"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/06",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "10:42-20:20",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "10:42",
            "signOut": "20:20"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/06",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:26-20:31",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "11:26",
            "signOut": "20:31"
      },
      {
            "name": "迟骋",
            "date": "2026/06/06",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:13-21:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "12:13",
            "signOut": "21:01"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/06",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:42-18:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "09:42",
            "signOut": "18:32"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/07",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "10:57-19:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "10:57",
            "signOut": "19:30"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/07",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:20-20:31",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "11:20",
            "signOut": "20:31"
      },
      {
            "name": "李若彤",
            "date": "2026/06/07",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:14-21:05",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "12:14",
            "signOut": "21:05"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/07",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:19-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "10:19",
            "signOut": "19:00"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/07",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:07-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "12:07",
            "signOut": "21:00"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/07",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:57-21:39",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "12:57",
            "signOut": "21:39"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/07",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:57-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "09:57",
            "signOut": "18:30"
      },
      {
            "name": "李若彤",
            "date": "2026/06/08",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:58-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "12:58",
            "signOut": "21:30"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/08",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:11-19:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "10:11",
            "signOut": "19:01"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/08",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "10:00-18:33",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "10:00",
            "signOut": "18:33"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/08",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:26-20:34",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "11:26",
            "signOut": "20:34"
      },
      {
            "name": "迟骋",
            "date": "2026/06/08",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:14-21:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "12:14",
            "signOut": "21:01"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/09",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:29-20:30",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "11:29",
            "signOut": "20:30"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/09",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:52-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "11:52",
            "signOut": "21:00"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/09",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:47-18:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "09:47",
            "signOut": "18:31"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/09",
            "scheduleTime": "20:00-次日02:45",
            "restTime": "23:30-次日00:00",
            "clockInTime": "19:48-次日02:46",
            "status": "考勤正常",
            "totalHours": 6,
            "scheduleHours": 6,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "19:48",
            "signOut": "次日02:46"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/09",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:58-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "12:58",
            "signOut": "21:30"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/09",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:20-19:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "10:20",
            "signOut": "19:01"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/10",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:21-20:34",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "11:21",
            "signOut": "20:34"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/10",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:51-21:38",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "12:51",
            "signOut": "21:38"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/10",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:45-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "11:45",
            "signOut": "21:00"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/10",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:45-19:00",
            "status": "考勤异常",
            "totalHours": 7.5,
            "scheduleHours": 8,
            "lateMin": 15,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "10:45",
            "signOut": "19:00"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/10",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:55-18:41",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "09:55",
            "signOut": "18:41"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/11",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:57-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "09:57",
            "signOut": "18:30"
      },
      {
            "name": "李若彤",
            "date": "2026/06/11",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:32-19:00",
            "status": "考勤异常",
            "totalHours": 7.5,
            "scheduleHours": 8,
            "lateMin": 2,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "10:32",
            "signOut": "19:00"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/11",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:57-21:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "11:57",
            "signOut": "21:01"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/11",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:54-21:38",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "12:54",
            "signOut": "21:38"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/11",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:15-20:50",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "11:15",
            "signOut": "20:50"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/12",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:58-18:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "09:58",
            "signOut": "18:31"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/12",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:15-20:34",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "11:15",
            "signOut": "20:34"
      },
      {
            "name": "王雅澜",
            "date": "2026/06/12",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:43-21:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "11:43",
            "signOut": "21:01"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/12",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:24-19:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "10:24",
            "signOut": "19:01"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/12",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:52-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "12:52",
            "signOut": "21:30"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/12",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "10:42-19:44",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "10:42",
            "signOut": "19:44"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/13",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:55-21:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "12:55",
            "signOut": "21:32"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/13",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "11:00-19:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "11:00",
            "signOut": "19:30"
      },
      {
            "name": "李若彤",
            "date": "2026/06/13",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:10-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "12:10",
            "signOut": "21:00"
      },
      {
            "name": "迟骋",
            "date": "2026/06/13",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:59-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "09:59",
            "signOut": "18:30"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/13",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:28-20:34",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "11:28",
            "signOut": "20:34"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/13",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:54-21:02",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "11:54",
            "signOut": "21:02"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/13",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:57-18:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "09:57",
            "signOut": "18:32"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/14",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:12-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "12:12",
            "signOut": "21:00"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/14",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:53-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "09:53",
            "signOut": "18:30"
      },
      {
            "name": "李若彤",
            "date": "2026/06/14",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:27-",
            "status": "考勤中",
            "totalHours": 0,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "11:27",
            "signOut": ""
      },
      {
            "name": "李若彤",
            "date": "2026/06/14",
            "scheduleTime": "11:30-20:00",
            "restTime": "15:00-15:30",
            "clockInTime": "11:27-20:08",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "11:27",
            "signOut": "20:08"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/14",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "10:51-19:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "10:51",
            "signOut": "19:30"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/14",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "10:53-19:36",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "10:53",
            "signOut": "19:36"
      },
      {
            "name": "迟骋",
            "date": "2026/06/14",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "09:53-19:02",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "09:53",
            "signOut": "19:02"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/14",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:25-",
            "status": "考勤中",
            "totalHours": 0,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "11:25",
            "signOut": ""
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/14",
            "scheduleTime": "11:30-20:00",
            "restTime": "17:00-17:30",
            "clockInTime": "11:25-20:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "11:25",
            "signOut": "20:01"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/14",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:53-21:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "12:53",
            "signOut": "21:32"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/15",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:24-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "10:24",
            "signOut": "19:00"
      },
      {
            "name": "李若彤",
            "date": "2026/06/15",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:12-21:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "12:12",
            "signOut": "21:01"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/15",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:19-20:32",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "11:19",
            "signOut": "20:32"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/15",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:56-18:32",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "09:56",
            "signOut": "18:32"
      },
      {
            "name": "迟骋",
            "date": "2026/06/15",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:56-21:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "12:56",
            "signOut": "21:31"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/15",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:28-20:31",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "11:28",
            "signOut": "20:31"
      },
      {
            "name": "何秋烨",
            "date": "2026/06/16",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:56-18:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17385186797",
            "signIn": "09:56",
            "signOut": "18:31"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/16",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:57-21:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "12:57",
            "signOut": "21:30"
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/16",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:19-19:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "10:19",
            "signOut": "19:00"
      },
      {
            "name": "陈昕媛",
            "date": "2026/06/16",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "11:44-21:00",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17316338391",
            "signIn": "11:44",
            "signOut": "21:00"
      },
      {
            "name": "龚赟昊",
            "date": "2026/06/16",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:24-20:35",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18964138059",
            "signIn": "11:24",
            "signOut": "20:35"
      },
      {
            "name": "孔祥宇",
            "date": "2026/06/17",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "09:55-18:30",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17317692616",
            "signIn": "09:55",
            "signOut": "18:30"
      },
      {
            "name": "杨子豪",
            "date": "2026/06/17",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "11:16-20:32",
            "status": "考勤正常",
            "totalHours": 8.5,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17601250568",
            "signIn": "11:16",
            "signOut": "20:32"
      },
      {
            "name": "王靳毓",
            "date": "2026/06/17",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "10:17-19:01",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18735796066",
            "signIn": "10:17",
            "signOut": "19:01"
      },
      {
            "name": "王龙宇",
            "date": "2026/06/17",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "12:06-21:02",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18452648526",
            "signIn": "12:06",
            "signOut": "21:02"
      },
      {
            "name": "田佳乐",
            "date": "2026/06/17",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "12:57-21:31",
            "status": "考勤正常",
            "totalHours": 8,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "12:57",
            "signOut": "21:31"
      },
      {
            "name": "朱凯赟",
            "date": "2026/06/18",
            "scheduleTime": "13:00-21:30",
            "restTime": "17:30-18:00",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "13817425945",
            "signIn": "",
            "signOut": ""
      },
      {
            "name": "李若彤",
            "date": "2026/06/18",
            "scheduleTime": "11:30-20:30",
            "restTime": "15:00-15:30",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8.5,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18121400532",
            "signIn": "",
            "signOut": ""
      },
      {
            "name": "王雅澜",
            "date": "2026/06/18",
            "scheduleTime": "12:15-21:00",
            "restTime": "16:00-16:30",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "18628916171",
            "signIn": "",
            "signOut": ""
      },
      {
            "name": "田佳乐",
            "date": "2026/06/18",
            "scheduleTime": "10:30-19:00",
            "restTime": "14:30-15:00",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17613142469",
            "signIn": "",
            "signOut": ""
      },
      {
            "name": "迟骋",
            "date": "2026/06/18",
            "scheduleTime": "10:00-18:30",
            "restTime": "12:00-12:30",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "15641153195",
            "signIn": "",
            "signOut": ""
      },
      {
            "name": "邓奇缘",
            "date": "2026/06/18",
            "scheduleTime": "11:00-19:30",
            "restTime": "16:00-16:30",
            "clockInTime": "-",
            "status": "未开始考勤",
            "totalHours": 0,
            "scheduleHours": 8,
            "lateMin": 0,
            "leaveMin": 0,
            "overtime": 0,
            "department": "上海安福路-短期项目",
            "project": "上海安福路-短期项目",
            "phone": "17742520904",
            "signIn": "",
            "signOut": ""
      }
]
    },

    // 业绩数据（从Excel「安福路兼职数据表.xlsx」导入）
    performanceData: {
      april: {
        month: '2026-04',
        totalSales: 407876,
        avgHourlyOutput: 285.98,
        records: [
          { name: '龚赟昊', sales: 55736, salesShare: 0.1366, workHours: 114.5, prevMonthSales: 6366, prevShare: 0.0395, shareGrowth: 0.0972, hourlyOutput: 486.78 },
          { name: '陈昕媛', sales: 53428, salesShare: 0.1310, workHours: 84, prevMonthSales: 24758, prevShare: 0.1536, shareGrowth: -0.0226, hourlyOutput: 636.05 },
          { name: '何秋烨', sales: 43268, salesShare: 0.1061, workHours: 80, prevMonthSales: 29628, prevShare: 0.1838, shareGrowth: -0.0777, hourlyOutput: 540.85 },
          { name: '李若彤', sales: 41488, salesShare: 0.1017, workHours: 122, prevMonthSales: 17484, prevShare: 0.1084, shareGrowth: -0.0067, hourlyOutput: 340.07 },
          { name: '田佳乐', sales: 34148, salesShare: 0.0837, workHours: 110.5, prevMonthSales: 9986, prevShare: 0.0619, shareGrowth: 0.0218, hourlyOutput: 309.03 },
          { name: '徐思懿', sales: 32868, salesShare: 0.0806, workHours: 96, prevMonthSales: 17214, prevShare: 0.1068, shareGrowth: -0.0262, hourlyOutput: 342.38 },
          { name: '邓奇缘', sales: 32208, salesShare: 0.0790, workHours: 138, prevMonthSales: 3296, prevShare: 0.0204, shareGrowth: 0.0585, hourlyOutput: 233.39 },
          { name: '朱凯赟', sales: 24958, salesShare: 0.0612, workHours: 105, prevMonthSales: 13180, prevShare: 0.0817, shareGrowth: -0.0206, hourlyOutput: 237.70 },
          { name: '孔祥宇', sales: 23652, salesShare: 0.0580, workHours: 130, prevMonthSales: 0, prevShare: 0, shareGrowth: 0.0580, hourlyOutput: 181.94 },
          { name: '迟骋', sales: 21132, salesShare: 0.0518, workHours: 109.5, prevMonthSales: 7186, prevShare: 0.0446, shareGrowth: 0.0072, hourlyOutput: 192.99 },
          { name: '王龙宇', sales: 17074, salesShare: 0.0419, workHours: 80, prevMonthSales: 6656, prevShare: 0.0413, shareGrowth: 0.0006, hourlyOutput: 213.43 },
          { name: '杨子豪', sales: 13338, salesShare: 0.0327, workHours: 83.5, prevMonthSales: 22484, prevShare: 0.1394, shareGrowth: -0.1067, hourlyOutput: 159.74 },
          { name: '王雅澜', sales: 7588, salesShare: 0.0186, workHours: 99.5, prevMonthSales: 2996, prevShare: 0.0186, shareGrowth: 0.0000, hourlyOutput: 76.26 },
          { name: '王靳毓', sales: 6990, salesShare: 0.0171, workHours: 131.5, prevMonthSales: 0, prevShare: 0, shareGrowth: 0.0171, hourlyOutput: 53.16 },
        ]
      },
      may: {
        month: '2026-05',
        totalSales: 440577,
        avgUPT: 1.27,
        avgHourlyOutput: 281.34,
        records: [
          { name: '李若彤', sales: 61848, upt: 1.24, salesShare: 0.1404, workHours: 143, hourlyOutput: 432.50, prevHourlyOutput: 340.07, efficiency: 0.2137 },
          { name: '陈昕媛', sales: 60276, upt: 1.29, salesShare: 0.1368, workHours: 138.5, hourlyOutput: 435.21, prevHourlyOutput: 636.05, efficiency: -0.4615 },
          { name: '何秋烨', sales: 58358, upt: 1.52, salesShare: 0.1325, workHours: 120.5, hourlyOutput: 484.30, prevHourlyOutput: 540.85, efficiency: -0.1168 },
          { name: '杨子豪', sales: 39398, upt: 1.29, salesShare: 0.0894, workHours: 120, hourlyOutput: 328.32, prevHourlyOutput: 159.74, efficiency: 0.5135 },
          { name: '邓奇缘', sales: 38528, upt: 1.52, salesShare: 0.0874, workHours: 141.5, hourlyOutput: 272.28, prevHourlyOutput: 233.39, efficiency: 0.1428 },
          { name: '龚赟昊', sales: 36192, upt: 1.36, salesShare: 0.0821, workHours: 120, hourlyOutput: 301.60, prevHourlyOutput: 486.78, efficiency: -0.6140 },
          { name: '朱凯赟', sales: 32860, upt: 1.11, salesShare: 0.0746, workHours: 89, hourlyOutput: 369.21, prevHourlyOutput: 237.70, efficiency: 0.3562 },
          { name: '田佳乐', sales: 29979, upt: 1.22, salesShare: 0.0680, workHours: 107, hourlyOutput: 280.18, prevHourlyOutput: 309.03, efficiency: -0.1030 },
          { name: '王龙宇', sales: 25258, upt: 1.17, salesShare: 0.0573, workHours: 110.5, hourlyOutput: 228.58, prevHourlyOutput: 213.43, efficiency: 0.0663 },
          { name: '迟骋', sales: 19868, upt: 1.44, salesShare: 0.0451, workHours: 112.5, hourlyOutput: 176.60, prevHourlyOutput: 192.99, efficiency: -0.0928 },
          { name: '王雅澜', sales: 16648, upt: 1.00, salesShare: 0.0378, workHours: 120, hourlyOutput: 138.73, prevHourlyOutput: 76.26, efficiency: 0.4503 },
          { name: '孔祥宇', sales: 13476, upt: 1.20, salesShare: 0.0306, workHours: 112, hourlyOutput: 120.32, prevHourlyOutput: 181.94, efficiency: -0.5121 },
          { name: '王靳毓', sales: 7888, upt: 1.20, salesShare: 0.0179, workHours: 88, hourlyOutput: 89.64, prevHourlyOutput: 53.16, efficiency: 0.4070 },
        ]
      },
            june: {
        month: '2026-06',
        totalSales: 129567,
        avgUPT: 1.35,
        avgHourlyOutput: 157.7,
        note: 'data as of 6/17 (file 37, case-insensitive)',
        records: [
  {
    'name': "陈昕媛",
    'sales': 20428,
    'qty': 17,
    'tickets': 15,
    'avgPrice': 1202,
    'workHours': 90,
    'workDays': 11,
    'hourlyOutput': 227,
    'efficiency': -0.4784,
    'salesShare': 0.158,
    'categories': {
      '鞋履': {
        'sales': 16550,
        'qty': 11,
        'pct': 81
      },
      '服装': {
        'sales': 1996,
        'qty': 2,
        'pct': 9.8
      },
      '配件': {
        'sales': 1882,
        'qty': 4,
        'pct': 9.2
      }
    }
  },
  {
    'name': "杨子豪",
    'sales': 20226,
    'qty': 17,
    'tickets': 12,
    'avgPrice': 1190,
    'workHours': 61.5,
    'workDays': 7,
    'hourlyOutput': 329,
    'efficiency': 0.0021,
    'salesShare': 0.156,
    'categories': {
      '鞋履': {
        'sales': 18222,
        'qty': 14,
        'pct': 90.1
      },
      '服装': {
        'sales': 1896,
        'qty': 2,
        'pct': 9.4
      },
      '配件': {
        'sales': 108,
        'qty': 1,
        'pct': 0.5
      }
    }
  },
  {
    'name': "李若彤",
    'sales': 17526,
    'qty': 17,
    'tickets': 11,
    'avgPrice': 1031,
    'workHours': 74,
    'workDays': 9,
    'hourlyOutput': 237,
    'efficiency': -0.452,
    'salesShare': 0.135,
    'categories': {
      '鞋履': {
        'sales': 14478,
        'qty': 11,
        'pct': 82.6
      },
      '服装': {
        'sales': 2094,
        'qty': 3,
        'pct': 11.9
      },
      '配件': {
        'sales': 954,
        'qty': 3,
        'pct': 5.4
      }
    }
  },
  {
    'name': "王雅澜",
    'sales': 14378,
    'qty': 11,
    'tickets': 8,
    'avgPrice': 1307,
    'workHours': 53.5,
    'workDays': 8,
    'hourlyOutput': 269,
    'efficiency': 0.939,
    'salesShare': 0.111,
    'categories': {
      '鞋履': {
        'sales': 12182,
        'qty': 9,
        'pct': 84.7
      },
      '服装': {
        'sales': 2196,
        'qty': 2,
        'pct': 15.3
      }
    }
  },
  {
    'name': "孔祥宇",
    'sales': 15327,
    'qty': 14,
    'tickets': 9,
    'avgPrice': 1095,
    'workHours': 78,
    'workDays': 11,
    'hourlyOutput': 196,
    'efficiency': 0.629,
    'salesShare': 0.118,
    'categories': {
      '鞋履': {
        'sales': 11532,
        'qty': 9,
        'pct': 75.2
      },
      '服装': {
        'sales': 3795,
        'qty': 5,
        'pct': 24.8
      }
    }
  },
  {
    'name': "龚赟昊",
    'sales': 12078,
    'qty': 11,
    'tickets': 9,
    'avgPrice': 1098,
    'workHours': 54,
    'workDays': 7,
    'hourlyOutput': 224,
    'efficiency': -0.2573,
    'salesShare': 0.093,
    'categories': {
      '鞋履': {
        'sales': 9984,
        'qty': 8,
        'pct': 82.7
      },
      '服装': {
        'sales': 2094,
        'qty': 3,
        'pct': 17.3
      }
    }
  },
  {
    'name': "朱凯赟",
    'sales': 4072,
    'qty': 4,
    'tickets': 3,
    'avgPrice': 1018,
    'workHours': 50.5,
    'workDays': 7,
    'hourlyOutput': 81,
    'efficiency': -0.7806,
    'salesShare': 0.031,
    'categories': {
      '鞋履': {
        'sales': 2796,
        'qty': 2,
        'pct': 68.7
      },
      '服装': {
        'sales': 1198,
        'qty': 1,
        'pct': 29.4
      },
      '配件': {
        'sales': 78,
        'qty': 1,
        'pct': 1.9
      }
    }
  },
  {
    'name': "邓奇缘",
    'sales': 6998,
    'qty': 6,
    'tickets': 4,
    'avgPrice': 1166,
    'workHours': 75.5,
    'workDays': 9,
    'hourlyOutput': 93,
    'efficiency': -0.6584,
    'salesShare': 0.054,
    'categories': {
      '鞋履': {
        'sales': 6890,
        'qty': 5,
        'pct': 98.5
      },
      '配件': {
        'sales': 108,
        'qty': 1,
        'pct': 1.5
      }
    }
  },
  {
    'name': "王龙宇",
    'sales': 5450,
    'qty': 5,
    'tickets': 4,
    'avgPrice': 1090,
    'workHours': 58.5,
    'workDays': 8,
    'hourlyOutput': 93,
    'efficiency': -0.5931,
    'salesShare': 0.042,
    'categories': {
      '鞋履': {
        'sales': 5092,
        'qty': 4,
        'pct': 93.4
      },
      '配件': {
        'sales': 358,
        'qty': 1,
        'pct': 6.6
      }
    }
  },
  {
    'name': "何秋烨",
    'sales': 5350,
    'qty': 5,
    'tickets': 4,
    'avgPrice': 1070,
    'workHours': 50,
    'workDays': 8,
    'hourlyOutput': 107,
    'efficiency': -0.7791,
    'salesShare': 0.041,
    'categories': {
      '鞋履': {
        'sales': 4992,
        'qty': 4,
        'pct': 93.3
      },
      '配件': {
        'sales': 358,
        'qty': 1,
        'pct': 6.7
      }
    }
  },
  {
    'name': "田佳乐",
    'sales': 3552,
    'qty': 4,
    'tickets': 3,
    'avgPrice': 888,
    'workHours': 62.5,
    'workDays': 9,
    'hourlyOutput': 57,
    'efficiency': -0.7966,
    'salesShare': 0.027,
    'categories': {
      '鞋履': {
        'sales': 2296,
        'qty': 2,
        'pct': 64.6
      },
      '服装': {
        'sales': 798,
        'qty': 1,
        'pct': 22.5
      },
      '配件': {
        'sales': 458,
        'qty': 1,
        'pct': 12.9
      }
    }
  },
  {
    'name': "王靳毓",
    'sales': 2884,
    'qty': 3,
    'tickets': 2,
    'avgPrice': 961,
    'workHours': 58,
    'workDays': 7,
    'hourlyOutput': 50,
    'efficiency': -0.4422,
    'salesShare': 0.022,
    'categories': {
      '鞋履': {
        'sales': 1298,
        'qty': 1,
        'pct': 45
      },
      '配件': {
        'sales': 988,
        'qty': 1,
        'pct': 34.3
      },
      '服装': {
        'sales': 598,
        'qty': 1,
        'pct': 20.7
      }
    }
  },
  {
    'name': "迟骋",
    'sales': 1298,
    'qty': 1,
    'tickets': 1,
    'avgPrice': 1298,
    'workHours': 55.5,
    'workDays': 8,
    'hourlyOutput': 23,
    'efficiency': -0.8698,
    'salesShare': 0.01,
    'categories': {
      '鞋履': {
        'sales': 1298,
        'qty': 1,
        'pct': 100
      }
    }
  }
        ]
      },
    },

    // 顾客好评记录（大众点评5星好评）
    customerReviews: [
      { id: 1, staffName: '陈昕媛', month: '2026-06', rating: 5, reviewDate: '2026-06-16', snippet: '逛街看到小白楼进来逛逛，Kelly的导览非常详细，带我了解到了很多新的活动和品牌历史，对Salomon有了新的了解。', keywords: ['导览详细', '品牌历史', '新活动', '超预期'], source: '大众点评（陆慧，Lv4）' },
    ],

    // Data version for forced refresh detection
    _dataVersion: '2026-06-18-v6',
  },

  init() {
    if (!localStorage.getItem(this.KEY)) {
      localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
    } else {
      // Auto-upgrade: if old data format detected, reset to new format
      const data = JSON.parse(localStorage.getItem(this.KEY));
      const staff = data.staff || [];
      const avail = data.availability || {};
      const availData = avail.data || {};
      const wangYalan = availData['王雅澜'];
      const chenXinyuan = availData['陈昕媛'];
      const doorSchedule = data.doorSchedule || [];

      // Check if old format (no "陈昕媛" means old data)
      const isOldFormat = staff.length > 0 && !staff.find(s => s.name === '陈昕媛');
      // Check if 王雅澜 availability data is outdated (missing 6/13 or has 6/17)
      const isOutdatedAvail = wangYalan && (!wangYalan.unavailable.includes('6/13') || wangYalan.unavailable.includes('6/17'));
      // Check if 陈昕媛 availability is outdated (has 6/16 instead of 6/15)
      const isOutdatedAvail2 = chenXinyuan && chenXinyuan.unavailable.includes('6/16');
      // Check if doorSchedule is outdated: 6/9 missing 王靳毓 at 10:00-11:00, or has broken time like 15:00-15:00
      const june9 = doorSchedule.find(d => d.date === '2026-06-09');
      const isOutdatedDoor = june9 && june9.slots && !june9.slots.find(s => s.staff === '王靳毓' && s.time.startsWith('10:'));
      const hasBrokenTime = doorSchedule.some(d => d.slots && d.slots.some(s => s.time && s.time.includes('-') && s.time.split('-')[0] === s.time.split('-')[1]));
      // Check if linggongAttendance is outdated (only 10 records instead of 94)
      const lgData = data.linggongAttendance || {};
      const isOutdatedLG = lgData.records && lgData.records.length < 156;
      // Check if ratings is outdated (still 5月 data or less than 13 records)
      const ratingsData = data.ratings || [];
      const isOutdatedRatings = ratingsData.length < 13 || (ratingsData[0] && ratingsData[0].month === '2026-05');
      // Check if performanceData has june data
      const perfData = data.performanceData || {};
      const isOutdatedPerf = !perfData.june;
      // Check if staff data still has phone/joinDate fields (old format)
      const isOldStaffFormat = staff.length > 0 && staff[0].phone !== undefined;
      // Check if 邓奇缘 rating attendance is outdated (was 4, should be 5)
      const dengRating = ratingsData.find(r => r.staffId === 7);
      const isOutdatedDengRating = dengRating && dengRating.scores && dengRating.scores.attendance === 4;
      // Check if june performance data is outdated (totalSales < 85636 or missing 陈昕媛)
      const junePerf = (perfData.june || {});
      const juneRecords = junePerf.records || [];
      const cxyPerf = juneRecords.find(r => r.name === '陈昕媛');
      const isOutdatedJunePerf = junePerf.totalSales && junePerf.totalSales < 127591;
      const isOutdatedKXY = juneRecords.length > 0 && !juneRecords.find(r => r.categories); // 无categories=旧数据（品类功能）
      // Check if ratings is outdated v3: 陈昕媛 avgScore should be 4.4 (old v2 was 4.6)
      const cxyRating = ratingsData.find(r => r.staffId === 1);
      const isOutdatedRatingsV2 = cxyRating && cxyRating.avgScore > 4.4;
      // Check if doorSchedule is outdated v2: missing 6/13 or 6/14 data
      const hasJune13 = doorSchedule.find(d => d.date === '2026-06-13');
      const hasJune14 = doorSchedule.find(d => d.date === '2026-06-14');
      const isOutdatedDoorV2 = !hasJune13 || !hasJune14;
      // Check if ratings is outdated v4: 王雅澜 avgScore should be 4.6 (was 4.4), 邓奇缘 should be 4.6 (was 4.4)
      const wylRating = ratingsData.find(r => r.staffId === 9);
      const dqyRating = ratingsData.find(r => r.staffId === 8);
      const isOutdatedRatingsV4 = (wylRating && wylRating.avgScore < 4.6) || (dqyRating && dqyRating.avgScore < 4.6);

      // Check if ratings is outdated v5: scores still has knowledge field (removed)
      const hasKnowledgeScore = ratingsData.some(r => r.scores && r.scores.knowledge !== undefined);
      const isOutdatedRatingsV5 = hasKnowledgeScore;
      const isOutdatedRatingsV6 = cxyRating && cxyRating.scores && !cxyRating.scores.customerReview;

      // Check if customerReviews module is missing or outdated
      const isMissingReviews = !data.customerReviews;
      const isOutdatedReviewsV2 = data.customerReviews && data.customerReviews.length === 0;
      // Check if availability is outdated v3: 陈昕媛 total should be 27 (was 20), 田佳乐 total should be 26 (was 27)
      const isOutdatedAvailV3 = chenXinyuan && chenXinyuan.total === 20;
      // Check if june performance is outdated v2: totalSales should be 129567 (was 127591)
      const isOutdatedJunePerfV2 = junePerf.totalSales && junePerf.totalSales < 129567;
      // Force reset if critical data sections are missing (ratings, linggong, performanceData)
      const isMissingCritical = !data.ratings || !data.linggongAttendance || !data.performanceData || !data.customerReviews;
      // Version-based force reset: bumps every time we push a critical update
      const DATA_VERSION = '2026-06-18-v6';
      const isVersionMismatch = data._dataVersion !== DATA_VERSION;

      if (isOldFormat || isOutdatedAvail || isOutdatedAvail2 || isOutdatedDoor || hasBrokenTime || isOutdatedLG || isOutdatedRatings || isOutdatedPerf || isOldStaffFormat || isOutdatedDengRating || isOutdatedJunePerf || isOutdatedKXY || isOutdatedRatingsV2 || isOutdatedDoorV2 || isOutdatedRatingsV4 || isOutdatedRatingsV5 || isOutdatedRatingsV6 || isMissingReviews || isOutdatedReviewsV2 || isOutdatedAvailV3 || isOutdatedJunePerfV2 || isMissingCritical || isVersionMismatch) {
        localStorage.setItem(this.KEY, JSON.stringify(this.defaults));
      }
    }
  },

  get(key) {
    const data = JSON.parse(localStorage.getItem(this.KEY) || '{}');
    return data[key] || this.defaults[key] || [];
  },

  set(key, value) {
    const data = JSON.parse(localStorage.getItem(this.KEY) || '{}');
    data[key] = value;
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  getAll() {
    return JSON.parse(localStorage.getItem(this.KEY) || JSON.stringify(this.defaults));
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
      reports: () => renderReports(),
      handbook: () => renderHandbook(),
    };

    if (pages[this.current]) {
      content.innerHTML = pages[this.current]();
      // Re-init any page-specific JS
      if (this.current === 'dashboard') initDashboardCharts();
      if (this.current === 'reports') initReportCharts();
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
      reports: '数据报表',
      handbook: '工作手册',
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
  { key: 'availability', label: '工时支持', desc: '每周可排班≥4天，实际≥3天/周，灵活补位' },
  { key: 'performance', label: '销售业绩', desc: '小时销售额>210元，UPT>1.25，大众点评好评加分' },
  { key: 'behavior', label: '行为规范', desc: '仪容仪表、服务态度、专业素养、团队合作' },
  { key: 'attendance', label: '考勤纪律', desc: '准时打卡、请假规范、在岗专注' },
  { key: 'knowledge', label: '产品知识', desc: '核心科技掌握、全品类认知、场景搭配能力' },
];

// 薪资标准
const HOURLY_RATE_PASS = 60;  // 达标时薪
const HOURLY_RATE_FAIL = 28;  // 未达标时薪

// KPI 指标
const KPI = {
  hourlySalesTarget: 210,  // 小时销售额目标
  uptTarget: 1.25,         // UPT 目标
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
Store.init();
