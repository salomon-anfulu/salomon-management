-- =====================================================
-- 洁癖 v2（基于 verify 实际结果 + 用户决策 2026-07-30）
-- 决策：① 唐蓉保留 id=20，删除 id=13 重复条目
--       ② 陈妍嫔(id=1) 保留数据，断 auth 关联（不需要登录名）
-- 前置：先跑 verify_4_auth.sql 确认陈妍嫔是否仍需手动删 auth.users 账号
-- ⚠️ 强警告：执行后所有设备须退出登录 + 清缓存 + 重 pull，
--           否则旧设备 push 会把唐蓉 id=13 复活
-- ⚠️ 幂等：可重复执行，无副作用
-- =====================================================

-- ---- 段A：删除唐蓉 id=13 重复条目（保留 id=20）----
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  (SELECT COALESCE(jsonb_agg(s), '[]'::jsonb)
   FROM jsonb_array_elements(data->'staff') AS s
   WHERE NOT ((s->>'id')='13'))
)
WHERE id='main';

-- ---- 段B：陈妍嫔(id=1) 断 auth 关联（auth_id 置 null）----
-- 用 id 匹配，不依赖名字（避免"陈妍嫔/陈昕媛"写法差异误伤）
-- 若 verify_4 显示她 auth_id 已为 null，本段可跳过（执行也无害）
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  (SELECT COALESCE(jsonb_agg(
     CASE WHEN (s->>'id')='1' THEN jsonb_set(s, '{auth_id}', 'null'::jsonb)
          ELSE s END
   ), '[]'::jsonb)
   FROM jsonb_array_elements(data->'staff') AS s)
)
WHERE id='main';

-- ---- 段C：验证（应只剩 1 条唐蓉=id=20，陈妍嫔 auth_id=null）----
SELECT (s->>'id') AS id, (s->>'name') AS name, (s->>'dept') AS dept,
       (s->>'status') AS status, (s->>'auth_id') AS auth_id
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND ((s->>'id')='1' OR (s->>'name')='唐蓉')
ORDER BY (s->>'id')::int;

SELECT jsonb_array_length(data->'staff') AS staff_count_after
FROM public.app_data WHERE id='main';
