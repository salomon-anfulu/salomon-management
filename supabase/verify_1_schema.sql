-- =====================================================
-- 验证 ①：app_data 表结构 + blob 健康度（标量，单行）
-- 用法：在 Supabase SQL Editor 新建 query，粘贴本段，Run
-- 时间：2026-07-30
-- =====================================================

-- 块1：app_data 表结构（框架硬依赖）
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='app_data') AS app_data_table,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='data') AS has_data_col,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='updated_by') AS has_updated_by,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='app_data' AND column_name='updated_at') AS has_updated_at,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_data') AS app_data_rls_policies,
  (SELECT relrowsecurity FROM pg_class WHERE relname='app_data') AS rls_enabled;

-- 块2：app_data blob 健康度（前端 Store 整包）
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
