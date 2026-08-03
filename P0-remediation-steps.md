# P0 安全修复 · 分步执行说明（v168）

> 前端代码（XSS 转义 + CSP）已随 v168 提交并 push。
> 数据库侧 RLS 修复**必须管理员在 Supabase Dashboard → SQL Editor 执行**（anon key 无写权）。
> 全部执行完后：**所有设备退登 + 清浏览器缓存 + 重登**。

---

## 第 0 步（强烈建议先做）：核对线上真实策略

仓库里 4 份 SQL 的 RLS 互相矛盾（见 security-review-v167.md P2-1），先确认哪份生效：

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename, policyname;
```

把结果贴回，据此确认下面的修复覆盖了真实生效的策略。

---

## 第 1 步（必做）：跑 `supabase/fix_p0_rls.sql`

在 SQL Editor 整段粘贴 `supabase/fix_p0_rls.sql` 执行。它做了：

1. **P0-2 禁自提权**：`staff` 表改为 `FOR ALL USING(is_admin()) WITH CHECK(is_admin())` —— 缺 `WITH CHECK` 时任意登录用户能 `INSERT role='admin'` 的自己，现在被拒；`availability` 表补 `WITH CHECK`，只能写自己 `staff_auth_id` 的行，无法伪造他人排班。
2. **P0-1 即时缓解**：`app_data` 加结构性 `WITH CHECK`，要求写入的 blob 必须含 `staff`/`availability`/`performanceData` 顶层键 → 杜绝"整包清空/替换为空"的原始攻击原语（兼职仍能整包提交，业务不受影响）。
3. **P1-1 收窄**：`password_reset_requests` 表 anon 只能插入 `status='pending'` 的干净行（不能伪造已处理/冒用 `handled_by`），只有 admin 能读/改。
4. 末尾 `SELECT` 会打印 4 张表的最终生效策略，确认 `with_check` 列不再为空。

⚠️ 该脚本会 DROP 这 4 张表上的**所有**旧 policy 再重建，确保旧的全开放策略被清掉。

---

## 第 2 步（可选但推荐）：彻底收口 `app_data` 写路径

先确认第 1 步后系统同步正常，再单独跑 `supabase/fix_p0_appdata_merge.sql`：

- 新建 `merge_app_data(patch jsonb)` 服务端合并函数（SECURITY DEFINER），写入路径收口到函数；
- 撤销 `authenticated` 对 `app_data` 的直接 INSERT/UPDATE/DELETE（保留 SELECT）；
- **需前端配合**：把 `js/sync.js` 的 `appData.save` 从 `from('app_data').upsert(...)` 改为 `client.rpc('merge_app_data', { patch: blob })`。改完必须 `node --check js/sync.js` 并本地验证"我的填报能保存、工作台能刷新"。
- 回滚见文件内注释。

> 注：共享单 blob 的**根本性**隔离（per-user 行 + 行级 RLS）需数据模型重构，超出本次快速修复范围；当前两步走已封堵"清空全店""自提权为 admin""XSS 窃令牌"三条利用链。

---

## 第 3 步：验证

1. 普通兼职账号登录 → 控制台试 `from('staff').insert({name:'x',role:'admin'})` → 应报 `policy ... WITH CHECK` 拒绝（P0-2 生效）。
2. 任一页面把某员工姓名临时改成 `<b>test</b>`（经管理员在「人员管理」改）→ 全局 banner / 排行榜应显示纯文本 `<b>test</b>` 而非加粗（P0-3 生效）。
3. 打开 DevTools Network，刷新页面 → 应看不到发往非 `supabase.co` 域名的请求（CSP connect-src 生效）。
4. `SELECT` 第 0 步的 `pg_policies`，确认 `with_check` 非空。

---

## 第 4 步：清理与收尾

- `supabase/password_reset_requests.sql`（v166 建表脚本）若还没跑过，现在一并执行（第 1 步的 RLS 依赖该表存在；表不存在时第 1 步对它的 policy 创建会报"relation does not exist"，先建表再跑 RLS）。
- 全员通知退登清缓存。
