-- =====================================================
-- 第一性原理洁癖（针对 app_data blob 的 staff）
-- ⚠️ 前置：必须先跑 verify.sql（本目录）确认脏数据存在
-- ⚠️ 危险：直接改 app_data.data jsonb，影响所有设备
-- ⚠️ 执行后：所有设备须「退出登录 + 清浏览器缓存 + 重新登录 pull」，
--            否则旧设备下次 push 会把脏数据复活（_mergeLocalIntoShared
--            会把本地 staff 合并回 shared，重新加回被删的人）
-- 时间：2026-07-30
--
-- 说明：原 cleanup.sql 洁癖的是 public.staff 表，但前端当前不读取该表
--       （同步走 app_data 整 blob），所以那份对前端 UI 无效。
--       真正的洁癖必须针对 app_data.data.staff，即本脚本。
-- =====================================================

-- ---------- 洁癖1：删除 blob staff 中的脏数据 ----------
--   测试员(id=1 且 email 为 null) + 李若彤(email/name 命中)
UPDATE public.app_data
SET data = jsonb_set(
  data, '{staff}',
  COALESCE((
    SELECT jsonb_agg(s) FROM (
      SELECT jsonb_array_elements(data->'staff') AS s
      FROM public.app_data WHERE id='main'
    ) x
    WHERE NOT ( (x.s->>'id')::int = 1 AND (x.s->>'email') IS NULL )
      AND (x.s->>'email') IS DISTINCT FROM 'liruotong@salomon.temp'
      AND (x.s->>'name')  IS DISTINCT FROM '李若彤'
  ), '[]'::jsonb)
)
WHERE id='main';

-- ---------- 洁癖2：补建田佳乐 / 杨子豪 ----------
--   若 blob 内无同名则插入最小对象；前端 app.js 每次启动会从
--   defaults.staff 补建/修正其余字段（dept/status 等），此处仅保证"存在"
UPDATE public.app_data
SET data = jsonb_set(
  data, '{staff}',
  (data->'staff') ||
  CASE WHEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'staff') s WHERE s->>'name'='田佳乐')
       THEN '[{"id":9901,"name":"田佳乐","dept":"Service Team","status":"active"}]'::jsonb ELSE '[]'::jsonb END ||
  CASE WHEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'staff') s WHERE s->>'name'='杨子豪')
       THEN '[{"id":9902,"name":"杨子豪","dept":"Service Team","status":"active"}]'::jsonb ELSE '[]'::jsonb END
)
WHERE id='main';

-- ---------- 洁癖后验证 ----------
SELECT (s->>'id') AS id, (s->>'name') AS name,
       (s->>'dept') AS dept, (s->>'status') AS status
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main'
ORDER BY (s->>'id')::int;
