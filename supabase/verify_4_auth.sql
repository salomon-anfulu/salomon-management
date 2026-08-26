-- =====================================================
-- 补查 ④：陈妍嫔的 auth_id + auth.users 全量 + public.staff 对比
-- 用途：确认"陈妍嫔不需要登录名"是否要删 auth.users 账号
-- 用法：Supabase SQL Editor 新建 query，粘贴本段，Run
-- 时间：2026-07-30
-- =====================================================

-- 1. blob 里 id=1 陈妍嫔的 auth_id（用 id 匹配，不依赖名字）
SELECT (s->>'id')   AS id,
       (s->>'name') AS name,
       (s->>'email') AS email,
       (s->>'auth_id') AS auth_id,
       (s->>'dept') AS dept,
       (s->>'status') AS status
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND (s->>'id')='1';

-- 2. auth.users 全量明细（看陈妍嫔是否在其中、有无多余账号）
SELECT id, email, created_at FROM auth.users ORDER BY email;

-- 3. public.staff 表里 id=1 是谁（对比用，前端不读此表但顺便核对）
SELECT id, name, email, dept, status, role, auth_id
FROM public.staff
WHERE id=1 OR name LIKE '%陈%' OR name LIKE '%妍%' OR name LIKE '%昕%';
