-- ============================================================
-- 第一性原则检查：登录人(email) ↔ 填报人(name) 是否对应
-- 日期: 2026-08-01
--
-- 第一性原则：
--   登录动作的真实锚点是 auth.users.email（用户输的邮箱）
--   不是 staff.auth_id（可能错位）、不是 staff.id（可能错位）
--   所以我们用 email 做 JOIN key，再双重验证 auth_id 路径是否一致
--
-- 方法：
--   路径 A（email 路径）：auth.users.email → LEFT JOIN staff.email → 拿到填报人姓名
--   路径 B（auth_id 路径）：auth.users.id → LEFT JOIN staff.auth_id → 拿到填报人姓名
--   若 A、B 两路径拿到的填报人姓名不一致 → 错位 bug（auth_id 指错了人）
--   同时检测：员工有记录但无登录账号 / 登录账号无员工记录
--
-- 输出：一张完整映射表，供人工核对
-- ============================================================

WITH path_email AS (
  SELECT
    au.email AS login_email,
    au.id AS auth_user_id,
    s.name AS staff_name_by_email,
    s.id AS staff_id_by_email,
    s.auth_id AS staff_auth_id
  FROM auth.users au
  LEFT JOIN public.staff s ON s.email = au.email
  WHERE au.email LIKE '%@salomon.temp'
),
path_auth AS (
  SELECT
    au.email AS login_email,
    s.name AS staff_name_by_auth
  FROM auth.users au
  LEFT JOIN public.staff s ON s.auth_id = au.id
  WHERE au.email LIKE '%@salomon.temp'
)
SELECT
  e.login_email AS 登录邮箱,
  e.staff_name_by_email AS 填报人_按email,
  a.staff_name_by_auth AS 填报人_按auth_id,
  e.staff_id_by_email AS staff_id,
  CASE
    WHEN e.staff_name_by_email IS NULL
      THEN '❌ 邮箱无对应员工记录（登录后看不到自己）'
    WHEN a.staff_name_by_auth IS NULL
      THEN '⚠️ auth_id 无对应员工（auth_id 字段为空或指错）'
    WHEN e.staff_name_by_email != a.staff_name_by_auth
      THEN '❌ 错位：email 对员工≠auth_id 对员工'
    ELSE '✅ 对应正确'
  END AS 判定结果
FROM path_email e
LEFT JOIN path_auth a ON a.login_email = e.login_email
ORDER BY
  CASE WHEN e.staff_name_by_email != a.staff_name_by_auth THEN 0
       WHEN e.staff_name_by_email IS NULL THEN 1
       WHEN a.staff_name_by_auth IS NULL THEN 2
       ELSE 3 END,
  e.login_email;

-- 反向检查：staff 表有 email 但无 auth 账号的孤儿（admin 除外，admin 有独立账号）
SELECT
  s.email AS 员工邮箱,
  s.name AS 填报人姓名,
  s.id AS staff_id,
  s.auth_id IS NOT NULL AS auth_id_已绑定,
  '⚠️ 员工有记录但无登录账号（或 auth_id 错位）' AS 问题
FROM public.staff s
WHERE s.email LIKE '%@salomon.temp'
  AND s.is_deleted = false
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = s.email)
ORDER BY s.email;
