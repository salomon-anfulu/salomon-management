-- ============================================================
-- 修复：admin 账号的 auth_id 回填
-- 日期: 2026-07-31 (v160)
-- 用途: admin@salomon.temp 登录后，auth-guard.js 按 auth_id 在 staff 表里查，
--       如果 admin 行 auth_id 为空，会 fall-through 到「未登录」。
-- 用法: Supabase Dashboard → SQL Editor → 粘贴 → Run
-- 验证: 最后一段会输出 admin 行现在的 auth_id 是否已绑定
-- ============================================================

-- 1. 修复前快照：看下当前状态
SELECT id, name, email, role, auth_id IS NULL AS auth_id_missing
FROM public.staff
WHERE name = '管理员' OR email = 'admin@salomon.temp';

-- 2. 按 email 从 auth.users 反查 auth_id，回填到 public.staff
UPDATE public.staff s
SET auth_id = au.id
FROM auth.users au
WHERE au.email = s.email
  AND s.email = 'admin@salomon.temp'
  AND s.auth_id IS NULL;

-- 3. 修复后确认：admin 行 auth_id 已绑定
SELECT
  s.id,
  s.name,
  s.email,
  s.role,
  CASE WHEN s.auth_id IS NOT NULL THEN '✅ auth_id 已绑定'
       ELSE '⚠️ auth_id 仍为空（auth.users 里也找不到 admin@salomon.temp）' END AS status
FROM public.staff s
WHERE s.email = 'admin@salomon.temp';