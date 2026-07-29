-- ============================================================
-- Salomon 兼职管理系统 - Supabase Auth 用户批量创建
-- 日期: 2026-07-23
-- 用法: 在 Supabase Dashboard → SQL Editor → New query → 粘贴执行
-- 
-- 登录方式: 邮箱 + 密码
-- 邮箱格式: 拼音@salomon.temp（临时邮箱，不需要真实收件）
-- 初始密码: Salomon2026!（所有人统一，首次登录后可改）
-- ============================================================

-- ============================================================
-- 重要说明：
-- 1. 执行此脚本前，请确保 staff 表已经通过 schema.sql 创建完成
-- 2. 执行此脚本前，请确保 staff 表已经有 22 条人员数据（通过 migration.js 导入）
-- 3. 此脚本会创建 23 个 auth 用户（22 个兼职 + 1 个管理员）
-- 4. 创建后，auth 用户的 id 会自动回填到 staff.auth_id 字段
-- ============================================================

-- ------------------------------------------------------------
-- 步骤 1：给 staff 表增加 auth 相关字段（如果还没加的话）
-- ------------------------------------------------------------
ALTER TABLE IF EXISTS public.staff
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'parttime' CHECK (role IN ('admin', 'manager', 'parttime')),
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff(auth_id) WHERE auth_id IS NOT NULL;

-- ------------------------------------------------------------
-- 步骤 2：更新 staff 表的 email 和 phone 字段
-- ------------------------------------------------------------
UPDATE public.staff SET email = 'tianjiale@salomon.temp',  phone = '17613142469' WHERE name = '田佳乐';
UPDATE public.staff SET email = 'chicheng@salomon.temp',    phone = '15641153195' WHERE name = '迟骋';
UPDATE public.staff SET email = 'wangjinyu@salomon.temp',   phone = '18735796066' WHERE name = '王靳毓';
UPDATE public.staff SET email = 'zhukaiyun@salomon.temp',   phone = '13817425945' WHERE name = '朱凯赟';
UPDATE public.staff SET email = 'kongxiangyu@salomon.temp', phone = '17317692616' WHERE name = '孔祥宇';
UPDATE public.staff SET email = 'dengqiyuan@salomon.temp',  phone = '17742520904' WHERE name = '邓奇缘';
UPDATE public.staff SET email = 'yangzihao@salomon.temp',   phone = '17601250568' WHERE name = '杨子豪';
UPDATE public.staff SET email = 'wangyalan@salomon.temp',   phone = '18628916171' WHERE name = '王雅澜';
UPDATE public.staff SET email = 'liruotong@salomon.temp',   phone = '18121400532' WHERE name = '李若彤';
UPDATE public.staff SET email = 'wanglongyu@salomon.temp',  phone = '18452648526' WHERE name = '王龙宇';
UPDATE public.staff SET email = 'heqiuye@salomon.temp',     phone = '17385186797' WHERE name = '何秋烨';
UPDATE public.staff SET email = 'gongyunhao@salomon.temp',  phone = '18964138059' WHERE name = '龚赟昊';
UPDATE public.staff SET email = 'tangrong@salomon.temp',    phone = '13124679038' WHERE name = '唐蓉';
UPDATE public.staff SET email = 'lijianhua@salomon.temp',   phone = '13843050486' WHERE name = '李健华';
UPDATE public.staff SET email = 'wujiaying@salomon.temp',   phone = '15601740816' WHERE name = '吴嘉莹';
UPDATE public.staff SET email = 'yanjiazheng@salomon.temp', phone = '13917130275' WHERE name = '严佳铮';
UPDATE public.staff SET email = 'zubaidai@salomon.temp',    phone = '17599286705' WHERE name = '祖白代';
UPDATE public.staff SET email = 'chenguangquan@salomon.temp', phone = '18321137266' WHERE name = '陈广权';
UPDATE public.staff SET email = 'hesijia@salomon.temp',     phone = NULL WHERE name = '何思嘉';
UPDATE public.staff SET email = 'jiachangle@salomon.temp',  phone = '15359898665' WHERE name = '贾长乐';
UPDATE public.staff SET email = 'mayila@salomon.temp',      phone = '13821001226' WHERE name = '玛依拉';
UPDATE public.staff SET email = 'liangshiqiu@salomon.temp', phone = '13221271879' WHERE name = '梁实秋';

-- ------------------------------------------------------------
-- 步骤 3：创建管理员账号（插入 staff 表如果不存在）
-- ------------------------------------------------------------
INSERT INTO public.staff (name, dept, status, email, role)
VALUES ('管理员', '管理', 'active', 'admin@salomon.temp', 'admin')
ON CONFLICT (name, dept) DO NOTHING;

-- ------------------------------------------------------------
-- 步骤 4：批量创建 auth.users
-- 使用 Supabase 内部的加密方式
-- ------------------------------------------------------------
-- 注意：直接 INSERT INTO auth.users 是 Supabase 官方支持的批量创建方式
-- 参考：https://supabase.com/docs/reference/sql/auth-schema

-- 统一初始密码的 bcrypt hash: Salomon2026!
-- 使用 crypt() 函数生成
DO $$
DECLARE
  _hashed_pw TEXT;
  _user_id UUID;
  _staff RECORD;
  _app_role TEXT;
BEGIN
  _hashed_pw := crypt('Salomon2026!', gen_salt('bf'));
  
  -- 遍历所有有 email 的 staff
  FOR _staff IN SELECT id, name, email FROM public.staff WHERE email IS NOT NULL LOOP
    -- 跳过已存在的用户
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = _staff.email) THEN
      RAISE NOTICE '用户已存在，跳过: %', _staff.email;
      CONTINUE;
    END IF;
    
    -- 确定 role
    SELECT role INTO _app_role FROM public.staff WHERE id = _staff.id;
    _app_role := COALESCE(_app_role, 'parttime');
    
    -- 创建 auth 用户
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      phone,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      _staff.email,
      _hashed_pw,
      now(),
      NULL,
      jsonb_build_object('provider', 'email', 'providers', '["email"]'),
      jsonb_build_object('name', _staff.name, 'staff_id', _staff.id, 'role', _app_role),
      now(),
      now(),
      NULL
    ) RETURNING id INTO _user_id;
    
    -- 回填 auth_id 到 staff 表
    UPDATE public.staff SET auth_id = _user_id WHERE id = _staff.id;
    
    RAISE NOTICE '创建用户成功: % (auth_id: %)', _staff.email, _user_id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 步骤 5：更新 RLS 策略
-- ------------------------------------------------------------
-- 启用所有表的 RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.door_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_meta ENABLE ROW LEVEL SECURITY;

-- 给 availability 表加 auth_id 关联字段（如果还没有）
ALTER TABLE IF EXISTS public.availability
ADD COLUMN IF NOT EXISTS staff_auth_id UUID;

-- 更新 availability 的 staff_auth_id
UPDATE public.availability a
SET staff_auth_id = s.auth_id
FROM public.staff s
WHERE a.staff_id = s.id AND a.staff_auth_id IS NULL;

-- 清除旧策略
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ===== staff 表策略 =====
-- 管理员可以看到全部，员工只能看到自己
CREATE POLICY "staff_admin_all" ON public.staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.role = 'admin')
  );

CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT USING (
    auth_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.role = 'admin')
  );

-- ===== availability 表策略 =====
-- 所有人都能查看全部填报（排班需要）
CREATE POLICY "avail_read_all" ON public.availability
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 员工只能写自己的填报
CREATE POLICY "avail_write_self" ON public.availability
  FOR ALL USING (
    COALESCE(staff_auth_id, (SELECT auth_id FROM public.staff WHERE id = staff_id)) = auth.uid()
  );

-- 管理员可以写所有
CREATE POLICY "avail_admin_all" ON public.availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.role = 'admin')
  );

-- ===== 其他业务表策略 =====
-- 所有人可读
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['door_schedule', 'schedules', 'shift_changes', 'store_support', 'customer_reviews', 'performance_data', 'ratings', 'attendance']) LOOP
    EXECUTE format('CREATE POLICY "%1$s_read_all" ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "%1$s_admin_all" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.role = ''admin''))', t);
  END LOOP;
END $$;

-- sync_meta: 管理员可读写，员工可读
CREATE POLICY "sync_meta_read" ON public.sync_meta FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sync_meta_admin" ON public.sync_meta FOR ALL USING (
  EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_id = auth.uid() AND s.role = 'admin')
);

-- ============================================================
-- 完成！验证方式：
-- SELECT name, email, role, auth_id IS NOT NULL AS has_account FROM staff ORDER BY role, name;
-- ============================================================
