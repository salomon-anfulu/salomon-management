-- =====================================================
-- Supabase 数据库洁癖脚本 v2（2026-07-29）
-- 目标：auth.users <-> staff 干净对应
--   在职 23 = 1 admin + 15 Service Team + 6 仓库兼职
-- 处理内容：
--   1) 补建 田佳乐 / 杨子豪（staff 漏建，auth 已有 confirmed 账号）
--   2) 清退 李若彤（离职 id=9）
--   3) 删除 测试员 id=1（早期测试残留，email=NULL）
--   4) 去重 auth.users / staff
--   5) 按 email 回填 auth_id
--   6) 修正 role
-- 不碰业务数据（availability / door_schedule / performance_data / ...）
-- 幂等：可反复执行
--
-- 执行方式：每段用 /* ---- 段 X ---- */ 分隔，
--   复制单段到 Supabase SQL Editor 单独 Run（每段独立事务）。
--   段 B / 段 C 若报 42501 must be owner -> 整段跳过，
--   改 Dashboard > Authentication > Users 手动删重复 / 删 liruotong。
-- =====================================================

-- ---- 段 A：补建田佳乐/杨子豪 + 清退李若彤(staff) + 删测试员 ----
INSERT INTO public.staff (name, email, dept, role, status)
SELECT '田佳乐', 'tianjiale@salomon.temp', 'Service Team', 'parttime', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'tianjiale@salomon.temp');

INSERT INTO public.staff (name, email, dept, role, status)
SELECT '杨子豪', 'yangzihao@salomon.temp', 'Service Team', 'parttime', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'yangzihao@salomon.temp');

DELETE FROM public.staff WHERE id = 9 AND email = 'liruotong@salomon.temp';

-- 测试员：洁癖默认删除。如需保留改为 -> UPDATE public.staff SET status='inactive' WHERE id=1;
DELETE FROM public.staff WHERE id = 1 AND name = '测试员' AND email IS NULL;

-- ---- 段 B：删李若彤 auth 账号（⚠️ 可能撞 42501 -> 改 Dashboard 手删）----
DELETE FROM auth.users WHERE email = 'liruotong@salomon.temp';

-- ---- 段 C：去重 auth.users（保留最小 id）（⚠️ 可能撞 42501 -> 改 Dashboard 手删）----
DELETE FROM auth.users a
WHERE a.email IN (SELECT email FROM auth.users GROUP BY email HAVING count(*) > 1)
  AND a.id NOT IN (SELECT min(id) FROM auth.users GROUP BY email HAVING count(*) > 1);

-- ---- 段 D：去重 staff（保留最小 id）----
DELETE FROM public.staff s
WHERE s.email IN (SELECT email FROM public.staff WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1)
  AND s.id NOT IN (SELECT min(id) FROM public.staff WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1);

-- ---- 段 E：清悬空 auth_id + 按 email 回填 ----
UPDATE public.staff SET auth_id = NULL
WHERE auth_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth_id);

UPDATE public.staff s
SET auth_id = au.id
FROM auth.users au
WHERE s.email = au.email
  AND s.auth_id IS NULL;

-- ---- 段 F：修正 role + 验证 ----
UPDATE public.staff SET role = 'admin' WHERE email = 'admin@salomon.temp';
UPDATE public.staff SET role = 'parttime' WHERE role IS NULL OR role = '' OR role NOT IN ('admin','manager','parttime');

SELECT '=== 洁癖后验证 ===' AS report;
SELECT
  (SELECT count(*) FROM public.staff) AS staff_total,
  (SELECT count(*) FROM auth.users) AS auth_total,
  (SELECT count(auth_id) FROM public.staff) AS linked,
  (SELECT count(*) FROM public.staff WHERE role = 'admin') AS admin_count,
  (SELECT count(*) FROM public.staff WHERE dept = 'Service Team' AND status = 'active') AS st_active,
  (SELECT count(*) FROM public.staff WHERE dept = '仓库兼职' AND status = 'active') AS wh_active;
