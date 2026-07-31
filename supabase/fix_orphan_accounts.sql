-- ============================================================
-- 修复：杨子豪 / 田佳乐（v163 重写）
-- 日期: 2026-08-01
--
-- 历史教训（v161/v162 失败 2 次）：
--   v161 fix_orphan_accounts.sql: 假设表里没这俩人 → INSERT id=8 → 表里 email
--         已存在（cleanup.sql 7/29 段 A 早就建过），但 id=8 是别人 → 冲突
--   v162 (列名修复): 去掉 created_at/updated_at → 还是 id=8 冲突
--   v163 (本版) : 改用 UPDATE-by-email + INSERT-WHERE-NOT-EXISTS 双保险
--
-- 根因重审（看 auth_setup.sql:86-89 + 127）：
--   - cleanup.sql 段 A 7/29 已 INSERT 杨子豪/田佳乐到 staff（email 字段填充）
--   - cleanup.sql 段 E 也按 email 回填过 auth_id（段 E 单独一行 UPDATE）
--   - 但后续 auth_setup.sql 步骤 4 遍历 staff 创建 auth.users 时，
--     LINE 86-89 看到 "auth.users 已存在就 CONTINUE 跳过",
--     导致 LINE 127 "UPDATE staff SET auth_id = _user_id" 永远没跑到
--   - v161 验证 A 段 LEFT JOIN ON s.auth_id = au.id → 杨子豪/田佳乐
--     staff 行 auth_id 仍 NULL → 标 ❌
--   - coalesce: defaults.staff.id 错位也与此无关，本 SQL 走 email 匹配
--
-- 修复策略（不 INSERT）：
--   1. UPDATE 已有行（按 email 唯一索引）→ 改写 name、补 auth_id、补 dept 等
--   2. INSERT WHERE NOT EXISTS 兜底（万一 cleanup 漏建，自动用 max(id)+1 算新 id）
--   3. 段 0/段 3 各 SELECT 一次，前后对比
-- ============================================================

-- 0. 修复前快照（这两人现状）
SELECT id, name, email, dept, status, role, avatar_color,
       CASE WHEN auth_id IS NOT NULL THEN '✅ auth_id 已绑定' ELSE '❌ auth_id 缺失' END AS auth_status
FROM public.staff
WHERE email IN ('yangzihao@salomon.temp', 'tianjiale@salomon.temp')
ORDER BY email;

-- 1. UPDATE 已有行（email 唯一，幂等）
--    即使 cleanup 留下的行 id=8 不是杨子豪/田佳乐，这段也会按 email 改写
UPDATE public.staff s
SET name = '杨子豪',
    dept = 'Service Team',
    status = 'active',
    role = 'parttime',
    avatar_color = COALESCE(s.avatar_color, '#6366f1'),
    join_date = COALESCE(s.join_date, '2026-02-20'),
    gender = COALESCE(s.gender, '男'),
    is_deleted = false,
    auth_id = au.id
FROM auth.users au
WHERE s.email = 'yangzihao@salomon.temp'
  AND au.email = 'yangzihao@salomon.temp';

UPDATE public.staff s
SET name = '田佳乐',
    dept = 'Service Team',
    status = 'active',
    role = 'parttime',
    avatar_color = COALESCE(s.avatar_color, '#8b5cf6'),
    join_date = COALESCE(s.join_date, '2026-02-01'),
    gender = COALESCE(s.gender, '男'),
    is_deleted = false,
    auth_id = au.id
FROM auth.users au
WHERE s.email = 'tianjiale@salomon.temp'
  AND au.email = 'tianjiale@salomon.temp';

-- 2. INSERT WHERE NOT EXISTS 兜底（万一 cleanup 漏建）
--    用 (SELECT MAX(id) FROM public.staff) + 1 取下一个 id（避开冲突）
--    ⚠️ 串行执行：两个 INSERT 单独跑，每次都先算 max+1
INSERT INTO public.staff (id, name, email, gender, dept, join_date, status, avatar_color, role, is_deleted, auth_id)
SELECT COALESCE((SELECT MAX(id) FROM public.staff), 0) + 1,
       '杨子豪', 'yangzihao@salomon.temp', '男', 'Service Team',
       '2026-02-20', 'active', '#6366f1', 'parttime', false,
       au.id
FROM auth.users au
WHERE au.email = 'yangzihao@salomon.temp'
  AND NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'yangzihao@salomon.temp');

INSERT INTO public.staff (id, name, email, gender, dept, join_date, status, avatar_color, role, is_deleted, auth_id)
SELECT COALESCE((SELECT MAX(id) FROM public.staff), 0) + 1,
       '田佳乐', 'tianjiale@salomon.temp', '男', 'Service Team',
       '2026-02-01', 'active', '#8b5cf6', 'parttime', false,
       au.id
FROM auth.users au
WHERE au.email = 'tianjiale@salomon.temp'
  AND NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'tianjiale@salomon.temp');

-- 3. 修复后确认（这两行应都 ✅ auth_id 已绑定）
SELECT id, name, email, dept, status, role, avatar_color,
       CASE WHEN auth_id IS NOT NULL THEN '✅ auth_id 已绑定'
            ELSE '❌ auth_id 仍缺失（auth.users 里没这个邮箱）' END AS auth_status
FROM public.staff
WHERE email IN ('yangzihao@salomon.temp', 'tianjiale@salomon.temp')
ORDER BY email;
