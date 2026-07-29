-- =====================================================
-- Supabase 数据同步表（第三步：根治跨设备同步失败）
-- 替代 GitHub Contents API 的 data/submissions.json 通道
-- 用法：Store 整个 JSON blob 存于 app_data(id='main').data (jsonb)
--       所有已登录用户可读写（兼职数据全员共享）
--       前端 sync.js 在每次 push/pull 时并行读写此表 + Realtime 订阅变更
-- 幂等：可反复执行
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_data (
  id          text PRIMARY KEY DEFAULT 'main',
  data        jsonb NOT NULL,
  updated_by  text DEFAULT '',
  updated_at  timestamptz DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

-- 幂等：先删旧策略
DROP POLICY IF EXISTS "app_data_authed_rw" ON public.app_data;

-- 所有已登录用户（authenticated）可读写
-- 注意：USING/WITH CHECK 只判断 auth.role()，不查询本表，不会触发 RLS 递归
CREATE POLICY "app_data_authed_rw" ON public.app_data
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 验证：应返回 1 行（表已建 + RLS 已开）
SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='app_data') AS table_exists,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_data') AS policy_count;
