# v112 对抗性审查报告

> 审查时间：2026-07-18
> 审查范围：calcPerformanceScore + 4 个评分函数 + renderRatings 渲染层
> 审查方法：逐行代码审计 + 边界值推演 + 现有数据回扫

---

## P0 必修（3 个）

### P0-1: calcPerformanceScore 门控分支返回结构不一致

**位置**：`js/pages.js:1697`

**问题**：门控分支返回了 `avgPrice` 字段，但正常分支（1755-1769行）不返回。导致同一个函数两种返回 shape，违反一致性原则。虽然目前 UI 只读 `r.avgPrice`（业绩记录原始字段）不读 `perfCalc.avgPrice`，但这是隐患——未来有人引用 `perfCalc.avgPrice` 时，门控路径有值、正常路径 undefined。

**修复**：门控分支移除 `avgPrice` 字段，或正常分支也加上 `avgPrice`。

### P0-2: renderRatings 门控时 UI 卡片自相矛盾

**位置**：`js/pages.js:2317-2328`

**问题**：门控触发时（lowTickets=true），时产/UPT 三卡片仍然渲染：
- 2318 行：`perfCalc.hourly >= 240` 判断用原始 hourly 值（可能很高）→ 卡片背景显示**绿色**
- 2321 行：`得分 0/5 ✗` → 文字显示**红色叉**
- 结果：绿色卡片 + 红色叉 + 底部"⚠ 销售单数≤5"，视觉矛盾

**修复**：门控时隐藏时产/UPT/月销三卡片，仅显示门控提示横幅。

### P0-3: calcBehaviorScore 除零风险

**位置**：`js/pages.js:1916-1917`

```js
const avgDoor = names.reduce((s, n) => s + (doorHours[n] || 0), 0) / names.length;
const avgSupport = names.reduce((s, n) => s + (supportHours[n] || 0), 0) / names.length;
```

**问题**：如果 `names.length === 0`（无 active Service Team 成员——如全员转正/离职/数据迁移中），`/ 0 = NaN`。后续 `door < avgDoor` → `0 < NaN` = false，`hasAnyData = NaN > 0 || NaN > 0 = false`，进入 `score = 3.0` 分支——虽然不会崩溃，但 `avgDoor/avgSupport = NaN` 会传递到 UI 显示 "NaN h"。

**修复**：`const avgDoor = names.length > 0 ? ... / names.length : 0;`

---

## P1 建议（4 个）

### P1-1: tickets=0 走门控路径但语义不清

**位置**：`js/pages.js:1691, 1696`

```js
const tickets = record.tickets || 1;  // 缺失时默认1
// ...
if (tickets <= 5) { ... }  // 但 tickets=1 也会被门控
```

**问题**：`tickets` 字段缺失时 fallback 到 1，然后 1≤5 触发门控。这在语义上是对的（无单数=不达标），但如果数据迁移/导入错误导致 tickets 字段意外缺失，会静默把所有人判1分。

**建议**：门控前加 `record.tickets !== undefined` 判断，或日志告警。

### P1-2: calcAvailabilityScore legacy fallback 使用 Date 构造（时区坑）

**位置**：`js/pages.js:1591`

```js
const _totalDaysInMonth = new Date(_yr2, _mn2, 0).getDate();
```

**问题**：这是旧数据 fallback 路径。虽然 `_yr2/_mn2` 从 monthKey 解析（YYYY-MM），但如果 monthKey 格式异常（如空字符串），`parseInt('')` = NaN，`new Date(NaN, NaN, 0)` = Invalid Date，`.getDate()` 抛错。

**建议**：加 NaN 守卫，或用 MEMORY.md 里记录的 `_ymKey` 纯算术替代。

### P1-3: renderRatings 的 perfCalc.hourly 可能是 undefined

**位置**：`js/pages.js:2320`

```js
<div>¥${perfCalc.hourly}<span>/h</span></div>
```

**问题**：fallback 分支（无业绩记录，1686行）返回 `hourly: 0`，正常。但如果 `calcPerformanceScore` 本身因异常返回了不完整对象（理论上不该，但防御深度原则），`perfCalc.hourly` = undefined → UI 显示 "¥undefined/h"。

**建议**：`(perfCalc.hourly || 0)` 兜底。

### P1-4: getBehaviorData 全局缓存无失效保护

**位置**：`js/pages.js:1883-1885`

```js
let _behaviorCache = null;
function getBehaviorData() {
  if (_behaviorCache) return _behaviorCache;
```

**问题**：缓存在 renderRatings 开头清空（1984行），但如果 Store 数据在其他地方变更（如门迎排班/店务支援页面修改后），缓存不会自动失效。若用户先看评分页（缓存填充）→ 改门迎排班 → 回评分页，可能显示旧数据。

**建议**：缓存 key 绑定数据版本，或在 Store.set 时清除缓存。

---

## P2 长期架构改进

### P2-1: 评分函数返回结构未统一

5 个 calc 函数返回不同的 shape：
- calcPerformanceScore: 15+ 字段
- calcAvailabilityScore: 11 字段（含 weekResults 数组）
- calcBehaviorScore: 10 字段
- calcAttendanceScore: 9 字段
- calcCustomerReviewScore: 3 字段

**建议**：统一为 `{ score, label, detail: {...}, breakdown: [...] }` 结构，便于 UI 泛化渲染和未来扩展。

### P2-2: 评分逻辑无单元测试覆盖

当前只有 v112 门控的5个边界值测试。其他4个维度（工时/行为/考勤/好评）的评分函数完全没有测试。

**建议**：为每个 calc 函数建立边界值测试矩阵，纳入 CI。

### P2-3: 魔法数字未提取

时产阈值（300/240/180/120）、UPT 阈值（1.6/1.4/1.25/1.1）、月销目标（20000）等都硬编码在函数体内。

**建议**：提取到 `SCORING_CONFIG` 常量对象，便于统一调整和业务方查阅。

---

## 优化优先级

| 优先级 | 数量 | 建议动作 | 预计工作量 |
|--------|------|---------|-----------|
| **P0 必修** | 3 | 立即修复并发布 v113 | ~15分钟 |
| **P1 建议** | 4 | 下次数据更新时顺带修 | ~30分钟 |
| **P2 长期** | 3 | 版本迭代中逐步重构 | 按需 |

---

## 健康度评估

| 模块 | 防御深度 | 逻辑一致性 | UI 一致性 | 总评 |
|------|---------|-----------|----------|------|
| calcPerformanceScore | 良好（有 fallback） | 门控 shape 不一致 | — | B+ |
| calcAvailabilityScore | 良好（双路径兼容） | Date 构造有隐患 | — | A- |
| calcBehaviorScore | 缺除零保护 | 逻辑清晰 | — | B |
| calcAttendanceScore | 防御充分 | 清晰 | — | A |
| calcCustomerReviewScore | 简洁安全 | 清晰 | — | A |
| renderRatings | 多处直读无兜底 | 门控 UI 矛盾 | 有问题 | B- |
