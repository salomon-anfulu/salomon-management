-- =====================================================
-- analyze_blob_v4.sql  —— 只读分析（零风险，可反复运行）
-- 用途：枚举 app_data(id='main').data 每个结构里的"脏数据"计数，
--       让你在跑 cleanup_blob_v4.sql 之前先看到到底有多少要清。
-- 执行位置：Supabase Dashboard → SQL Editor → 整段粘贴运行
-- 前置：app_data 表已存在（sync_table.sql 已跑）
-- 注意：本脚本只 SELECT，不修改任何数据。
-- =====================================================

-- 抽取 staff 视图（供孤儿判定复用）
DROP TABLE IF EXISTS _staff;
CREATE TEMP TABLE _staff AS
SELECT s->>'name' AS name,
       (s->>'id')::int AS id,
       s->>'status' AS status,
       s->>'email'  AS email,
       s->>'dept'   AS dept,
       s->>'avatar_color' AS avatar_color
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND (s->>'name') IS NOT NULL;

SELECT '===== 1. STAFF =====' AS section;
SELECT
  count(*)                                                  AS staff_total,
  count(*) FILTER (WHERE name IS NULL OR name = '')         AS no_name,
  count(*) FILTER (WHERE name ILIKE '%测试%' AND email IS NULL) AS test_accounts,
  count(*) FILTER (WHERE status = 'left')                   AS left_count,
  count(*) FILTER (WHERE avatar_color IS NULL)              AS missing_avatar,
  count(*) FILTER (WHERE dept IS NULL)                      AS missing_dept
FROM _staff;

SELECT '---- staff 重复 name（应只保留 1 条/人）----' AS hint;
SELECT name, count(*) AS dup
FROM _staff GROUP BY name HAVING count(*) > 1 ORDER BY dup DESC, name;

SELECT '===== 2. TOMBSTONE（累积型，洁癖应清空）=====' AS section;
SELECT
  jsonb_object_length(COALESCE(data->'_deletedIds', '{}'::jsonb))        AS deletedIds_collections,
  jsonb_object_length(COALESCE(data->'_deletedDoorSlots', '{}'::jsonb))  AS deletedDoorSlots_dates
FROM public.app_data WHERE id='main';

SELECT '===== 3. customerReviews =====' AS section;
SELECT
  jsonb_array_length(COALESCE(data->'customerReviews', '[]'::jsonb))                         AS total,
  count(*) FILTER (WHERE (r->>'_deleted') IS NOT DISTINCT FROM 'true')                       AS with_deleted_flag,
  count(*) FILTER (WHERE (r->>'staffName') NOT IN (SELECT name FROM _staff))                 AS orphan_staffName
FROM public.app_data, jsonb_array_elements(COALESCE(data->'customerReviews','[]'::jsonb)) AS r
WHERE id='main';

SELECT '---- customerReviews 重复 id ----' AS hint;
SELECT (r->>'id') AS id, count(*) AS dup
FROM public.app_data, jsonb_array_elements(COALESCE(data->'customerReviews','[]'::jsonb)) AS r
WHERE id='main' GROUP BY (r->>'id') HAVING count(*) > 1 ORDER BY dup DESC;

SELECT '===== 4. ratings =====' AS section;
SELECT
  jsonb_array_length(COALESCE(data->'ratings', '[]'::jsonb)) AS total,
  count(*) FILTER (WHERE (r->>'_deleted') IS NOT DISTINCT FROM 'true') AS with_deleted_flag
FROM public.app_data, jsonb_array_elements(COALESCE(data->'ratings','[]'::jsonb)) AS r
WHERE id='main';

SELECT '---- ratings 重复 id ----' AS hint;
SELECT (r->>'id') AS id, count(*) AS dup
FROM public.app_data, jsonb_array_elements(COALESCE(data->'ratings','[]'::jsonb)) AS r
WHERE id='main' GROUP BY (r->>'id') HAVING count(*) > 1 ORDER BY dup DESC;

SELECT '===== 5. doorSchedule（slots.staff 不在 staff 即为孤儿槽位）=====' AS section;
SELECT count(*) AS orphan_slots
FROM public.app_data, jsonb_array_elements(data->'doorSchedule') AS d, jsonb_array_elements(d->'slots') AS s
WHERE id='main' AND (s->>'staff') NOT IN (SELECT name FROM _staff);

SELECT '===== 6. shiftChanges（applicant/target 不在 staff）=====' AS section;
SELECT count(*) AS orphan_rows
FROM public.app_data, jsonb_array_elements(COALESCE(data->'shiftChanges','[]'::jsonb)) AS r
WHERE id='main' AND ((r->>'applicant') NOT IN (SELECT name FROM _staff) OR (r->>'target') NOT IN (SELECT name FROM _staff));

SELECT '===== 7. storeSupport（staff 不在 staff）=====' AS section;
SELECT count(*) AS orphan_rows
FROM public.app_data, jsonb_array_elements(COALESCE(data->'storeSupport','[]'::jsonb)) AS r
WHERE id='main' AND (r->>'staff') NOT IN (SELECT name FROM _staff);

SELECT '===== 8. schedules（staffId 不在 staff）=====' AS section;
SELECT count(*) AS orphan_rows
FROM public.app_data, jsonb_array_elements(COALESCE(data->'schedules','[]'::jsonb)) AS r
WHERE id='main' AND ((r->>'staffId')::int) NOT IN (SELECT id FROM _staff);

SELECT '===== 9. attendance（staffId 不在 staff / 重复 staffId+date）=====' AS section;
SELECT
  count(*) FILTER (WHERE ((r->>'staffId')::int) NOT IN (SELECT id FROM _staff)) AS orphan_rows,
  (SELECT count(*) FROM (
     SELECT (r->>'staffId'), (r->>'date')
     FROM public.app_data, jsonb_array_elements(COALESCE(data->'attendance','[]'::jsonb)) AS r
     WHERE id='main'
     GROUP BY (r->>'staffId'), (r->>'date') HAVING count(*) > 1) x
  ) AS duplicate_pairs
FROM public.app_data, jsonb_array_elements(COALESCE(data->'attendance','[]'::jsonb)) AS r
WHERE id='main';

SELECT '===== 10. linggongAttendance.records（name 不在 staff / 重复 name+date）=====' AS section;
SELECT
  count(*) FILTER (WHERE (r->>'name') NOT IN (SELECT name FROM _staff)) AS orphan_rows,
  (SELECT count(*) FROM (
     SELECT (r->>'name'), (r->>'date')
     FROM public.app_data, jsonb_array_elements(data->'linggongAttendance'->'records') AS r
     WHERE id='main'
     GROUP BY (r->>'name'), (r->>'date') HAVING count(*) > 1) x
  ) AS duplicate_pairs
FROM public.app_data, jsonb_array_elements(data->'linggongAttendance'->'records') AS r
WHERE id='main';

SELECT '===== 11. performanceData（各月 records.name 不在 staff）=====' AS section;
SELECT pk AS month,
       count(*) FILTER (WHERE (r->>'name') NOT IN (SELECT name FROM _staff)) AS orphan_rows
FROM public.app_data, jsonb_each(data->'performanceData') AS p(pk,pv), jsonb_array_elements(pv->'records') AS r
WHERE id='main' GROUP BY pk ORDER BY pk;

SELECT '===== 12. availability（孤儿 name 键 / _deleted 日期）=====' AS section;
SELECT
  (SELECT count(*) FROM public.app_data, jsonb_each(data->'availability'->'months') AS m(mk,mv), jsonb_each(mv->'data') AS n(nk,nv)
   WHERE id='main' AND n.nk NOT IN (SELECT name FROM _staff)) AS orphan_name_keys,
  (SELECT count(*) FROM public.app_data, jsonb_each(data->'availability'->'months') AS m(mk,mv), jsonb_each(mv->'data') AS n(nk,nv), jsonb_each(nv->'dates') AS d(dk,dv)
   WHERE id='main' AND (dv->>'_deleted') IS NOT DISTINCT FROM 'true') AS deleted_dates;

SELECT '===== 分析结束 =====' AS done;
DROP TABLE IF EXISTS _staff;
