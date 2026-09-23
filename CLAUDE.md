# 安福路 Salomon 兼职管理系统

> 单人项目 · 纯前端 · GitHub Pages 部署 · v213 (2026-09-23)

## 一句话定位
安福路 Salomon 旗舰店（L140）兼职团队管理：12 模块（工作台/我的填报/人员/供班/考勤/门迎/评分/业绩/店务/好评/手册/数据管理）覆盖兼职全生命周期。

## 怎么跑起来
- **本地**: 项目根目录 `python3 -m http.server`（无构建步骤）
- **线上**: git push origin main → Actions 自动部署 https://salomon-anfulu.github.io/salomon-management/
- **登录**: login.html，邮箱=姓名拼音@salomon.temp，管理员 admin@salomon.temp
- **push ≠ 部署**：push 后必须查 Actions 运行 + curl 线上 version.json；漏触发补空提交重推

## 技术栈与架构
- 纯 HTML/CSS/JS（无框架无构建）+ Chart.js(CDN) + Service Worker + version.json 启动探针
- LocalStorage 持久化 + **Supabase app_data 单通道云同步**（id='main' jsonb 存整 Store blob；v155 起无 GitHub Contents API）
- 核心文件: js/app.js(Store+defaults 全部硬编码数据) / js/pages.js(渲染) / js/sync.js(同步+离职锁+污染防御) / js/auth-guard.js(认证+离职黑名单) / js/supabase-client.js
- 推送白名单仅: staff/availability/shiftChanges/storeSupport/doorSchedule/customerReviews+_deletedIds/_deletedDoorSlots/_lockedMonths。**linggong/performanceData/ratings 不上行**（真相源=本地 defaults）

## 版本 bump 清单（缺一处用户看旧版）
app.js×2(_dataVersion+DATA_VERSION) + index.html×8 + login.html×2(含footer硬编码) + reset-password.html×2 + sw.js×3 + version.json 三字段。用 node split/join 替换（sed 在本机失效）。

## 关键约束（违反必翻车）
1. **永远用 name 匹配不用 id**（defaults.staff.id 与 DB BIGSERIAL 系统性错位）
2. **工时从 signIn/signOut 精确算**（>6h 扣 1h 午休），绝不用 totalHours
3. **修数据必须同时查 defaults 和 pages.js 动态渲染**，否则动态计算覆盖正确值
4. 改对象字面量保闭合括号；大改后 `node --check`；注释内禁未转义反引号
5. localStorage 安全: split/replace/slice 用 _safeXxx；innerHTML 前 _esc()
6. JS 时区: 不用 `new Date(y,m,0).toISOString()`，用 _ymKey 纯算术
7. vm 沙箱验证: app.js 与 pages.js 分开 runInContext；ctx 需 window/location
8. 业绩/灵工等大块注入用括号配平法整块替换 + vm 沙箱断言

## 人员现状（v213）
- defaults.staff 27 人: active 23（Service Team 13 + 仓库兼职 10）+ left 4（王雅澜09-01/祖白代09-11/王龙宇/李若彤）
- 离职双闸: login.html + auth-guard.js 的 DEACTIVATED_ACCOUNTS + staff.status==='left' 兜底
- v208 同步层离职锁: defaults 标 left + bump + push 后，pull/push 双端自动强制 left 并净化云端
- 离职显示语义: "删除"=不显示保留数据；模式A left+leftDate=离职月起隐藏；模式B 无leftDate=全月隐藏

## 人员变动 SOP
- **离职**: defaults.staff 标 left → 双闸加 email → bump+push
- **入职**: defaults.staff 加条目(id=max+1) → Auth 账号只能 Dashboard 手动建(Supabase 邮件限流+.temp 域拦截) → 建号后必补 metadata(PUT /auth/v1/user, 缺 name 系统不识别) → 云端 blob 补条目 → bump+push。脚本: supabase/link_4staff_v211.mjs

## 当前状态（v213 / 2026-09-23）
- 9月业绩: ¥233,062 / 193件 / 148票 / 14人（9/1-9/23 小票77 整月重建，孔祥宇 31,067 第一）
- 灵工打卡: 893 条（至 9/23）；**CI 五连败中**（Secret 未同步）；**token 9/25 过期**
- 顾客好评: 53 条；7月业绩定稿 ¥127,290；8月 ¥67,532
- 数据锁: 6/7 月已锁定

## 详细项目记忆
`.workbuddy/memory/MEMORY.md` — 长期记忆（架构、归因引擎 v5.2、SOP、教训）
`.workbuddy/memory/2026-09-*.md` — 近期工作日志（append-only）
