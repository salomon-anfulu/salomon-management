# 对抗式审查报告：GitHub → Supabase 同步迁移

> 审查视角：攻击者 / 批判性工程师。不假设现状、不信任注释、直接读代码验证。
> 审查范围：sync.js 同步核心、supabase-client.js、auth-guard.js、RLS 策略（sync_table.sql）、Store 实现、启动流程、版本/部署。
> 审查日期：2026-07-31（v152 线上）

---

## 总评

迁移在技术上是**成功的**——v150 三重防循环安全重接、v151 修退出登录死循环、数据库洁癖、v152 补版本号，功能层面可用。**但在「安全模型」「数据一致性」「可观测性」「可恢复性」四个维度存在系统性疏忽**，其中 2 个是 P0 级（上线即暴露）。

一句话结论：**从 GitHub（单点 Token 可写）迁到 Supabase（全员账号可写整库），权限模型发生了静默退化；同时同步层是 last-write-wins 无锁合并，多设备并发必然丢数据。**

---

## 🔴 P0-1 安全退化：RLS 让所有兼职账号都能覆盖全店数据

**证据** `supabase/sync_table.sql:25-28`：
```sql
CREATE POLICY "app_data_authed_rw" ON public.app_data
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

**漏洞**：策略只判断 `auth.role()='authenticated'`——意味着**22 个登录账号（15 兼职 + 6 仓库 + 1 admin）每一个都能通过 Supabase API 直接 `upsert` 整个 `app_data` blob**。

**对比迁移前**：GitHub 通道只有你一个人的 Personal Access Token 能写 `data/submissions.json`，其他人**物理上无法写**。

**迁移后的实际权限**：
- 密码是公开的（`Salomon2026!`，写在登录页 L307）
- 邮箱是规则的 `拼音@salomon.temp`
- 任何人拿到任意兼职账号 → 打开 Supabase 控制台或写个脚本 → `from('app_data').update({data: 任意})` → **全店所有人的排班/考勤/业绩/评分被整体覆盖**
- 无行级隔离、无字段级权限、无写入者白名单

**这是最严重的疏忽**：迁移的初衷是"根治同步失败"，却把"只有你能改数据"变成了"任何人都能改全店数据"。

**修复建议**：
- 短期：把 RLS 收紧到只有 admin 角色可写（`auth.jwt() ->> 'role' = 'admin'` 或自定义 claim），兼职只能读 + 只能写自己的字段（需要行级/字段级拆分，工作量大）
- 中期：把 `app_data` 整 blob 拆成按模块/按人的子表，RLS 按 `auth.uid()` 限制只能改自己的行
- 最低限度：至少把 `WITH CHECK` 改成只有 admin 能写，兼职只读（接受"兼职不能自己同步"的妥协，换安全性）

---

## 🔴 P0-2 并发 last-write-wins 无乐观锁：多设备同时编辑必然丢数据

**证据** `sync.js:606-637` `_pushToSupabase`：
```js
const { data: remote } = await SbClient.appData.get();   // ① 读云端
this._mergeLocalIntoShared(base);                         // ② 本地合入
await SbClient.appData.save(base, changedBy);             // ③ 覆盖写
```

**漏洞**：②和③之间没有原子性、没有版本号/ETag 校验。`get → merge → save` 是一个**非原子竞态窗口**：

- 设备 A 在 10:00:01 get 到 version=N
- 设备 B 在 10:00:02 get 到 version=N，改了唐蓉考勤，save 成功 version=N+1
- 设备 A 在 10:00:03 save（基于旧 version=N 的 merge 结果）→ **直接覆盖 B 的写入，B 的改动丢失**

**为什么必现**：兼职团队场景就是"多店员同时在不同设备填排班/考勤/业绩"。高峰期（早晚班交接、月底盘点）并发概率高。且 Realtime 订阅会让 A 在 B save 后立刻 pull 到 N+1，但 A 本地未 push 的改动已经在内存，pull 的合并逻辑（见 P1-1）不一定能无损保留。

**js 侧无冲突检测**：`_mergeLocalIntoShared` 是字段级 merge（staff 按 id、availability 按人名），理论上能减少冲突面，但**整 blob upsert 的本质是覆盖**——一旦两人改了同一个人同一个月不同日期，字段级 merge 能保住；若改了同一字段（如唐蓉 7/15 出勤），后写覆盖先写。

**修复建议**：
- 加乐观锁：`save` 时带 `updated_at` 条件（`UPDATE ... WHERE id='main' AND updated_at = $expected`），失败则 re-get → re-merge → re-save（重试 3 次）
- 或改 Postgres 函数做服务端合并（server-side merge），避免客户端竞态
- 至少加 `updated_at` 单调递增 + 冲突告警（检测到 base 已变则提示用户"数据已被他人修改，已自动合并"）

---

## 🟠 P1-1 离线改动在重连 pull 时被覆盖，无离线队列重推

**证据链**：
- `Store.set`（`app.js:5699`）**只写 LocalStorage，不触发任何网络**——确认离线改动持久化在本地 ✓
- 业务函数显式 `Store.set(...) + Sync.push(...)`（`pages.js` 多处）
- `Sync.push` → `_pushToSupabase`（`sync.js:606`）离线时 fetch 失败 → `catch (e) { console.warn(...) }` **静默丢弃，无重试队列**
- 重连后 `DOMContentLoaded` / sync timer（`sync.js:1610`）**先 pull 后 push**（实际只 pull，无"先把本地未推送改动推上去"的步骤）

**漏洞**：
1. 设备 A 离线改了数据 → 只在 LocalStorage
2. 重连 → sync timer 触发 `_pullFromSupabase` → `_applyRemoteData` → `_mergeIntoLocal`
3. `_mergeIntoLocal` 对 availability 方向 `sourceWinsTie:false`（pull 本地优先，见 `sync.js:952`），所以**本地离线改动理论上被保留**——但这是"本地优先"的隐性假设
4. **矛盾点**：如果同一字段云端也变了（B 改过），本地优先会保留 A 的旧值并覆盖 B → B 的改动丢失（与 P0-2 同源）
5. 如果 A 离线期间**新增**了记录（如一条 customerReview），pull 的 `_mergeIntoLocal` 数组按 id 合并能保住；但 A 之后若有任何 push，会把"合并后"的状态（含 B 的改动）写回，可能再冲突

**核心问题**：**没有"离线写操作日志 + 重连后按序重放"机制**。离线期间的所有 `Store.set` 之后没有对应的持久化待推送队列。一旦 LocalStorage 被 pull 的合并逻辑部分覆盖（即使只是字段级），离线改动就可能丢。

**修复建议**：
- 维护一个 `pendingWrites` 队列（LocalStorage 持久化），每次 `Sync.push` 入队；重连/网络恢复时先 flush 队列再 pull
- 或 pull 后立即触发一次 `Sync.push('reconnect-merge')` 把本地状态推上去（当前代码缺这步）

---

## 🟠 P1-2 完全无审计日志 + 无数据快照，误操作不可追溯、不可回滚

**证据**：
- `app_data.updated_by` 字段存在（`sync_table.sql:13`），`_pushToSupabase(changedBy)` 写入——**但只记了"谁最后推的"，没有记"改了哪个字段、旧值新值"**
- 没有操作日志表（无 `audit_log` / `change_history`）
- 没有定时快照/备份（对比 GitHub 方案：每次 push 是 git commit，天然有历史可回滚）

**漏洞**：
- 某兼职误删了整月排班 → upsert 覆盖 → **无法恢复**（blob 整包被覆盖，没有前一版本的副本）
- 某账号被盗覆盖数据 → 事后**无法追溯谁、何时、改了什么**（updated_by 只记最后推的人，且可被伪造）
- 洁癖脚本 `cleanup_blob_v3.sql` 直接 DELETE，**无 dry-run、无备份强制要求**

**修复建议**：
- 加 `change_log` 表：`(id, table, record_id, field, old_val, new_val, by, at)`
- 加每日快照：`pg_cron` 或前端定时把 `app_data` 拷贝到 `app_data_snapshots` 表，保留 30 天
- 洁癖脚本强制先 `CREATE TABLE app_data_backup_YYYYMMDD AS SELECT * FROM app_data`

---

## 🟡 P2-1 渲染锁 `__applyingRemote` 在 render 前就解锁，防护被架空

**证据** `sync.js:542-548`：
```js
window.__applyingRemote = true;
try {
  this._mergeIntoLocal(remoteBlob);   // 同步合并
} finally {
  setTimeout(() => { window.__applyingRemote = false; }, 0);  // ← 下一 tick 解锁
}
// ... 之后 _maybeRender() → requestAnimationFrame(() => Router.render())  // ← 下一帧（~16ms）才 render
```

**漏洞**：锁在 `setTimeout(0)`（约 4ms）后解除，而 `Router.render()` 在 `requestAnimationFrame`（约 16ms）后才执行。**render 真正跑的时候锁已经 false**。

**为什么没爆**：v146 死循环的根因"render→Store.set→push→Realtime→pull→render"被两条更硬的防线切断：
1. Realtime 回声 3s 窗口忽略（自己刚写的）
2. Realtime 回调**绝不直接 render**，只防抖 pull

但**渲染锁作为设计意图（截断 render 内副作用触发 push）实际上没起作用**——它只保护了"合并期间的同步微任务"，而 render 是异步的。这是设计缺陷，只是被其他机制兜住了。如果未来有人移除回声窗口或改了 render 时序，死循环会回来。

**修复建议**：把锁的解除放到 `Router.render()` 完成后（用回调/promise），而不是 `setTimeout(0)`。

---

## 🟡 P2-2 Realtime 回声窗口是固定 3s，弱网/高延迟会误判

**证据** `sync.js:646`：`(Date.now() - this._lastSupabaseWriteTs) < 3000`

**漏洞**：固定 3s 窗口。如果网络延迟 > 3s（弱网、跨境、Supabase 亚太节点抖动）：
- 自己的回声在 3s 后才到达 → 被当成"他人变更" → 触发 pull（无害，但多一次渲染/合并）
- 反之，若他人变更恰好在自己 push 后 2.9s 到达 → 被当成自己的回声**忽略** → **漏同步一次**（直到下次定时器 pull 才补，但有窗口期数据不一致）

**修复建议**：用 payload 里的 `updated_by` / 写入者标识对比，而不是纯时间窗口；或把窗口做成动态（基于 RTT 探测）。

---

## 🟡 P2-3 `__PANIC_SYNC__` 触发后静默永久停用，用户无感知

**证据** `sync.js:567-571`：触发后 `window.__PANIC_SYNC__ = true`，**只有关闭标签页重开才恢复**（因为变量在内存）。

**漏洞**：如果误触发（如某次网络抖动导致 8s 内 render > 6 次），同步永久停用，但 UI 可能只显示一个小圆点变化，**用户不知道要关标签页**。结果：该标签页"看起来正常但永不同步"，成为数据孤岛。

**修复建议**：触发时弹出明确 toast"同步已保护性地停用，请刷新页面"；或加一个"恢复同步"按钮（重置 `__PANIC_SYNC__`）。

---

## 🟢 P3-1 版本号硬编码散布多处，系统性脆弱

**证据**：v151 漏改 `login.html:326` 的 `v145` 硬编码（v152 补）；`login.html` 同步按钮文案也是硬编码。

**漏洞**：版本号/架构名散布在 `app.js`(×2) + `index.html`(×6) + `login.html`(×3) + `sw.js`(×3) + `version.json` 共 5 类 15 处，且 `login.html` 有**非 `?v=` 格式的硬编码文字**。任何一次发版都可能漏。

**修复建议**：footer 版本号改成读 `version.json` 动态渲染；或构建脚本自动替换所有占位符。

---

## 🟢 P3-2 洁癖依赖手动 SQL，误跑风险

**证据**：`cleanup_blob_v3.sql` 是人工在 Supabase SQL Editor 跑的 DELETE 语句，无 dry-run、无强制备份。

**漏洞**：一旦在错误的项目/环境跑（如生产库误连测试库），DELETE 立即生效。且脚本依赖用户"先 verify 再 cleanup"的纪律，无程序化保障。

**修复建议**：洁癖脚本开头强制 `CREATE TABLE app_data_backup_... AS SELECT *`，结尾校验影响行数；或做成前端"一键洁癖"按钮（带二次确认 + 自动备份）。

---

## 必须立即处理的两件事（P0）

| 优先级 | 项 | 操作 |
|---|---|---|
| 🔴 P0-1 | RLS 全员可写整库 | 立刻收紧：兼职只读到自己的数据，或至少把 `WITH CHECK` 限 admin 写 |
| 🔴 P0-2 | 并发 last-write-wins | 加 `updated_at` 乐观锁 + 冲突重试；高峰期前必须上 |

P1-1/P1-2 建议在下次发版排入；P2/P3 是健壮性改进，可渐进。

---

## 遗留待办（与本次迁移相关）

- [ ] **P0-1** RLS 策略收紧（安全退化，上线即暴露）
- [ ] **P0-2** 同步层加乐观锁/服务端合并（防并发丢数据）
- [ ] **P1-1** 离线写队列 + 重连重推
- [ ] **P1-2** 审计日志表 + 每日快照备份
- [ ] **P2-1** 渲染锁解除时机修正
- [ ] **P2-2** Realtime 回声改用写入者标识而非固定时间窗
- [ ] **P2-3** 断路器触发时明确提示用户
- [ ] **P3-1** 版本号动态化
- [ ] **P3-2** 洁癖脚本强制备份
