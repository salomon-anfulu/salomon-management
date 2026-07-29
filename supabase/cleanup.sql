-- =====================================================
-- Supabase 数据库洁癖脚本
-- 目标：auth.users ↔ staff 干净对应，去重/回填/role 正确
-- 不碰业务数据（availability / door_schedule 等真实填报）
-- 幂等：可反复执行，不会误删
-- =====================================================

-- ========== Part 1：诊断报告（先看问题）==========
SELECT '=== 各表行数 ===' AS report;

SELECT 'staff'         AS tbl, count(*) AS rows FROM public.staff
UNION ALL SELECT 'auth.users',           count(*) FROM auth.users
UNION ALL SELECT 'availability',         count(*) FROM public.availability
UNION ALL SELECT 'door_schedule',        count(*) FROM public.door_schedule
UNION ALL SELECT 'schedules',            count(*) FROM public.schedules
UNION ALL SELECT 'shift_changes',        count(*) FROM public.shift_changes
UNION ALL SELECT 'store_support',        count(*) FROM public.store_support
UNION ALL SELECT 'customer_reviews',     count(*) FROM public.customer_reviews
UNION ALL SELECT 'performance_data',     count(*) FROM public.performance_data
UNION ALL SELECT 'ratings',              count(*) FROM public.ratings
UNION ALL SELECT 'attendance',           count(*) FROM public.attendance
UNION ALL select 'sync_meta',            count(*) from public.sync_meta;

SELECT '=== staff 重复 email ===' AS report;
SELECT email, count(*) AS cnt FROM public.staff WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1;

SELECT '=== auth.users 重复 email ===' AS report;
SELECT email, count(*) AS cnt FROM auth.users GROUP BY email HAVING count(*) > 1;

SELECT '=== 孤儿 staff（有 email 但 auth.users 无匹配）===' AS report;
SELECT s.name, s.email FROM public.staff s WHERE s.email IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = s.email);

SELECT '=== 孤儿 auth（auth.users 有但 staff 无匹配）===' AS report;
SELECT au.email FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.email = au.email);

SELECT '=== staff.auth_id 回填情况 ===' AS report;
SELECT count(*) AS total, count(auth_id) AS linked FROM public.staff;

SELECT '=== role 分布 ===' AS report;
SELECT COALESCE(role, 'NULL') AS role, count(*) FROM public.staff GROUP BY role ORDER BY role;

-- ========== Part 2：安全洁癖（幂等，不碰业务数据）==========

-- 1. 删 auth.users 重复（保留 id 最小的一行）
DELETE FROM auth.users a
WHERE a.email IN (SELECT email FROM auth.users GROUP BY email HAVING count(*) > 1)
  AND a.id NOT IN (SELECT min(id) FROM auth.users GROUP BY email HAVING count(*) > 1);

-- 2. 删 staff 重复（保留 id 最小的一行）
DELETE FROM public.staff s
WHERE s.email IN (SELECT email FROM public.staff WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1)
  AND s.id NOT IN (SELECT min(id) FROM public.staff WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1);

-- 3. 清理 staff.auth_id 指向已删除 auth 的行（置 NULL 以便重新回填）
UPDATE public.staff SET auth_id = NULL
WHERE auth_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = auth_id);

-- 4. 按 email 重新回填 auth_id（保证 23 对 23 关联）
UPDATE public.staff s
SET auth_id = au.id
FROM auth.users au
WHERE s.email = au.email
  AND s.auth_id IS NULL;

-- 5. 修正 role：admin 必须是 admin，其余默认 parttime
UPDATE public.staff SET role = 'admin' WHERE email = 'admin@salomon.temp';
UPDATE public.staff SET role = 'parttime' WHERE role IS NULL OR role = '' OR role NOT IN ('admin','manager','parttime');

-- 6. 重新验证洁癖结果
SELECT '=== 洁癖后验证 ===' AS report;
SELECT
  (SELECT count(*) FROM public.staff) AS staff_total,
  (SELECT count(*) FROM auth.users) AS auth_total,
  (SELECT count(auth_id) FROM public.staff) AS linked,
  (SELECT count(*) FROM public.staff WHERE role = 'admin') AS admin_count;
