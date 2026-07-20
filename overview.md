# v128 工时第一性原理修复

> 版本: v127 → v128
> 日期: 2026-07-22
> 范围: 修复 pages.js 动态计算 bug + 数据合并 bug，让工时显示真正与灵工系统一致

---

## 🔴 根本原因（重大 bug！）

**v126 时只改了 `Store.defaults.performanceData.july.records[].workHours`，但 `pages.js` 渲染时的"动态计算"逻辑会用 `sum(totalHours)` 覆盖这个正确值！**

由于 `totalHours` 字段不可信（v126 教训：7/3 龚赟昊显示 60h 实际只有 9h），导致显示工时严重虚高：

| 员工 | v126 正确值 | 用户实际看到（bug） | 误差 |
|------|------------|---------------------|------|
| 龚赟昊 | 78.3h | 140.5h | +62.2h ⚠️ |
| 杨子豪 | 95.9h | 184.5h | +88.6h ⚠️ |
| 朱凯赟 | 61.5h | 132.5h | +71.0h ⚠️ |
| 王靳毓 | 63.7h | 124.5h | +60.8h ⚠️ |
| 玛依拉 | 71.2h | 126.5h | +55.3h ⚠️ |

---

## 修复方案

### 1. pages.js 新增工具函数（pages.js:232-298）

```javascript
// 从 signIn/signOut 精确计算单条净工时
function _calcNetHours(record) {
  // >6h 扣 1h 午休
  // 跨日处理（22:00→06:00 = 8h）
}

// 批量计算某人某月净工时
function _calcPersonMonthHours(records, personName, yearMonth, opts) {
  // 自带名字归一化（玛依拉·努尔夏提→玛依拉）
  // 同人同日多条去重（打卡正常优先）
  // 支持 excludeToday 排除进行中当天
}
```

### 2. 替换 5 处错误计算

| 位置 | 原逻辑 | 修复后 |
|------|--------|--------|
| 业绩模块动态计算 | `sum(parseFloat(r.totalHours))` | `_calcPersonMonthHours(...)` |
| 评分模块 workHours=0 兜底 | `sum(r.totalHours \|\| 0)` | `_calcPersonMonthHours(...)` |
| 考勤页面 lgTotalHours | `sum(parseFloat(r.totalHours))` | `sum(_calcNetHours(r))` |
| 单日工时列显示 | `r.totalHours + 'h'` | `_calcNetHours(r).toFixed(1) + 'h'` |
| 我的考勤页面 | `sum(r.totalHours \|\| 0)` | `sum(_calcNetHours(r))` |

### 3. sync_linggong_to_app.js 修复

名字归一化冲突场景：源数据同名同天有多条（如"玛依拉"+"玛依拉·努尔夏提"），改为按"完整度评分"择优：

| 评分 | 状态 |
|-----|------|
| 4 分 | 打卡正常 + signOut 非空（最完整）|
| 3 分 | 打卡正常 + signOut 空 |
| 2 分 | 打卡异常 + signOut 非空 |
| 1 分 | 打卡进行中 + signOut 空（最残缺）|

**修复前**：玛依拉 7/15 是"打卡进行中 signIn=12:07 signOut=空"（被错误覆盖）
**修复后**：玛依拉 7/15 是"打卡正常 12:07→21:00 8h"

---

## 数据更新

- `linggongAttendance.records`: 484 → 495 条（补 7/20 数据 + 修复 7/15 玛依拉）
- `_dataVersion`: 2026-07-20-v126 → 2026-07-22-v128
- cacheBuster: 126 → 128

---

## 验证（全通过 ✅）

### T1: `_calcNetHours` 基础用例（7/7 通过）
- 8h 工作扣午休 = 7h ✅
- 4h 不扣 = 4h ✅
- 跨日 22:00→06:00 = 7h ✅
- null 守卫 ✅

### T2: 13 人 + 唐蓉（自动补）（14/14 通过）

| 员工 | v126 期望 | v128 实算 | 天数 |
|------|----------|----------|------|
| 龚赟昊 | 78.3h | 78.3h ✅ | 11 |
| 王雅澜 | 83.6h | 83.6h ✅ | 12 |
| 孔祥宇 | 82.1h | 82.1h ✅ | 12 |
| 王靳毓 | 63.7h | 63.7h ✅ | 9 |
| 何秋烨 | 60.9h | 60.9h ✅ | 10 |
| 朱凯赟 | 61.5h | 61.5h ✅ | 8 |
| 田佳乐 | 59.9h | 59.9h ✅ | 9 |
| 李若彤 | 68.1h | 68.1h ✅ | 11 |
| 邓奇缘 | 63.3h | 63.3h ✅ | 9 |
| 迟骋 | 49.0h | 49.0h ✅ | 7 |
| 杨子豪 | 95.9h | 95.9h ✅ | 13 |
| 玛依拉 | 71.2h | 71.2h ✅ | 9 |
| 王龙宇 | 32.1h | 32.1h ✅ | 5 |
| 唐蓉（v80 自动补）| 有即可 | 81.7h ✅ | 11 |

---

## ⚠️ 工时计算的核心教训（永久记忆）

**`pages.js` 渲染时的动态计算逻辑会覆盖 `Store.defaults` 里的值！** 修数据时必须同时检查：

1. ✅ `Store.defaults` 里的数据是否正确
2. ✅ **`pages.js` 的渲染逻辑是否使用正确字段计算**

v126 只改了 1 没改 2，导致白改。v128 补齐 2 才真正生效。

---

## git

- **commit**: `6c32812 v128: 工时第一性原理修复 - pages.js 全面替换 totalHours`
- **push**: 已 push origin/main
- **GitHub Pages**: version.json=v128, cache-buster=v128, app.js _dataVersion=v128, pages.js _calcNetHours=12 处引用
