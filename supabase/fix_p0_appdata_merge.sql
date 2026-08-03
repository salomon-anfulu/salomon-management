-- =====================================================
-- P0-1 彻底修复（纵深防御）：用服务端合并 RPC 替代"任何人直连 API 整包 upsert app_data"
-- ⚠️ 本脚本需要【前端配合改造 sync.js】才能生效，请先跑 fix_p0_rls.sql 确认系统正常，
--    再单独实施本步。实施后会撤销 authenticated 对 app_data 的直接写权限，
--    所有写入必须走 merge_app_data() 函数。
-- =====================================================

-- 1. 合并函数：在数据库内做浅合并（cur || patch），避免客户端整体覆盖。
--    当前前端仍发送完整 blob，故 patch=完整 blob，效果等同 upsert，但写入路径被收口到函数，
--    未来可在此函数内加"只允许改自己名下键"的细粒度校验，无需再改表结构。
CREATE OR REPLACE FUNCTION public.merge_app_data(patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur jsonb;
BEGIN
  -- 只允许一批白名单顶层键，拒绝注入未知键
  IF NOT (
    patch ? 'staff' AND patch ? 'availability' AND patch ? 'performanceData'
    AND (SELECT count(*) FROM jsonb_object_keys(patch)) <= 14
  ) THEN
    RAISE EXCEPTION 'merge_app_data: 非法的 patch 结构';
  END IF;

  SELECT data INTO cur FROM public.app_data WHERE id = 'main' FOR UPDATE;
  IF cur IS NULL THEN
    INSERT INTO public.app_data (id, data, updated_by)
    VALUES ('main', patch, coalesce(current_setting('request.jwt.claims', true)::json->>'email', 'unknown'));
  ELSE
    UPDATE public.app_data
    SET data = cur || patch,
        updated_at = now(),
        updated_by = coalesce(current_setting('request.jwt.claims', true)::json->>'email', 'unknown')
    WHERE id = 'main';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.merge_app_data(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.merge_app_data(jsonb) TO authenticated;

-- 2. 撤销 authenticated 对 app_data 的直接写（保留 SELECT，前端渲染依赖）
REVOKE INSERT, UPDATE, DELETE ON public.app_data FROM authenticated;
-- anon 本来就无写权；如有旧授权一并收回
REVOKE INSERT, UPDATE, DELETE ON public.app_data FROM anon;

-- 3. 保留只读策略（前端渲染需要读）
DROP POLICY IF EXISTS "app_data_authed_rw" ON public.app_data;
CREATE POLICY "app_data_authed_read" ON public.app_data
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 配套前端改动（在 js/sync.js 的 appData.save 中）：
--   原：await client.from('app_data').upsert({ id:'main', data: blob, updated_by })
--   改：await client.rpc('merge_app_data', { patch: blob })
-- 改完后必须 node --check js/sync.js 并本地验证一次"我的填报"能保存、工作台能刷新。
-- 若改错导致全员无法保存，回滚：GRANT INSERT,UPDATE,DELETE ON public.app_data TO authenticated;
--   并恢复 CREATE POLICY app_data_authed_rw ...（见 fix_p0_rls.sql 第 5 段）。
-- =====================================================
