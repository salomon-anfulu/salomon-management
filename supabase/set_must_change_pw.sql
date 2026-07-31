-- =====================================================
-- 置全员 must_change_pw=true（强制下次登录改密）
-- 配合 v153 自助改密功能。只需跑一次，幂等。
-- =====================================================

-- 段 A：一次 UPDATE 同时完成两件事
--   1) 过滤掉已离职李若彤（id=10）—— 安全网
--   2) 给剩下所有人加 must_change_pw=true
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  COALESCE(
    (SELECT jsonb_agg(
       s || jsonb_build_object('must_change_pw', true)
     )
     FROM jsonb_array_elements(data->'staff') s
     WHERE (s->>'id')::int <> 10
       AND s->>'name' <> '李若彤'),
    '[]'::jsonb
  )
)
WHERE id = 'main';

-- 段 B：验证（应看到每个人 must_change=true，且李若彤不在列表）
SELECT
  (s->>'id')::int AS id,
  (s->>'name') AS name,
  (s->>'email') AS email,
  (s->>'must_change_pw') AS must_change
FROM public.app_data, jsonb_array_elements(data->'staff') s
WHERE id = 'main'
ORDER BY (s->>'id')::int;
