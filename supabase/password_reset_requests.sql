-- ============================================================
-- v166: 密码重置申请队列表
-- 用途：员工在登录页点击「忘记密码」后提交申请，管理员在「数据管理」
--       页查看并去 Dashboard 重置密码后标记已处理。
-- 同时预留 resetPasswordForEmail（标准邮件重置）通道，将来换真域名+SMTP 即用。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴本文件 → Run
-- （Dashboard 用的是你的管理员权限，与前端 anon key 无关，可正常建表/授权）
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | done
  handled_at   TIMESTAMPTZ,
  handled_by   TEXT,
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_reset_requests_email  ON password_reset_requests(email);

-- 开启行级安全（RLS）
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 1) 未登录用户(anon)可提交申请：登录页用 anon key 写入
DROP POLICY IF EXISTS "anon_insert_reset_requests" ON password_reset_requests;
CREATE POLICY "anon_insert_reset_requests" ON password_reset_requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- 2) 已登录用户(authenticated)可查看申请列表（管理员在数据管理页读取）
DROP POLICY IF EXISTS "authenticated_read_reset_requests" ON password_reset_requests;
CREATE POLICY "authenticated_read_reset_requests" ON password_reset_requests
  FOR SELECT TO authenticated
  USING (true);

-- 3) 已登录用户(authenticated)可标记已处理（更新 status / handled_at / handled_by）
DROP POLICY IF EXISTS "authenticated_update_reset_requests" ON password_reset_requests;
CREATE POLICY "authenticated_update_reset_requests" ON password_reset_requests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 查看建表结果
-- SELECT * FROM password_reset_requests ORDER BY requested_at DESC;
