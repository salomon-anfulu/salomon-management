-- =====================================================
-- 验证 ②：blob 内 staff 全量体检 + 重复 id 检测（多行明细）
-- 用法：在 Supabase SQL Editor 新建 query，粘贴本段，Run
-- 时间：2026-07-30
-- 说明：前端实际渲染的 staff 来自 app_data.data.staff（Store 整包），
--       不是 public.staff 表——这是第一性原理核查的关键发现
-- =====================================================

-- 块3：blob 内 staff 全量（脏数据体检核心）
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

-- 块4：blob staff 重复 id 检测（应返回 0 行）
SELECT (s->>'id') AS dup_id, count(*) AS cnt
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main'
GROUP BY (s->>'id') HAVING count(*)>1;
