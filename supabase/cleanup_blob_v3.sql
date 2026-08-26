-- =====================================================
-- 洁癖 v3（最终版，基于 verify 全部结果 + 用户决策）
-- 时间：2026-07-30
-- 决策：
--   ① 唐蓉：保留 id=20，删除 id=13（重复条目）
--   ② 陈妍嫔(id=1)：保留数据，blob 里 auth_id 置 null
--   ③ public.staff 表：删除 id=1 测试员残留
-- 前置发现（来自 verify_4 块2 auth.users 全量明细）：
--   - auth.users 里**没有陈妍嫔账号**（22 个邮箱全是真实员工，无 chen*@salomon.temp）
--   - 因此不需要 auth.users 删除段
--   - 段B 幂等：即使陈妍嫔 auth_id 本来就是 null 也无害
-- ⚠️ 强警告：执行后所有设备须退出登录 + 清缓存 + 重 pull，
--           否则旧设备 push 会把唐蓉 id=13 复活
-- ⚠️ 幂等：可重复执行，无副作用
-- =====================================================

-- ---- 段A：blob 删唐蓉 id=13（保留 id=20）----
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  (SELECT COALESCE(jsonb_agg(s), '[]'::jsonb)
   FROM jsonb_array_elements(data->'staff') AS s
   WHERE NOT ((s->>'id')='13'))
)
WHERE id='main';

-- ---- 段B：blob 陈妍嫔(id=1) auth_id 置 null（幂等）----
-- 用 id 匹配，不依赖名字（避免"陈妍嫔/陈昕媛"写法差异）
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

-- ---- 段C：public.staff 表删 id=1 测试员残留 ----
-- 三重保险：id=1 AND name='测试员' AND email IS NULL
-- public.staff 表里没有陈妍嫔记录，此 DELETE 不会影响任何真实员工
DELETE FROM public.staff
WHERE id=1 AND name='测试员' AND email IS NULL;

-- ---- 段D：验证 ----

-- D1：陈妍嫔 + 唐蓉现状
-- 期望：1 条唐蓉(id=20)，陈妍嫔 auth_id=null
SELECT (s->>'id') AS id, (s->>'name') AS name, (s->>'dept') AS dept,
       (s->>'status') AS status, (s->>'auth_id') AS auth_id
FROM public.app_data, jsonb_array_elements(data->'staff') AS s
WHERE id='main' AND ((s->>'id')='1' OR (s->>'name')='唐蓉')
ORDER BY (s->>'id')::int;

-- D2：blob staff 总数（应从 23 → 22）
SELECT jsonb_array_length(data->'staff') AS staff_count_after
FROM public.app_data WHERE id='main';

-- D3：public.staff 表里 id=1 应已被删除（期望 0 rows）
SELECT id, name, email FROM public.staff WHERE id=1;

-- D4：public.staff 表里其他陈姓人员（应只剩 id=18 陈广权）
SELECT id, name, email FROM public.staff WHERE name LIKE '%陈%';