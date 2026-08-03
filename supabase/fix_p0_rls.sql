-- =====================================================
-- P0 安全修复（RLS 侧）—— 管理员在 Dashboard → SQL Editor 整段粘贴执行
-- 配套前端代码已随 v168 提交（XSS 转义 + CSP）。
-- 幂等：可反复执行。执行后所有设备退登 + 清缓存 + 重登。
-- =====================================================
--
-- ⚠️ 执行前建议先核对线上真实策略（仓库里 4 份 SQL 互相矛盾，见 security-review-v167.md P2-1）：
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname='public'
--   ORDER BY tablename, policyname;
-- 本脚本会先 DROP 目标表上的【所有】policy 再重建，确保旧的全开放/缺 WITH CHECK 策略被清除。

-- 1. 确保 SECURITY DEFINER 辅助函数存在（绕过 RLS 直读 staff，避免递归）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff WHERE auth_id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.current_staff_auth_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT auth_id FROM public.staff WHERE auth_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_auth_id() TO anon, authenticated;

-- 2. 清掉目标表上的全部旧 policy（含 schema.sql 的 anon_all_* / sync_table 的 authed_rw / fix_rls 旧版）
DO $$
DECLARE
  t TEXT; pol RECORD;
  targets TEXT[] := ARRAY['staff','availability','app_data','password_reset_requests'];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    FOR pol IN SELECT policyname FROM pg_policies
               WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 3. staff 表：禁自提权（P0-2 核心修复）
--    仅 admin 可增删改；WITH CHECK(is_admin()) 让"INSERT role='admin' 的自己"直接被拒。
-- =====================================================
CREATE POLICY "staff_admin_all" ON public.staff
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT USING (auth_id = auth.uid() OR public.is_admin());

-- =====================================================
-- 4. availability 表：只能写自己的行（防伪造他人排班）
-- =====================================================
CREATE POLICY "avail_read_all" ON public.availability
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "avail_write_self" ON public.availability
  FOR ALL
  USING (COALESCE(staff_auth_id, public.current_staff_auth_id()) = auth.uid())
  WITH CHECK (COALESCE(staff_auth_id, public.current_staff_auth_id()) = auth.uid());

-- =====================================================
-- 5. app_data 表：结构性 WITH CHECK（P0-1 即时缓解）
--    保留"已登录即可读写"（兼职提交依赖整包 upsert），但要求写入的 blob 必须包含
--    核心顶层键，从而杜绝"整包清空/替换为空"的原始攻击原语。
--    （真正的 per-user 隔离见 supabase/fix_p0_appdata_merge.sql，需配合前端改造。）
-- =====================================================
CREATE POLICY "app_data_authed_rw" ON public.app_data
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    auth.role() = 'authenticated'
    AND data IS NOT NULL
    AND data ? 'staff'
    AND data ? 'availability'
    AND data ? 'performanceData'
  );

-- =====================================================
-- 6. password_reset_requests 表（P1-1 收窄）
--    anon 仅能插入"待处理"行（不能伪造 status/handled_by/note）；
--    仅 admin 可读、可改（标记已处理）。
-- =====================================================
CREATE POLICY "reset_insert_anon" ON public.password_reset_requests
  FOR INSERT TO anon
  WITH CHECK (
    status = 'pending'
    AND handled_at IS NULL
    AND handled_by IS NULL
    AND note IS NULL
    AND email IS NOT NULL
    AND email <> ''
  );

CREATE POLICY "reset_read_admin" ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "reset_update_admin" ON public.password_reset_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 7. 验证：打印上述表的最终生效策略
-- =====================================================
SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('staff','availability','app_data','password_reset_requests')
ORDER BY tablename, policyname;
