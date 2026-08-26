-- ============================================================
-- 文件名: supabase/add_appdata_audit.sql
-- 用途:   给 app_data 表加 updated_by 审计 + 完整变更日志
-- 执行:   Supabase Dashboard → SQL Editor → 粘贴 → Run
-- 可重复执行（幂等）
-- ============================================================

-- 1) 确保 updated_by 列存在（部署旧前端时可能没这列）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='app_data' AND column_name='updated_by'
  ) THEN
    ALTER TABLE public.app_data ADD COLUMN updated_by text NOT NULL DEFAULT '';
  END IF;
END $$;

-- 2) 审计日志表：记录每一次 app_data 的写入（谁/何时/IP/数据指纹）
CREATE TABLE IF NOT EXISTS public.app_data_audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_data_id   text NOT NULL DEFAULT 'main',
  changed_by    text NOT NULL DEFAULT '',
  client_ip     inet,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  data_size     integer,                       -- data jsonb 字节长度
  data_md5      char(32),                      -- 数据指纹，比对“改了什么”
  note          text
);

-- 3) 主触发器函数：写 app_data 时自动补 updated_at + updated_by(兜底IP)
CREATE OR REPLACE FUNCTION public.app_data_set_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_ip inet := inet_client_addr();
  v_by text;
BEGIN
  -- 前端若已传有效 updated_by（如 staffName），保留；否则用 IP 兜底
  v_by := NULLIF(TRIM(NEW.updated_by), '');
  IF v_by IS NULL OR v_by = '' THEN
    v_by := COALESCE('anon@' || v_ip::text, 'anon-unknown');
  END IF;
  NEW.updated_by := v_by;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_data_set_audit ON public.app_data;
CREATE TRIGGER trg_app_data_set_audit
  BEFORE INSERT OR UPDATE ON public.app_data
  FOR EACH ROW EXECUTE FUNCTION public.app_data_set_audit();

-- 4) 审计日志触发器函数：每次写入追加一条历史
--    SECURITY DEFINER：以定义者(表owner)权限运行，绕过 audit_log 的 RLS，
--    否则 anon 连接 INSERT 会被 RLS 拒掉、连带主写入一起回滚。
--    异常保护：审计写失败绝不影响主表 UPDATE。
CREATE OR REPLACE FUNCTION public.app_data_write_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip inet := inet_client_addr();
  v_by text := NULLIF(TRIM(NEW.updated_by), '');
  v_size integer;
  v_md5  char(32);
BEGIN
  IF v_by IS NULL OR v_by = '' THEN
    v_by := COALESCE('anon@' || v_ip::text, 'anon-unknown');
  END IF;
  -- 计算数据指纹（md5 of jsonb::text）
  SELECT octet_length(NEW.data::text), md5(NEW.data::text)
    INTO v_size, v_md5;

  BEGIN
    INSERT INTO public.app_data_audit_log
      (app_data_id, changed_by, client_ip, data_size, data_md5)
    VALUES
      (NEW.id, v_by, v_ip, v_size, v_md5);
  EXCEPTION WHEN OTHERS THEN
    -- 审计失败不影响业务写入
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_data_write_log ON public.app_data;
CREATE TRIGGER trg_app_data_write_log
  AFTER INSERT OR UPDATE ON public.app_data
  FOR EACH ROW EXECUTE FUNCTION public.app_data_write_log();

-- 5) RLS：审计日志仅允许已认证会话读取（防止泄露 IP 给匿名）
ALTER TABLE public.app_data_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_auth_read" ON public.app_data_audit_log;
CREATE POLICY "audit_log_auth_read" ON public.app_data_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6) 验证
SELECT 'app_data columns' AS check_point,
       column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='app_data'
  AND column_name IN ('updated_by','updated_at')
ORDER BY column_name;

SELECT 'triggers on app_data' AS check_point, tgname
FROM pg_trigger
WHERE tgrelid = 'public.app_data'::regclass AND NOT tgisinternal
ORDER BY tgname;
