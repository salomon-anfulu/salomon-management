-- =====================================================
-- v154 补全：给 blob staff 补 email + 追加 admin 条目
-- 配合 change-password.js 邮件匹配改密功能
-- 前置：set_must_change_pw.sql 已先跑过
-- 幂等：重复跑结果一致
-- =====================================================

-- 段 A：补 email 字段 + 把陈妍嫔(id=1, 全职无登录) must_change_pw 改为 false
--       其他 21 个员工（id 2~23 跳 10）保留原 must_change_pw（首次跑=true）
--       李若彤(id=10) 已离职，WHERE 排除
UPDATE public.app_data
SET data = jsonb_set(
  data,
  '{staff}',
  COALESCE(
    (SELECT jsonb_agg(
       CASE (s->>'id')::int
         WHEN 1  THEN jsonb_set(s, '{must_change_pw}', 'false'::jsonb)  -- 陈妍嫔全职无登录
         ELSE s || jsonb_build_object('email',
           CASE (s->>'id')::int
             WHEN 2  THEN 'tianjiale@salomon.temp'
             WHEN 3  THEN 'chicheng@salomon.temp'
             WHEN 4  THEN 'wangjinyu@salomon.temp'
             WHEN 5  THEN 'zhukaiyun@salomon.temp'
             WHEN 6  THEN 'kongxiangyu@salomon.temp'
             WHEN 7  THEN 'dengqiyuan@salomon.temp'
             WHEN 8  THEN 'yangzihao@salomon.temp'
             WHEN 9  THEN 'wangyalan@salomon.temp'
             WHEN 11 THEN 'wanglongyu@salomon.temp'
             WHEN 12 THEN 'heqiuye@salomon.temp'
             WHEN 13 THEN 'gongyunhao@salomon.temp'
             WHEN 14 THEN 'yanjiazheng@salomon.temp'
             WHEN 15 THEN 'zubaidai@salomon.temp'
             WHEN 16 THEN 'chenguangquan@salomon.temp'
             WHEN 17 THEN 'jiachangle@salomon.temp'
             WHEN 18 THEN 'mayila@salomon.temp'
             WHEN 19 THEN 'liangshiqiu@salomon.temp'
             WHEN 20 THEN 'tangrong@salomon.temp'
             WHEN 21 THEN 'lijianhua@salomon.temp'
             WHEN 22 THEN 'wujiaying@salomon.temp'
             WHEN 23 THEN 'hesijia@salomon.temp'
           END
         )
       END
     )
     FROM jsonb_array_elements(data->'staff') s
     WHERE (s->>'id')::int <> 10  -- 排除已离职李若彤
    ),
    '[]'::jsonb
  ) ||
  -- 段 B：追加 admin 条目（id=24）—— 已存在则跳过（EXISTS）
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM jsonb_array_elements((SELECT data->'staff' FROM public.app_data WHERE id='main')) s
      WHERE (s->>'id')::int = 24
    ) THEN '[]'::jsonb
    ELSE jsonb_build_array(
      jsonb_build_object(
        'id', 24,
        'name', 'admin',
        'email', 'admin@salomon.temp',
        'dept', 'Admin',
        'status', 'active',
        'role', 'manager',
        'must_change_pw', true
      )
    )
  END
)
WHERE id = 'main';

-- 段 C：验证（应 23 条：id 1-23 跳 10 + id 24 admin）
--       email 列 21 个员工 + admin 共 22 条非空
--       must_change 列：id=1=false；其他 21 员工 + admin =true（已改密过的会变 false）
SELECT
  (s->>'id')::int    AS id,
  s->>'name'         AS name,
  s->>'email'        AS email,
  s->>'must_change_pw' AS must_change,
  s->>'role'         AS role
FROM public.app_data, jsonb_array_elements(data->'staff') s
WHERE id = 'main'
ORDER BY (s->>'id')::int;
