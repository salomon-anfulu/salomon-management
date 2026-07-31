-- ============================================================
-- 全员「邮件登录人 vs 填报人」一致性验证 (v160)
-- 日期: 2026-07-31
-- 用途: 一键检查 22 个兼职 + 1 个管理员，共 23 个账号：
--       每个登录邮箱 → 查到的 public.staff 记录 → 姓名一致性
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
-- 输出: 一张总览表（最关键）+ 异常检测（应该没有 ⚠️ 行）
-- ============================================================

-- ==== A. 总览表：每个登录账号的「邮件↔数据库员工↔登录判定」 ====
-- 这一段是核心：每行就是一个员工，看 "登录邮箱 → 数据库员工" 一一对应是否正确
SELECT
  au.email AS 登录邮箱,
  au.raw_user_meta_data->>'name' AS auth元数据里的姓名,
  s.id AS 数据库id,
  s.name AS 数据库姓名,
  s.dept AS 部门,
  s.role AS 角色,
  s.status AS 状态,
  CASE
    WHEN s.id IS NULL THEN '❌ 数据库无此员工'
    WHEN s.auth_id IS NULL THEN '⚠️ 数据库员工无 auth_id（登录会失败）'
    WHEN s.status != 'active' THEN '⚠️ 状态非 active'
    ELSE '✅ 正常'
  END AS 判定结果
FROM auth.users au
LEFT JOIN public.staff s ON s.auth_id = au.id
WHERE au.email LIKE '%@salomon.temp'
ORDER BY s.role DESC NULLS LAST, s.id NULLS LAST;

-- ==== B. 异常 1：数据库有员工但 auth.users 找不到（孤儿员工） ====
SELECT id, name, email, dept, role,
       '⚠️ 数据库有员工但无 auth 账号' AS 问题
FROM public.staff s
WHERE email LIKE '%@salomon.temp'
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.email = s.email)
  AND is_deleted = false;

-- ==== C. 异常 2：auth_id 为空的员工（无法通过登录找到） ====
SELECT id, name, email, dept, role,
       '⚠️ auth_id 缺失，需用 fix_admin_auth_id.sql 回填' AS 问题
FROM public.staff
WHERE email LIKE '%@salomon.temp'
  AND auth_id IS NULL
  AND is_deleted = false;

-- ==== D. （保留为空：依赖 raw_user_meta_data->>'name'，本系统未填写此字段，无意义） ====

-- ==== E. 同一 auth_id 被多个人引用（极端错位） ====
SELECT
  auth_id,
  COUNT(*) AS 引用人数,
  string_agg(id::text || ':' || name, ', ') AS 涉及员工,
  '❌ auth_id 重复' AS 问题
FROM public.staff
WHERE auth_id IS NOT NULL AND is_deleted = false
GROUP BY auth_id
HAVING COUNT(*) > 1;

-- ==== F. 汇总（v161 修正：判定条件改为「邮箱匹配 + auth_id 已绑定」） ====
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@salomon.temp') AS 总账号数,
  (SELECT COUNT(*) FROM public.staff WHERE email LIKE '%@salomon.temp' AND is_deleted = false) AS 总员工数,
  (SELECT COUNT(*) FROM public.staff s JOIN auth.users au ON au.id = s.auth_id
    WHERE au.email LIKE '%@salomon.temp' AND s.is_deleted = false
      AND au.email = s.email) AS 一致账号数;