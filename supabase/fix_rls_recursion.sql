-- =====================================================
-- 修复 RLS 无限递归错误
-- =====================================================
-- 根本原因：policy 在 public.staff 上又 SELECT public.staff，
-- 触发 PostgreSQL 无限递归保护，登录请求 508 失败
-- 修复：抽离 SECURITY DEFINER 函数，函数绕过 RLS 直读表

-- 1. 先清掉所有现有 policy
DO $$
DECLARE
  t TEXT; pol RECORD;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- 2. 创建 SECURITY DEFINER 函数（绕过 RLS 直读 staff）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.staff WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_auth_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth_id FROM public.staff WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 3. 授权 anon/authenticated 角色使用这些函数
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_auth_id() TO anon, authenticated;

-- 4. 重写所有 policy（用函数代替内联 SELECT）

-- staff 表
CREATE POLICY "staff_admin_all" ON public.staff
  FOR ALL USING (public.is_admin());

CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT USING (
    auth_id = auth.uid() OR public.is_admin()
  );

-- availability 表
CREATE POLICY "avail_read_all" ON public.availability
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "avail_write_self" ON public.availability
  FOR ALL USING (
    COALESCE(staff_auth_id, public.current_staff_auth_id()) = auth.uid()
  );

CREATE POLICY "avail_admin_all" ON public.availability
  FOR ALL USING (public.is_admin());

-- 其他业务表
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['door_schedule', 'schedules', 'shift_changes', 'store_support', 'customer_reviews', 'performance_data', 'ratings', 'attendance']) LOOP
    EXECUTE format('CREATE POLICY "%1$s_read_all" ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "%1$s_admin_all" ON public.%1$s FOR ALL USING (public.is_admin())', t);
  END LOOP;
END $$;

-- sync_meta
CREATE POLICY "sync_meta_read" ON public.sync_meta
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sync_meta_admin" ON public.sync_meta
  FOR ALL USING (public.is_admin());

-- 5. 验证：所有 policy 都已建立
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
