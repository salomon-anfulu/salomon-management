# 安福路 Salomon 兼职管理系统

> 单人项目 · 纯前端 · GitHub Pages 部署 · v133 (2026-07-20)

## 一句话定位
安福路 Salomon 旗舰店（L140）兼职团队管理系统：12 个模块（工作台/我的填报/人员/供班/考勤/门迎/评分/业绩/店务/好评/手册/数据管理）覆盖兼职全生命周期。

## 怎么跑起来
- **本地**: 用任意静态服务器在项目根目录起 `python3 -m http.server` 即可（无构建步骤）
- **线上**: git push → GitHub Actions 自动部署到 https://salomon-anfulu.github.io/salomon-management/
- **登录**: index.html 选择兼职姓名进入对应视角

## 技术栈
- 纯 HTML/CSS/JS（无框架、无构建）
- LocalStorage 持久化 + GitHub Contents API 跨设备云同步（data/submissions.json）
- Chart.js（CDN）
- Service Worker + version.json 启动探针（强制刷新机制，详见 v127）

## 目录与约定
```
js/app.js       数据层：Store + Router + Store.defaults（含全部硬编码数据）
js/pages.js     渲染层：12 个 renderXxx 函数 + 安全工具层（_esc/_calcNetHours 等）
js/sync.js      云同步层：GitHub Contents API + 字段级 _updatedAt 仲裁
css/styles.css  全部样式
index.html      入口（含启动探针 + cache-buster ?v=130）
sw.js           Service Worker（v130 起不再注册新实例，启动探针会注销旧 SW）
version.json    版本探针事实源（升级时必改）
data/submissions.json   云同步载体（只含 staff/availability/shifts/support/door/reviews 等）
.github/workflows/      deploy.yml（Pages 部署）+ linggong-auto.yml（每天 22:00 CI 拉取灵工打卡）
scripts/                工具脚本（灵工打卡 CI + 合并 + 报告生成）
```

## 关键约束（违反就会出 bug）
1. **每次升版本必须同步改 4 处**: `_dataVersion`(app.js defaults) + `DATA_VERSION`(app.js init) + `?v=`(index.html 3 个 script 标签) + `version.json`(dataVersion + cacheBuster)。v130 起不再注册新 SW，由启动探针接管缓存控制
2. **工时永远从 signIn/signOut 精确计算**，绝不能直接用灵工系统的 `totalHours` 字段（v128 教训）
3. **修数据时必须同时检查 Store.defaults 和 pages.js 渲染逻辑**，否则动态计算会覆盖正确值（v128 教训）
4. **人员部门改动**: 只改 `staff.dept`，所有模块按 dept 动态筛选自动级联；新增 Service Team 成员还需手动加 performanceData record + ratings placeholder
5. **缩写大小写不敏感**: 备注提取拼音缩写必须用 `[A-Za-z]`（v121 教训，kxy/wly 是小写）
6. **localStorage 安全**: 所有 `.split()/.replace()/.slice()` 必须用 `_safeXxx` 工具函数；所有用户输入拼 innerHTML 前必须用 `_esc()` 包裹
7. **JS 时区坑**: 永远不要用 `new Date(y, m, 0).toISOString().slice(0,7)`（UTC+8 偏移），用纯算术 `_ymKey(y, m)` 替代

## 当前状态（v133）
- Service Team: 16 人 / 仓库兼职: 5 人
- v133 修复: 业绩页 workHours ReferenceError（pages.js:3156，v80 起 bug）
- v132 修复: staff dept 每次 init 强制同步（不依赖版本号）
- v131 更新: 灵工打卡至 7/20 晚班完成（495 条）
- v130 修复: 启动探针加 SW 注销逻辑
- 7月业绩: totalSales=127,290（结算口径，含退换货扣减）
- 灵工打卡: 495 条（6/1~7/20），CI 每日自动拉取
- 顾客好评: 33 条
- 评分: 5 维度动态计算（工时/业绩/行为/考勤/好评）

## 详细项目记忆
`.workbuddy/memory/MEMORY.md` — 长期记忆（架构、规则、教训）
`.workbuddy/memory/YYYY-MM-DD.md` — 每日工作日志（append-only）
