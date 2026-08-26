-- =====================================================
-- 验证 ③：public.staff 遗留表 + 两源计数对比 + auth.users 体检
-- 用法：在 Supabase SQL Editor 新建 query，粘贴本段，Run
-- 时间：2026-07-30
-- =====================================================

-- 块5：public.staff 表（遗留表，仅作对比；前端当前不读取）
SELECT id, name, email, dept, status, role, auth_id, is_deleted
FROM public.staff
ORDER BY id;

-- 块6：两真相源计数对比（前端只用 app_data.staff）
SELECT 'app_data.staff' AS source,
       jsonb_array_length(COALESCE(data->'staff','[]'))::text AS n
FROM public.app_data WHERE id='main'
UNION ALL
SELECT 'public.staff(未删)', count(*)::text
FROM public.staff WHERE COALESCE(is_deleted,false)=false;

-- 块7：auth.users 体检
SELECT email, count(*) FROM auth.users GROUP BY email HAVING count(*)>1;  -- 应 0 行
SELECT 'auth.users total' AS k, count(*)::text AS v FROM auth.users;
