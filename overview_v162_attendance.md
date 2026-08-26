# v162 灵工考勤补录至 7/31

## 任务
用户要求更新考勤记录至 7/31。原数据停在 2026-07-21（灵工管家 API 7/21 后未再同步入仓）。

## 数据流（决定做法的关键）
灵工考勤来源 = 灵工管家 API（`data/auth_state.json` cookie，JWT 有效至 8/10）。
CI 流程：`linggong_ci.js`（纯 API 拉取 → `data/weekly_attendance_clean.json`）→ `sync_linggong_to_app.js`（写入 `js/app.js` `defaults.linggongAttendance.records`）→ commit/push。**CI 不直写 Supabase**；实时数据靠 `Store.init` 版本不匹配时以 `defaults` 为基重合并，再同步 LocalStorage + Supabase。

→ 要让所有用户拿到新考勤，**必须 bump `DATA_VERSION`**（v161→v162）触发重合并，否则仅改 defaults 不生效。

## 执行步骤
1. 临时改 `linggong_ci.js` 的 `getMonthRange()` 指向 July 2026（脚本默认取当前月=August，取不到 July），拉取后 `git checkout` 还原。
2. `linggong_ci.js` → `data/weekly_attendance_clean.json` 597 条（6/1-7/31，新增 7/22-31：8/9/11/14/13/9/9/9/7/9 人）。`data/` 被 .gitignore 忽略，中间文件不入仓。
3. `sync_linggong_to_app.js` → `app.js` `defaults.linggongAttendance.records` **600 条**（新增 98、更新 499）。
4. bump v162：`index.html` `?v=`×7、`login.html` `?v=`×2、`sw.js` `sw/static/img-v162`、`app.js` `_dataVersion`/`DATA_VERSION`、`version.json` `dataVersion`+`cacheBuster`+`updatedAt`+note。
5. commit `c92ceff` + push origin main（GitHub Pages 自动部署）。

## 验证
- `node --check js/app.js` 通过
- `version.json` 合法
- `app.js` 考勤 600 条，span 2026-06-01 ~ 2026-07-31，7/22-31 全部 present

## 用户需做的
硬刷新（Cmd+Shift+R）或关所有标签页重开 → 因 `?v=` 变化 SW 自然换新缓存 + 启动探针检测 cacheBuster 变化清缓存 reload，即可看到 7 月下旬考勤。

## 注意
- `一键更新考勤.command` 走 `fetch_linggong.js`（浏览器+手机验证码，交互式）；自动/CI 跑用 `linggong_ci.js`（纯 API + auth_state.json）。
- 8/10 前 token 有效；之后需重刷 cookie（跑「一键更新考勤」或手动更新 Secret）。
