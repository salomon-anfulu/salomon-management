-- ============================================================
-- Salomon 兼职管理系统 - Supabase 数据库建表脚本
-- 版本: 1.0  日期: 2026-07-22
-- 用法: 在 Supabase Dashboard → SQL Editor → New query → 粘贴执行
-- ============================================================

-- ============================================================
-- 第一部分：扩展与公共函数
-- ============================================================

-- 启用 UUID 扩展（Supabase 默认已开启，确保一下）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- 第二部分：建表（按依赖顺序）
-- ============================================================

-- ------------------------------------------------------------
-- 1. staff - 人员表（核心基础表，其他表都引用它）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  gender      TEXT DEFAULT '',
  dept        TEXT NOT NULL DEFAULT 'Service Team',
  join_date   DATE,
  status      TEXT DEFAULT 'active',
  avatar_color TEXT DEFAULT '',
  available_days INTEGER DEFAULT 0,
  mbti        TEXT DEFAULT '',
  note        TEXT DEFAULT '',
  -- 部门转移相关
  transferred_from      TEXT DEFAULT '',
  service_team_start_date TEXT DEFAULT '',
  -- 软删除 tombstone
  is_deleted  BOOLEAN DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  -- 约束：名字+部门唯一（防止重复录入）
  CONSTRAINT staff_name_dept_unique UNIQUE (name, dept)
);

CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_staff_dept ON staff(dept) WHERE is_deleted = false;
CREATE INDEX idx_staff_status ON staff(status) WHERE is_deleted = false;

-- ------------------------------------------------------------
-- 2. availability - 可上班时间填报表（个人填报的核心表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name  TEXT NOT NULL,
  month       TEXT NOT NULL,
  date_key    TEXT NOT NULL,
  available   BOOLEAN DEFAULT false,
  note        TEXT DEFAULT '',
  -- 冗余字段：方便排班总览直接查询，不用 JOIN
  dept        TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  -- 关键唯一约束：一个人在一个月的一个日期只有一条记录
  CONSTRAINT avail_unique UNIQUE (staff_id, month, date_key)
);

CREATE TRIGGER availability_updated_at BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_avail_month ON availability(month);
CREATE INDEX idx_avail_staff ON availability(staff_id);
CREATE INDEX idx_avail_month_dept ON availability(month, dept);

-- ------------------------------------------------------------
-- 3. door_schedule - 门迎排班表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS door_schedule (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  date_str    TEXT NOT NULL,
  time_slot   TEXT NOT NULL,
  staff_name  TEXT NOT NULL,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  slot_type   TEXT DEFAULT 'normal',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT door_unique UNIQUE (date_str, time_slot, staff_name)
);

CREATE TRIGGER door_updated_at BEFORE UPDATE ON door_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_door_date ON door_schedule(date);
CREATE INDEX idx_door_staff ON door_schedule(staff_name);

-- ------------------------------------------------------------
-- 4. schedules - 排班记录表（每月实际排班）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name  TEXT NOT NULL,
  date        DATE NOT NULL,
  date_str    TEXT NOT NULL,
  shift       TEXT NOT NULL,
  dept        TEXT DEFAULT 'Service Team',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT schedule_unique UNIQUE (staff_id, date_str)
);

CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sched_date ON schedules(date);
CREATE INDEX idx_sched_staff ON schedules(staff_id);
CREATE INDEX idx_sched_dept ON schedules(dept);

-- ------------------------------------------------------------
-- 5. shift_changes - 换班记录表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_changes (
  id              BIGSERIAL PRIMARY KEY,
  applicant       TEXT NOT NULL,
  applicant_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  applicant_shift TEXT NOT NULL,
  target          TEXT NOT NULL,
  target_id       BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  target_shift    TEXT NOT NULL,
  apply_date      DATE NOT NULL,
  status          TEXT DEFAULT 'approved',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shift_applicant ON shift_changes(applicant);
CREATE INDEX idx_shift_target ON shift_changes(target);

-- ------------------------------------------------------------
-- 6. store_support - 店务支援记录表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_support (
  id          BIGSERIAL PRIMARY KEY,
  staff_name  TEXT NOT NULL,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  date_str    TEXT NOT NULL,
  type        TEXT NOT NULL,
  duration    TEXT DEFAULT '',
  detail      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_date ON store_support(date);
CREATE INDEX idx_support_staff ON store_support(staff_name);
CREATE INDEX idx_support_type ON store_support(type);

-- ------------------------------------------------------------
-- 7. customer_reviews - 顾客好评表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_reviews (
  id          BIGSERIAL PRIMARY KEY,
  staff_name  TEXT NOT NULL,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  month       TEXT NOT NULL,
  rating      INTEGER DEFAULT 5,
  review_date DATE,
  snippet     TEXT NOT NULL,
  keywords    TEXT[] DEFAULT '{}',
  source      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_staff ON customer_reviews(staff_name);
CREATE INDEX idx_review_month ON customer_reviews(month);

-- ------------------------------------------------------------
-- 8. performance_data - 业绩数据表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_data (
  id          BIGSERIAL PRIMARY KEY,
  month       TEXT NOT NULL,
  staff_name  TEXT NOT NULL,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  sales       NUMERIC(12,2) DEFAULT 0,
  sales_share NUMERIC(6,4) DEFAULT 0,
  qty         INTEGER DEFAULT 0,
  tickets     INTEGER DEFAULT 0,
  upt         NUMERIC(4,2) DEFAULT 0,
  avg_price   NUMERIC(10,2) DEFAULT 0,
  work_hours  NUMERIC(6,1) DEFAULT 0,
  hourly_output NUMERIC(10,2) DEFAULT 0,
  -- 月度汇总（店级）
  total_sales NUMERIC(12,2),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT perf_unique UNIQUE (month, staff_name)
);

CREATE TRIGGER perf_updated_at BEFORE UPDATE ON performance_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_perf_month ON performance_data(month);
CREATE INDEX idx_perf_staff ON performance_data(staff_name);

-- ------------------------------------------------------------
-- 9. ratings - 评分表（月度评分）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
  id              BIGSERIAL PRIMARY KEY,
  staff_id        BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name      TEXT NOT NULL,
  month           TEXT NOT NULL,
  score_availability  NUMERIC(2,1) DEFAULT 0,
  score_performance   NUMERIC(2,1) DEFAULT 0,
  score_behavior      NUMERIC(2,1) DEFAULT 0,
  score_attendance    NUMERIC(2,1) DEFAULT 0,
  score_customer      NUMERIC(2,1) DEFAULT 0,
  avg_score           NUMERIC(2,1) DEFAULT 0,
  hourly_rate         INTEGER DEFAULT 28,
  comment             TEXT DEFAULT '',
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT rating_unique UNIQUE (staff_id, month)
);

CREATE TRIGGER ratings_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_rating_month ON ratings(month);
CREATE INDEX idx_rating_staff ON ratings(staff_id);

-- ------------------------------------------------------------
-- 10. attendance - 考勤记录表（灵工打卡数据）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id          BIGSERIAL PRIMARY KEY,
  staff_name  TEXT NOT NULL,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  date_str    TEXT NOT NULL,
  sign_in     TEXT DEFAULT '',
  sign_out    TEXT DEFAULT '',
  status      TEXT DEFAULT '打卡正常',
  total_hours TEXT DEFAULT '',
  -- 精确计算的工时（第一性原理：从 sign_in/sign_out 算出，>6h 扣 1h 午休）
  calc_hours  NUMERIC(5,2),
  source      TEXT DEFAULT 'linggong',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT attendance_unique UNIQUE (staff_name, date_str, source)
);

CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_attend_date ON attendance(date);
CREATE INDEX idx_attend_staff ON attendance(staff_name);
CREATE INDEX idx_attend_month ON attendance(date_str);

-- ------------------------------------------------------------
-- 11. sync_meta - 同步元数据表（记录数据版本、最后同步时间等）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_meta (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO sync_meta (key, value) VALUES
  ('data_version', '2026-07-22-v140'),
  ('last_migration', now()::text),
  ('schema_version', '1.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 第三部分：行级安全策略（RLS）
-- ------------------------------------------------------------
-- Supabase 的 RLS 让你可以在数据库层面控制：
-- "谁可以看哪些行、谁可以改哪些行"
-- 即使前端 API Key 泄露，攻击者也无法越权操作
--
-- 当前阶段（纯前端+匿名访问）：
--   - 允许全部读写（anon role 全通）
--   - 因为兼职系统是内部工具，没有登录系统
--
-- 未来阶段（小程序登录后）：
--   - 修改策略，限制"兼职只能改自己的填报"
--   - 店长 role 可以全部读写
-- ============================================================

-- 先启用所有表的 RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE door_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_meta ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 阶段一策略：匿名用户全通（过渡期）
-- 网页版没有登录系统，先用 anon 全通
-- 等 Web 版迁移完成后，逐步收紧策略
-- ============================================================

-- staff 表
CREATE POLICY "anon_all_staff" ON staff FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- availability 表
CREATE POLICY "anon_all_availability" ON availability FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- door_schedule 表
CREATE POLICY "anon_all_door" ON door_schedule FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- schedules 表
CREATE POLICY "anon_all_schedules" ON schedules FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- shift_changes 表
CREATE POLICY "anon_all_shift" ON shift_changes FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- store_support 表
CREATE POLICY "anon_all_support" ON store_support FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- customer_reviews 表
CREATE POLICY "anon_all_reviews" ON customer_reviews FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- performance_data 表
CREATE POLICY "anon_all_perf" ON performance_data FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ratings 表
CREATE POLICY "anon_all_ratings" ON ratings FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- attendance 表
CREATE POLICY "anon_all_attendance" ON attendance FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- sync_meta 表
CREATE POLICY "anon_all_meta" ON sync_meta FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 第四部分：实用视图（方便查询，不改表数据）
-- ============================================================

-- 供班总览视图：每个人每月的可用天数 + 不可上班日期列表
CREATE OR REPLACE VIEW v_availability_summary AS
SELECT
  staff_id,
  staff_name,
  dept,
  month,
  COUNT(*) FILTER (WHERE available = true) AS available_days,
  COUNT(*) FILTER (WHERE available = false) AS unavailable_days,
  ARRAY_AGG(date_key ORDER BY date_key) FILTER (WHERE available = false) AS unavailable_dates,
  MAX(updated_at) AS last_updated
FROM availability
GROUP BY staff_id, staff_name, dept, month;

-- 月度评分汇总视图
CREATE OR REPLACE VIEW v_rating_summary AS
SELECT
  r.staff_id,
  r.staff_name,
  r.month,
  r.score_availability,
  r.score_performance,
  r.score_behavior,
  r.score_attendance,
  r.score_customer,
  r.avg_score,
  r.hourly_rate,
  s.dept,
  r.comment
FROM ratings r
LEFT JOIN staff s ON r.staff_id = s.id
ORDER BY r.month DESC, r.avg_score DESC;

-- 考勤汇总视图：带精确计算工时
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT
  staff_name,
  date_str,
  sign_in,
  sign_out,
  status,
  total_hours,
  calc_hours,
  CASE
    WHEN calc_hours IS NOT NULL THEN calc_hours
    WHEN total_hours ~ '^[0-9]+\.?[0-9]*$' THEN total_hours::NUMERIC
    ELSE 0
  END AS effective_hours,
  source
FROM attendance
ORDER BY date_str DESC, staff_name;

-- ============================================================
-- 第五部分：Realtime 配置
-- ------------------------------------------------------------
-- Supabase Realtime 默认监听 INSERT/UPDATE/DELETE
-- 只需把需要实时推送的表加入 publication
-- ============================================================

-- 将需要实时推送的表加入 realtime publication
-- 这样前端订阅后，数据变化会通过 WebSocket 自动推送
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER PUBLICATION supabase_realtime ADD TABLE door_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;
ALTER PUBLICATION supabase_realtime ADD TABLE store_support;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;

-- 注：customer_reviews / performance_data / ratings / attendance
-- 是店长定期更新，不是兼职实时编辑，暂不需要 Realtime
-- 如果将来需要，执行 ALTER PUBLICATION supabase_realtime ADD TABLE xxx;

-- ============================================================
-- 建表完成！
-- ============================================================
-- 验证方法：
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 应该看到 11 张表 + 3 个视图：
--   attendance, availability, customer_reviews, door_schedule,
--   performance_data, ratings, schedules, shift_changes,
--   staff, store_support, sync_meta
-- ============================================================
