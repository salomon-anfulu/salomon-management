-- =====================================================
-- 置全员 must_change_pw=true（强制下次登录改密）
-- 配合 v153 自助改密功能。只需跑一次。
-- 幂等：重复跑结果一致。
-- =====================================================

-- 段 A：给所有 staff 条目加 must_change_pw=true
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_set(s, '{must_change_pw}', 'true'::jsonb, true)
       FROM jsonb_array_elements(data->'staff') s
     )),
    '[]'::jsonb
  )
)
WHERE id = 'main';

-- 段 B：安全网——若 blob 中仍残留已离职李若彤（id=10），一并移除
-- （app.js defaults.staff 已删该条目，但历史 blob 可能残留）
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  COALESCE(
    (SELECT jsonb_agg(s)
     FROM jsonb_array_elements(data->'staff') s
     WHERE (s->>'id')::int <> 10 AND (s->>'name') <> '李若彤'),
    '[]'::jsonb
  )
)
WHERE id = 'main';

-- 段 C：验证（应看到每个人 must_change=true，且李若彤不在列表）
SELECT
  (s->>'id')::int AS id,
  (s->>'name') AS name,
  (s->>'email') AS email,
  (s->>'must_change_pw') AS must_change
FROM public.app_data, jsonb_array_elements(data->'staff') s
WHERE id = 'main'
ORDER BY (s->>'id')::int;
