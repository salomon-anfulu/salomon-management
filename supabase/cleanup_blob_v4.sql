-- =====================================================
-- cleanup_blob_v4.sql  —— 全结构洁癖（最终版）
-- 时间：2026-08-02
-- 覆盖范围：staff / tombstone / customerReviews / ratings /
--          doorSchedule / shiftChanges / storeSupport /
--          schedules / attendance / linggongAttendance /
--          performanceData / availability
--
-- 安全设计：
--   ① 整段包在 BEGIN…COMMIT 事务里 —— 任一步报错自动回滚，绝不半清。
--   ② 第 0 步先快照当前 data 到 app_data(id='cleanup_backup_v4')，
--      可逆：UPDATE app_data SET data=(SELECT data FROM app_data WHERE id='cleanup_backup_v4') WHERE id='main';
--   ③ 全部操作为"按类别删除"，不依赖具体 id，幂等可重跑。
--
-- ⚠️ 强警告（必读）：
--   A. 本脚本须由管理员在 Dashboard → SQL Editor 粘贴整段运行
--      （anon key 无 app_data 写权限，前端同步靠登录后的 authenticated 会话）。
--   B. 第 12 步会清空 _deletedIds / _deletedDoorSlots 两个 tombstone。
--      清空后，所有设备必须「退出登录 + 清浏览器缓存 + 重新登录 pull」，
--      否则某台旧设备下次 push 会把曾被删除的记录复活。
--   C. 执行前建议先跑 analyze_blob_v4.sql 看计数，心里有数。
--   D. 若想保留 tombstone（例如担心有尚未同步的删除），把第 12 步两行注释掉即可。
-- =====================================================

BEGIN;

-- ---------- 0. 快照备份（可逆）----------
INSERT INTO public.app_data (id, data, updated_by, updated_at)
VALUES ('cleanup_backup_v4', (SELECT data FROM public.app_data WHERE id='main'), 'cleanup_v4', now())
ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;

-- 清理前计数
DROP TABLE IF EXISTS _before;
CREATE TEMP TABLE _before (tbl text, cnt int);
INSERT INTO _before
SELECT 'staff',            jsonb_array_length(data->'staff') FROM public.app_data WHERE id='main'
UNION ALL SELECT 'customerReviews', jsonb_array_length(COALESCE(data->'customerReviews','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'ratings',          jsonb_array_length(COALESCE(data->'ratings','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'doorSchedule',    jsonb_array_length(COALESCE(data->'doorSchedule','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'shiftChanges',    jsonb_array_length(COALESCE(data->'shiftChanges','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'storeSupport',    jsonb_array_length(COALESCE(data->'storeSupport','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'schedules',       jsonb_array_length(COALESCE(data->'schedules','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'attendance',      jsonb_array_length(COALESCE(data->'attendance','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'linggong',        jsonb_array_length(data->'linggongAttendance'->'records') FROM public.app_data WHERE id='main'
UNION ALL SELECT 'performance',     (SELECT sum(jsonb_array_length(pv->'records')) FROM jsonb_each(data->'performanceData') AS p(pk,pv)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'tombstone_ids',   jsonb_object_length(COALESCE(data->'_deletedIds','{}'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'tombstone_doors', jsonb_object_length(COALESCE(data->'_deletedDoorSlots','{}'::jsonb)) FROM public.app_data WHERE id='main';

-- staff 名称/id 集合（供孤儿判定）
DROP TABLE IF EXISTS _staff;
CREATE TEMP TABLE _staff AS
SELECT s->>'name' AS name, (s->>'id')::int AS id
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND (s->>'name') IS NOT NULL;

-- ---------- 1. staff：按 name 去重（active 优先、最小 id 保留）+ 移除测试/null ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{staff}',
  (SELECT COALESCE(jsonb_agg(s ORDER BY (s->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT s, ROW_NUMBER() OVER (
       PARTITION BY (s->>'name')
       ORDER BY ((s->>'status')='active')::int DESC, (s->>'id')::int ASC
     ) AS rn
     FROM jsonb_array_elements(data->'staff') AS s
     WHERE (s->>'name') IS NOT NULL AND (s->>'name') <> ''
       AND NOT ((s->>'name') ILIKE '%测试%' AND (s->>'email') IS NULL)
   ) t
   WHERE rn = 1
  )
)
WHERE id='main';

-- staff 清理后刷新集合（后续孤儿判定用最新名单）
TRUNCATE _staff;
INSERT INTO _staff
SELECT s->>'name', (s->>'id')::int
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND (s->>'name') IS NOT NULL;

-- ---------- 2. customerReviews：去 _deleted + 按 id 去重 + 孤儿 staffName ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{customerReviews}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'id') ORDER BY (r->>'id')::int) AS rn
     FROM jsonb_array_elements(data->'customerReviews') AS r
   ) t
   WHERE rn = 1
     AND (r->>'_deleted') IS DISTINCT FROM 'true'
     AND (r->>'staffName') IN (SELECT name FROM _staff)
  )
)
WHERE id='main';

-- ---------- 3. ratings：去 _deleted + 按 id 去重（保留 staffId 模糊匹配风险，不做孤儿删除）----------
UPDATE public.app_data
SET data = jsonb_set(data, '{ratings}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'id') ORDER BY (r->>'id')::int) AS rn
     FROM jsonb_array_elements(data->'ratings') AS r
   ) t
   WHERE rn = 1 AND (r->>'_deleted') IS DISTINCT FROM 'true'
  )
)
WHERE id='main';

-- ---------- 4. shiftChanges：按 id 去重 + 孤儿 applicant/target ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{shiftChanges}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'id') ORDER BY (r->>'id')::int) AS rn
     FROM jsonb_array_elements(data->'shiftChanges') AS r
   ) t
   WHERE rn = 1
     AND (r->>'applicant') IN (SELECT name FROM _staff)
     AND (r->>'target')    IN (SELECT name FROM _staff)
  )
)
WHERE id='main';

-- ---------- 5. storeSupport：按 id 去重 + 孤儿 staff ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{storeSupport}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'id') ORDER BY (r->>'id')::int) AS rn
     FROM jsonb_array_elements(data->'storeSupport') AS r
   ) t
   WHERE rn = 1 AND (r->>'staff') IN (SELECT name FROM _staff)
  )
)
WHERE id='main';

-- ---------- 6. schedules：按 id 去重 + 孤儿 staffId ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{schedules}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'id')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'id') ORDER BY (r->>'id')::int) AS rn
     FROM jsonb_array_elements(data->'schedules') AS r
   ) t
   WHERE rn = 1 AND ((r->>'staffId')::int) IN (SELECT id FROM _staff)
  )
)
WHERE id='main';

-- ---------- 7. attendance：按 (staffId,date) 去重 + 孤儿 staffId ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{attendance}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'date'), (r->>'staffId')::int), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (
       PARTITION BY (r->>'staffId'), (r->>'date')
       ORDER BY (r->>'staffId')::int
     ) AS rn
     FROM jsonb_array_elements(data->'attendance') AS r
   ) t
   WHERE rn = 1 AND ((r->>'staffId')::int) IN (SELECT id FROM _staff)
  )
)
WHERE id='main';

-- ---------- 8. doorSchedule：移除 slots 中 staff 不在 staff 的孤儿槽位 ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{doorSchedule}',
  (SELECT COALESCE(jsonb_agg(
     jsonb_set(d, '{slots}',
       (SELECT COALESCE(jsonb_agg(s), '[]'::jsonb)
        FROM jsonb_array_elements(d->'slots') AS s
        WHERE (s->>'staff') IN (SELECT name FROM _staff))
     )
   ORDER BY (d->>'date')), '[]'::jsonb)
   FROM jsonb_array_elements(data->'doorSchedule') AS d
  )
)
WHERE id='main';

-- ---------- 9. linggongAttendance.records：按 (name,date) 去重 + 孤儿 name ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{linggongAttendance,records}',
  (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'date'), (r->>'name')), '[]'::jsonb)
   FROM (
     SELECT r, ROW_NUMBER() OVER (
       PARTITION BY (r->>'name'), (r->>'date')
       ORDER BY (r->>'name')
     ) AS rn
     FROM jsonb_array_elements(data->'linggongAttendance'->'records') AS r
   ) t
   WHERE rn = 1 AND (r->>'name') IN (SELECT name FROM _staff)
  )
)
WHERE id='main';

-- ---------- 10. performanceData：各月 records 按 name 去重 + 孤儿 name ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{performanceData}',
  (SELECT COALESCE(jsonb_object_agg(pk, jsonb_set(pv, '{records}',
     (SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'name')), '[]'::jsonb)
      FROM (
        SELECT r, ROW_NUMBER() OVER (PARTITION BY (r->>'name') ORDER BY (r->>'name')) AS rn
        FROM jsonb_array_elements(pv->'records') AS r
      ) t
      WHERE rn = 1 AND (r->>'name') IN (SELECT name FROM _staff))
  )), '{}'::jsonb)
   FROM jsonb_each(data->'performanceData') AS p(pk,pv)
  )
)
WHERE id='main';

-- ---------- 11. availability：移除 _deleted 日期 + 孤儿 name 键 ----------
UPDATE public.app_data
SET data = jsonb_set(data, '{availability,months}',
  (SELECT COALESCE(jsonb_object_agg(mk, jsonb_set(mv, '{data}',
     (SELECT COALESCE(jsonb_object_agg(nk,
        CASE
          WHEN (nv->'dates') IS NOT NULL THEN jsonb_set(nv, '{dates}',
            (SELECT COALESCE(jsonb_object_agg(dk, dv), '{}'::jsonb)
             FROM jsonb_each(nv->'dates') AS d(dk,dv)
             WHERE (dv->>'_deleted') IS DISTINCT FROM 'true')
          )
          ELSE nv
        END
     )
     FROM jsonb_each(mv->'data') AS n(nk,nv)
     WHERE n.nk IN (SELECT name FROM _staff))
  )), '{}'::jsonb)
   FROM jsonb_each(data->'availability'->'months') AS m(mk,mv)
  ))
)
WHERE id='main';

-- ---------- 12. 清空 tombstone（⚠️ 见文件头警告 B；保留则注释本段）----------
UPDATE public.app_data SET data = jsonb_set(data, '{_deletedIds}', '{}'::jsonb) WHERE id='main';
UPDATE public.app_data SET data = jsonb_set(data, '{_deletedDoorSlots}', '{}'::jsonb) WHERE id='main';

-- ---------- 13. 自报告：清理前后对比 ----------
DROP TABLE IF EXISTS _after;
CREATE TEMP TABLE _after (tbl text, cnt int);
INSERT INTO _after
SELECT 'staff',            jsonb_array_length(data->'staff') FROM public.app_data WHERE id='main'
UNION ALL SELECT 'customerReviews', jsonb_array_length(COALESCE(data->'customerReviews','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'ratings',          jsonb_array_length(COALESCE(data->'ratings','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'doorSchedule',    jsonb_array_length(COALESCE(data->'doorSchedule','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'shiftChanges',    jsonb_array_length(COALESCE(data->'shiftChanges','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'storeSupport',    jsonb_array_length(COALESCE(data->'storeSupport','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'schedules',       jsonb_array_length(COALESCE(data->'schedules','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'attendance',      jsonb_array_length(COALESCE(data->'attendance','[]'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'linggong',        jsonb_array_length(data->'linggongAttendance'->'records') FROM public.app_data WHERE id='main'
UNION ALL SELECT 'performance',     (SELECT sum(jsonb_array_length(pv->'records')) FROM jsonb_each(data->'performanceData') AS p(pk,pv)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'tombstone_ids',   jsonb_object_length(COALESCE(data->'_deletedIds','{}'::jsonb)) FROM public.app_data WHERE id='main'
UNION ALL SELECT 'tombstone_doors', jsonb_object_length(COALESCE(data->'_deletedDoorSlots','{}'::jsonb)) FROM public.app_data WHERE id='main';

SELECT b.tbl,
       b.cnt AS before_cnt,
       a.cnt AS after_cnt,
       (b.cnt - a.cnt) AS removed
FROM _before b JOIN _after a USING(tbl)
ORDER BY b.tbl;

COMMIT;
