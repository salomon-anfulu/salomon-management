# v51c/v51d 对抗性审查报告 — 多用户同步修复

## 审查范围
对 v51/v51b 的三项同步修复（pull后自动渲染、availability逐日合并、push队列化、手动同步按钮）进行两轮对抗性审查。

## 第一轮发现（v51c 修复）

### 🔴 P0-A: `_snapshotForCompare()` 粒度致命错误
- **问题**: 原实现用 `Object.keys(v).length` 做快照，但 availability 结构 `{ currentMonth, months }` 的 key 数量永远是 2，不管多少人填了什么数据
- **后果**: `dataChanged = false` → `Router.render()` 永远不被调用 → pull 后页面不刷新（v51 最核心的修复对 availability 不生效）
- **修复**: 重写为深度遍历：`months → data → 每人dates数量 + 最新_updatedAt`，数组类每条记录的 `id + _updatedAt`

### 🟡 P1-B: 手动同步按钮的 pull 被 PULL_INTERVAL 吞掉
- **问题**: 按钮先 push 再 pull，但 pull 检查 15 秒防抖，如果自动 pull 刚执行过，手动 pull 直接 return true
- **后果**: 用户点"同步"看到"同步完成"，但实际没拉到别人的新数据
- **修复**: `pull(silent, force)` 新增 force 参数，手动按钮用 `pull(false, true)` 绕过防抖

### 🟡 P1-C: push 运行时手动按钮的 pull 被跳过
- **问题**: push 队列化后，如果已有 push 在运行，`push()` 立即返回 true，按钮 await 瞬间完成，随后 pull 检查 `_pushInFlight=true` 被跳过
- **修复**: 按钮 onclick 中 `while(Sync._pushRunning)` 轮询等待 push 真正完成再 pull（上限 10 秒）

### 🔴 P0-D: availability 日期级无时间戳
- **问题**: `saveDateStatus` 保存时没有 `_updatedAt`，逐日合并无法判断哪个版本更新
- **修复**: 保存时加 `_updatedAt: Date.now()`，push 端和 pull 端的 dates 合并都改为按时间戳取新版本

## 第二轮发现（v51d 修复）

### 🔴 P0-E: `_doPush` 返回值类型不一致
- **问题**: `_doPush` 成功返回 `true`，但失败时返回 `{ success: false, error: ... }`（对象是 truthy）
- **后果**: `_processPushQueue` 中 `if (!result)` 对 `{ success: false }` 判断为 false → 循环不 break → `_pendingSync` 不设置 → 失败的数据不会补偿推送
- **修复**: `_doPush` 统一返回 `true/false`，`_processPushQueue` 用 `result !== true` 判断

### 🟢 P2-F: 快照空 dates 的 `Math.max` 边界
- **问题**: `Math.max(...[])` 返回 `-Infinity`，空 dates 对象时快照值异常
- **修复**: 空数组时兜底返回 0

## 最终状态

| 缺陷 | 严重性 | 状态 |
|------|--------|------|
| P0-A 快照粒度错误 | 🔴 致命 | ✅ 已修复 |
| P0-D 日期级无时间戳 | 🔴 致命 | ✅ 已修复 |
| P0-E 返回值类型不一致 | 🔴 致命 | ✅ 已修复 |
| P1-B force pull | 🟡 高 | ✅ 已修复 |
| P1-C 等待push完成 | 🟡 高 | ✅ 已修复 |
| P2-F 空数组兜底 | 🟢 低 | ✅ 已修复 |

**版本**: v51 → v51b（手动按钮）→ v51c（第一轮审查）→ v51d（第二轮审查）
**提交**: `8a6482f` (v51c) + `5f0b4ab` (v51d)
