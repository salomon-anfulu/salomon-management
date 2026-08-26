# v155 变更概览 — 完全移除 GitHub 同步

## 决策背景
用户确认：①完全移除 GitHub 同步代码（决策A）；②刷新后顶部一直显示「仅本地」是历史遗留误报，应删除；③先确认多用户实时同步能力。

## 核心结论：多用户实时同步已就绪 ✅
系统已具备完整的多人实时协作能力（Supabase 架构下）：
- **Realtime 订阅**：他人修改即时推送到本机
- **定时 pull**：每 15s 自动拉取最新（`_startSyncTimer`）
- **首次进入 1.5s pull**：打开即同步
- Supabase 在线即实时，**无需任何 GitHub token**

「仅本地」是旧版 `isEnabled()` 基于 GitHub token 判定的**显示 bug**，并非同步失败——Supabase 实时同步一直在工作。

## 代码改动
- **sync.js**：删除 `_showConfigDialog`（GitHub Token 配置框）、Token 管理函数、孤儿状态变量；重写 `_updateIndicator` 去掉「仅本地」分支和右键配置菜单；简化 `manualSync`；`_showAdvancedDialog` 文案去掉「强制推送」误导。
- **index.html**：同步指示器标题改为「云端同步状态（Supabase 实时同步）」；同步按钮旁新增「⚙️ 数据」按钮（导出/导入本地备份入口）。
- **login.html**：移除整个 legacy GitHub Token 配置面板（CSS / HTML / JS）。
- **isEnabled()**：已确认返回 `this._supabaseEnabled()`（Supabase 在线即启用）。

## 版本与部署
- 版本号 bump `v154 → v155`（app.js ×2 / index.html ×7 / login.html ×3 / sw.js ×3 / version.json ×2）。
- 提交 `3640d70`，已推送 GitHub Pages。
- 校验：`node --check` 通过；全项目 grep 无功能性 GitHub 残留。

## ⚠️ 部署后必做
所有设备（手机 / 电脑）**退出登录 → 清 LocalStorage → 重开页面**，确保加载 v155（cache-buster 已 bump）。否则旧缓存可能停留旧行为。
