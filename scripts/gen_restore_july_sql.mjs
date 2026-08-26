// scripts/gen_restore_july_sql.mjs
// 把 17:23 导出（= 17:52 状态）整个 data 字段 + _lockedMonths 嵌成 SQL
// 由用户在 Supabase Dashboard SQL Editor 一次性执行

import fs from 'fs';

const EXPORT_PATH = '/Users/a86137/Downloads/salomon-backup-20260803-1723.json';
const OUT_PATH = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/supabase/restore_july_2026_and_lock.sql';

const doc = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
const data = doc.data;

// 注入 _lockedMonths（前端会用这个守卫 7月 填报 / 6月 也顺手锁因为绑定 5 维联动）
data._lockedMonths = ['2026-07', '2026-06'];

// JSON 序列化（Postgres jsonb 对 unicode 转义无要求，但 SQL 字符串里要转义 ' 和 \）
// 用 JSON.stringify 默认即符合 JSON 规范；嵌入 SQL 时只需再转义单引号。
const dataJson = JSON.stringify(data);
const dataJsonSql = dataJson.replace(/'/g, "''");  // SQL 单引号转义

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);

const sql = `-- ============================================================
-- 安福路 Salomon 兼职管理系统
-- 任务：恢复到 17:52 截图状态 + 锁定 7月（及 6月）所有填报/数据
--
-- ⚠️ 执行前必读：
--   1. 本脚本会先用 17:23 导出（已验证 = 17:52 状态，5 维 Δ=0）
--      完整覆盖当前 app_data.data，然后再追加 _lockedMonths。
--   2. 会先把当前状态备份到 _backup_app_data_20260819 临时表，万一不对可回滚。
--   3. 17:23→17:52→18:54 之间所有非 7月 的改动都会被一并还原
--      （如果有 6月/8月 数据是 17:23 之后才改的，会被冲掉）。
--      本次任务是"还原 17:52 截图"为主，故统一覆盖。
--   4. 锁定后，前端所有 saveRating / saveReviewForm / saveDoorSlot /
--      saveSupport / saveShift / saveDoorSlotInline / 业绩保存 会被拦截，
--      且 UI 会显示 🔒 徽章，月份下拉禁用。
--
-- 生成时间：${ts}
-- 数据源：${EXPORT_PATH}  (exportTime: ${doc._exportMeta.exportTime})
-- 验证：scripts/verify_1752_restore.mjs  →  Top 3 综合 4.2/4.2/4.1 Δ=0 ✓
-- ============================================================

BEGIN;

-- 1) 备份当前状态（只在当天没备份过时建表，避免重复执行冲突）
CREATE TABLE IF NOT EXISTS public._backup_app_data_20260819 AS
SELECT * FROM public.app_data WHERE id = 'main';

-- 如果想用最新备份覆盖旧备份，先 uncomment 下面两行：
-- DROP TABLE IF EXISTS public._backup_app_data_20260819_old;
-- ALTER TABLE public._backup_app_data_20260819 RENAME TO _backup_app_data_20260819_old;

-- 2) 还原 data 字段 = 17:23 导出 + 追加 _lockedMonths 守卫
--    这里使用一个临时变量（CTE）让 SQL 看起来整洁；
--    真正落地：app_data.data ← '${dataJson.length} chars JSON'
UPDATE public.app_data
SET data = $JSON_DATA$::jsonb,
    updated_at = NOW(),
    updated_by = COALESCE(current_setting('request.jwt.claims', true)::json->>'email', 'restore_july_2026')
WHERE id = 'main';

-- 3) 同步设置触发器需要的 updated_at / updated_by（双保险）
UPDATE public.app_data
SET updated_at = NOW(),
    updated_by = 'restore_july_2026'
WHERE id = 'main';

-- 4) 验证：检查 _lockedMonths 已写入，staff 数与 17:23 一致
DO $$
DECLARE
  v_locked jsonb;
  v_staff_count int;
  v_ratings_july_count int;
BEGIN
  v_locked := (SELECT data->_lockedMonths FROM public.app_data WHERE id='main');
  v_staff_count := (SELECT jsonb_array_length(data->'staff') FROM public.app_data WHERE id='main');
  v_ratings_july_count := (
    SELECT jsonb_array_length(COALESCE(data->'ratings', '[]'::jsonb))
    FROM public.app_data WHERE id='main'
  );
  -- 注意：ratings 是全月历史数组，没按月分键；这里仅打印不强制。
  RAISE NOTICE '✓ 还原完成';
  RAISE NOTICE '  _lockedMonths = %', v_locked;
  RAISE NOTICE '  staff 数量    = %', v_staff_count;
  RAISE NOTICE '  ratings 总数  = %  (含历史月份，非强制检查)', v_ratings_july_count;
  IF v_locked IS NULL OR jsonb_array_length(v_locked) < 1 THEN
    RAISE EXCEPTION '✗ _lockedMonths 未写入，请检查 data 字段更新是否成功';
  END IF;
  IF v_staff_count < 20 THEN
    RAISE WARNING '⚠ staff 数偏少（%），可能 data 写入异常，请人工核查', v_staff_count;
  END IF;
END $$;

-- 5) 列出最终状态（可选：跑完后肉眼对照）
SELECT
  id,
  updated_at,
  updated_by,
  data->_lockedMonths AS locked_months,
  jsonb_array_length(data->'staff') AS staff_count,
  jsonb_array_length(data->'availability'->'months'->'2026-07'->'data') AS avail_07_staff,
  jsonb_array_length(data->'performanceData'->'july'->'records') AS perf_07_records,
  jsonb_array_length(data->'customerReviews') AS reviews_total,
  jsonb_array_length(data->'doorSchedule') AS door_total,
  jsonb_array_length(data->'storeSupport') AS support_total
FROM public.app_data
WHERE id = 'main';

COMMIT;
`;

const finalSql = sql.replace('$JSON_DATA$', `'${dataJsonSql}'`);

fs.writeFileSync(OUT_PATH, finalSql, 'utf8');

console.log(`✓ 已生成: ${OUT_PATH}`);
console.log(`  data JSON 大小: ${dataJson.length} 字符`);
console.log(`  SQL 文件大小:   ${finalSql.length} 字符 (~${(finalSql.length/1024).toFixed(1)} KB)`);
console.log(`  _lockedMonths 已注入: ['2026-07', '2026-06']`);
console.log();
console.log('下一步：在 Supabase Dashboard → SQL Editor 打开并执行该文件。');
console.log('执行后刷新"表现评分"页，Top 3 应为 4.2 / 4.2 / 4.1。');