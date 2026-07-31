-- ============================================================
-- 账号 ↔ 员工 错位 诊断脚本
-- 日期: 2026-07-31 (v158)
-- 用途: 检查 public.staff 表的 auth_id / email / role 映射是否正确
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
--
-- 关注输出中的 ⚠️ 标记行：这些行的 auth_id 跟邮箱对不上，
-- 或者两个 staff 共享了同一个 auth_id（错位典型表现）。
-- ============================================================

-- 1. 总览：所有员工的 id / 姓名 / 邮箱 / auth_id / role
SELECT
  id,
  name,
  dept,
  email,
  role,
  status,
  CASE WHEN auth_id IS NULL THEN '⚠️ 无 auth_id'
       ELSE LEFT(auth_id::text, 8) || '...' END AS auth_id_preview
FROM public.staff
WHERE is_deleted = false
ORDER BY role DESC, dept, id;

-- 2. ⚠️ 错位检测：同一个 auth_id 被多个员工引用
SELECT
  auth_id,
  COUNT(*) AS n_staff,
  string_agg(id::text || ':' || name || '<' || COALESCE(email, '-') || '>', ', ') AS staff_list
FROM public.staff
WHERE auth_id IS NOT NULL AND is_deleted = false
GROUP BY auth_id
HAVING COUNT(*) > 1;

-- 3. ⚠️ 错位检测：同一个 email 对应多个员工
SELECT
  email,
  COUNT(*) AS n_staff,
  string_agg(id::text || ':' || name, ', ') AS staff_list
FROM public.staff
WHERE email IS NOT NULL AND is_deleted = false
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. ⚠️ 错位检测：auth.users 里的邮箱在 staff 表里对不上
SELECT
  au.email AS auth_email,
  au.id AS auth_user_id,
  au.raw_user_meta_data->>'staff_id' AS metadata_staff_id,
  s.id AS staff_table_id,
  s.name AS staff_table_name,
  CASE WHEN s.id::text = au.raw_user_meta_data->>'staff_id' THEN '✅ 一致'
       ELSE '⚠️ 不一致' END AS check_metadata_vs_staff
FROM auth.users au
LEFT JOIN public.staff s ON s.auth_id = au.id
WHERE au.email LIKE '%@salomon.temp'
ORDER BY au.email;

-- 5. ⚠️ auth_id 为空的员工（这些账号无法通过 staff 表查到 → 会 fallback 到「未登录」）
SELECT id, name, dept, email, role
FROM public.staff
WHERE auth_id IS NULL AND is_deleted = false
ORDER BY id;