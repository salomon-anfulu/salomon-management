-- =====================================================
-- 第一性原理验证脚本（只读，零风险）
-- 目标：不依赖任何"应该"，直接从数据库实际状态反查
--       框架对 Supabase 的硬依赖是否真的成立
-- 用法：整段粘贴到 Supabase SQL Editor 运行，结果全部贴回分析
-- 时间：2026-07-30
-- 背景：前端同步走 app_data 整 blob（Store 整包），
--       并非逐表同步；public.staff 表为早期遗留，前端当前不读取
-- =====================================================

-- ---------- 块1：app_data 表结构 ----------
-- 框架硬依赖（supabase-client.js L513-540 / sync.js）：
--   id text PK DEFAULT 'main' / data jsonb NOT NULL / updated_by text / updated_at timestamptz
--   + RLS 策略 app_data_authed_rw（auth.role()='authenticated'）
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='app_data') AS app_data_table,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='data') AS has_data_col,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='updated_by') AS has_updated_by,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='updated_at') AS has_updated_at,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_data') AS app_data_rls_policies,
  (SELECT relrowsecurity FROM pg_class WHERE relname='app_data') AS rls_enabled;

-- ---------- 块2：app_data blob 健康度 ----------
-- 框架硬依赖（app.js L5414 isMissingCritical）：必须含 staff/availability/
--   performanceData/ratings/linggongAttendance/customerReviews；并含 _dataVersion
SELECT
  id,
  pg_typeof(data) AS data_type,
  jsonb_typeof(data) AS data_jsonb_type,
  (data ? 'staff')              AS has_staff,
  (data ? 'availability')       AS has_availability,
  (data ? 'performanceData')    AS has_performanceData,
  (data ? 'ratings')            AS has_ratings,
  (data ? 'linggongAttendance') AS has_linggongAttendance,
  (data ? 'customerReviews')    AS has_customerReviews,
  (data ? '_dataVersion')       AS has_version,
  data->>'_dataVersion'         AS data_version,
  jsonb_array_length(COALESCE(data->'staff','[]')) AS staff_count,
  updated_at
FROM public.app_data WHERE id='main';

-- ---------- 块3：blob 内 staff 全量体检 ----------
-- 验证：有无 测试员(id=1,email null) / 李若彤 / 田佳乐 / 杨子豪 / 重复 id
SELECT
  (s->>'id')     AS id,
  (s->>'name')   AS name,
  (s->>'email')  AS email,
  (s->>'dept')   AS dept,
  (s->>'status') AS status,
  (s->>'auth_id') AS auth_id
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main'
ORDER BY (s->>'id')::int;

-- ---------- 块4：blob staff 重复 id 检测 ----------
SELECT (s->>'id') AS dup_id, count(*) AS cnt
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main'
GROUP BY (s->>'id') HAVING count(*)>1;

-- ---------- 块5：public.staff 表（遗留表，仅作对比）----------
SELECT id, name, email, dept, status, role, auth_id, is_deleted
FROM public.staff
ORDER BY id;

-- ---------- 块6：两真相源计数对比 ----------
-- 若 app_data.staff 与 public.staff 不一致，属正常（前端只用前者）
SELECT 'app_data.staff' AS source,
       jsonb_array_length(COALESCE(data->'staff','[]'))::text AS n
FROM public.app_data WHERE id='main'
UNION ALL
SELECT 'public.staff(未删)', count(*)::text
FROM public.staff WHERE COALESCE(is_deleted,false)=false;

-- ---------- 块7：auth.users 体检 ----------
SELECT email, count(*) FROM auth.users GROUP BY email HAVING count(*)>1;
SELECT 'auth.users total' AS k, count(*)::text AS v FROM auth.users;
