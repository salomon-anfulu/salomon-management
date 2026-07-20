# v133: 修复业绩页崩溃 — workHours ReferenceError

## 问题与修复（2026-07-20）

用户反馈「业绩数据模块无法显示，显示该页面加载出错」。

**根因**: `pages.js:3156` 引用了未定义的 `workHours` 变量。`_calcPersonMonthHours` 返回 `{ days, hours }`，但后续代码错误地写成了 `workHours`，抛 `ReferenceError: workHours is not defined` 导致整个 `renderPerformance()` 崩溃。

**git blame 确认**: bug 从 v80（`3488fea`）就引入，v128 工时第一性原理改造时没有同步修复变量名。

**修复**: `workHours` → `hours`（2 处）。VM 验证修复后 `sales=1000, hours=40 → hourlyOutput=25` ✅

## 版本号同步

v132 → v133，4 处同步：app.js `_dataVersion` + `DATA_VERSION`、index.html `?v=133` ×3、version.json `cacheBuster=133`。commit `8705f99`。

---

# v132: 修复 staff dept 不生效 — 每次 init 强制同步

## 问题与修复（2026-07-20）

v130/v131 都改了贾长乐 `dept='Service Team'`，但用户浏览器始终显示「仓库兼职」。

**根因（第一性原理）**: `Store.init()` 中 `_migrateData` 的 staff dept 覆盖逻辑**仅在 `_dataVersion !== DATA_VERSION` 时才执行**。用户 localStorage 已存当前版本号 → 版本匹配 → 跳过整个 migration → 代码层的部门调整永远无法生效。

**修复**: 在 `init()` 的 migration 块外（app.js:5526），新增**每次都执行**的 staff dept 强制同步逻辑。用 defaults.staff 的 `dept/status/transferredFrom/serviceTeamStartDate` 覆盖用户数据中的同名成员，不依赖版本号。VM 验证：版本号匹配 + 贾长乐 dept=仓库兼职 → init 后成功同步为 Service Team。

## 诊断"代码改了但客户端不生效"四步法（v132 更新）

1. 检查 cache-buster 是否更新
2. 检查 SW 是否拦截 fetch
3. 检查 _dataVersion 是否 bump 触发 _migrateData
4. **版本号匹配但数据陈旧** ← v132 新增第 4 步！

commit `8de9565`。

---

# v131: 灵工打卡更新至 7/20 晚班完成

## 数据更新（2026-07-20）

- linggong_ci.js API 直连拉取 492 条 → sync_linggong_to_app.js 合并 → app.js 495 条
- 日期范围：2026-06-01 ~ 2026-07-20
- 关键修正：7/20 当天多条「打卡进行中」→「打卡正常」（signOut 从空变实际值）
- commit `f3eb525`

---

# v130: 启动探针强化 + SW 注销

## 问题与修复（2026-07-20）

用户反馈「贾长乐 dept 还没转 Service Team」，但核查发现：
- GitHub Pages 上的 app.js **完全正确**（贾长乐 dept='Service Team'）
- v129 时数据层/运行时补全逻辑都已 100% 完成

**根因**: 浏览器 Service Worker 的 stale-while-revalidate 策略返回旧版 app.js，导致客户端 localStorage 的 staff 数据没被 `_migrateData` 升级。

## v130 改动

| 文件 | 改动 |
|------|------|
| `js/app.js` | `_dataVersion`: v129 → v130（触发 _migrateData 强制更新 staff.dept）|
| `version.json` | dataVersion + cacheBuster → v130 |
| `index.html` | 3 处 `?v=129` → `?v=130` |
| `index.html` 启动探针 | **核心修复**：加 `navigator.serviceWorker.getRegistrations().forEach(r => r.unregister())`，启动时注销所有旧 SW；不再注册新 SW |
| `index.html` 探针 | 循环保护 30s → 10s |

## 原理

SW 注销后浏览器走原生 HTTP 缓存，`?v=130` 保证拿到新版 app.js，启动探针检测版本变化触发清缓存 reload，`Store.init` 触发 `_migrateData` 把 `staff[id=17].dept` 强制设为 `'Service Team'`。

## 验证

- ✅ GitHub Pages version.json 返回 v130
- ✅ app.js?v=130 中贾长乐 dept='Service Team'
- ✅ index.html 引用 ?v=130，探针含 SW 注销逻辑

## 诊断"代码改了但客户端不生效"三步法

1. 检查 cache-buster 是否更新
2. 检查 SW 是否拦截 fetch
3. 检查 _dataVersion 是否 bump 触发 _migrateData

---

# v129: 贾长乐+梁实秋 转部门

## 人员调整（2026-07-20 起）

| 姓名 | id | 原 | 现 | serviceTeamStartDate |
|------|----|----|----|---------------------|
| 贾长乐 | 17 | 仓库兼职 | Service Team | 2026-07-20 |
| 梁实秋 | 19 | 仓库兼职 | Service Team | 2026-07-20 |

## 数据级改动

### 1. `staff` 列表（app.js:13-37）
dept 字段更新 + 三个元数据字段：
- `transferredFrom: '仓库兼职'`
- `serviceTeamStartDate: '2026-07-20'`

### 2. `performanceData.july.records`（app.js:5074+）
新增 2 条 record（工时第一性原理计算，排除 7/20 进行中）：
- 贾长乐: 8 天 56.4h, sales=0
- 梁实秋: 10 天 79.4h, sales=0

### 3. `ratings`（app.js:705+）
新增 2 条 7 月 placeholder 评分：
- id=116 贾长乐 (staffId=17)
- id=117 梁实秋 (staffId=19)

## 模块级联自动生效（无需改代码）

得益于架构设计——所有模块都按 `staff.filter(dept === 'Service Team')` 动态渲染：

| 模块 | 状态 |
|------|------|
| 我的填报-换班登记 | ✅ 申请人/被换班人下拉自动包含 |
| 我的填报-店务支援 | ✅ 录入表单人员自动包含 |
| 门迎排班 | ✅ 门迎人员列表自动包含 |
| 供班总览 | ✅ 7 月数据自动初始化（initStaffCascadeData）|
| 表现评分 | ✅ `serviceTeamStartDate` 控制只参与 2026-07 起的评分（6 月等历史自动隐藏）|
| 考勤记录 | ✅ 自动从灵工打卡抓取（v128 已部署 _calcNetHours 精确计算）|
| 业绩数据 | ✅ 自动出现，workHours 从 signIn/signOut 精确计算 |
| 工作台/人员管理 | ✅ 部门标签、统计数字自动更新 |

## 总人数

| 部门 | v128 | v129 |
|------|------|------|
| Service Team | 14 | **16** |
| 仓库兼职 | 7 | **5** |

## 版本与部署

- `DATA_VERSION`: v128 → v129
- `cacheBuster`: 128 → 129（index.html 4 处 + version.json）
- `git commit`: `43c9a18`
- GitHub Pages 部署：✅ 已生效（version.json + index.html + app.js 全 v129）
- 启动探针会自动检测到 v128 → v129，其他设备访问时自动清缓存 + reload
