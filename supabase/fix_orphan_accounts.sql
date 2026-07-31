-- ============================================================
-- 修复：杨子豪 / 田佳乐 在 public.staff 表里缺失
-- 日期: 2026-07-31 (v161)
--
-- 来源: verify_mapping.sql A 段结果
--   - yangzihao@salomon.temp (杨子豪) ❌ 数据库无此员工
--   - tianjiale@salomon.temp  (田佳乐)  ❌ 数据库无此员工
--
-- 根因: auth.users 里有这俩的登录账号，但 public.staff 表没建对应员工记录。
-- 后果: 登录后 _auth.staffId=null/_auth.staffName=null，
--       前端"我的填报"等模块看不到自己，且头部 fallback 显"未登录"。
--
-- 修复: 按 defaults.staff 的元数据 INSERT 两条记录
--   - 杨子豪: id=8, dept='Service Team', color=#6366f1, joinDate='2026-02-20'
--   - 田佳乐: id=2, dept='Service Team', color=#8b5cf6, joinDate='2026-02-01'
--
-- 验证: 跑完后重新跑 verify_mapping.sql A 段，
--       这两行应该变 ✅ 正常；F 段"总员工数"应从 21 → 22（不含 admin）。
-- ============================================================

-- 0. 修复前快照
SELECT id, name, email, dept, role, auth_id
FROM public.staff
WHERE email IN ('yangzihao@salomon.temp', 'tianjiale@salomon.temp');

-- 1. INSERT 杨子豪（id=8）
INSERT INTO public.staff (id, name, email, gender, dept, join_date, status, avatar_color, role, is_deleted, auth_id, created_at, updated_at)
SELECT 8,
       '杨子豪',
       'yangzihao@salomon.temp',
       '男',
       'Service Team',
       '2026-02-20',
       'active',
       '#6366f1',
       'parttime',
       false,
       au.id,
       NOW(),
       NOW()
FROM auth.users au
WHERE au.email = 'yangzihao@salomon.temp'
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.email = 'yangzihao@salomon.temp');

-- 2. INSERT 田佳乐（id=2）
INSERT INTO public.staff (id, name, email, gender, dept, join_date, status, avatar_color, role, is_deleted, auth_id, created_at, updated_at)
SELECT 2,
       '田佳乐',
       'tianjiale@salomon.temp',
       '男',
       'Service Team',
       '2026-02-01',
       'active',
       '#8b5cf6',
       'parttime',
       false,
       au.id,
       NOW(),
       NOW()
FROM auth.users au
WHERE au.email = 'tianjiale@salomon.temp'
  AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.email = 'tianjiale@salomon.temp');

-- 3. 修复后确认: 这两行应该都有 auth_id 绑定
SELECT id, name, email, dept, role, status,
       CASE WHEN auth_id IS NOT NULL THEN '✅ auth_id 已绑定'
            ELSE '⚠️ auth_id 仍缺失（auth.users 里没这个邮箱）' END AS status_label
FROM public.staff
WHERE email IN ('yangzihao@salomon.temp', 'tianjiale@salomon.temp')
ORDER BY id;
