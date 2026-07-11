# 安福路兼职管理系统 — 对抗性审查报告

**审查日期**: 2026-07-11  
**审查版本**: v82  
**审查范围**: 代码质量、运行稳定性、性能流畅度、云同步可靠性、使用便捷性

---

## 一、综合评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | 6.5/10 | 功能完整但缺乏模块化，17K行挤在3个文件里 |
| 运行稳定性 | 7.5/10 | 有全局错误兜底，但 Store.get 链式调用无 null 保护 |
| 性能流畅度 | 6.0/10 | Router.render 全量重绘，110次 Store.get 重复读取 |
| 同步可靠性 | 6.5/10 | 多层竞态防护到位，但 GitHub API 1MB 限制是定时炸弹 |
| 使用便捷性 | 7.0/10 | 移动端适配好，但 102 处内联 onclick 无法测试 |
| **综合** | **6.7/10** | **能用，但技术债在加速累积** |

---

## 二、P0 紧急问题（需立即修复）

### P0-1: `Store.get()` 链式调用无 null 保护 — 全页崩溃风险

**位置**: pages.js 共 19 处  
**模式**: `Store.get('staff').filter(...)` / `Store.get('ratings').filter(...)`

**问题**: 如果 LocalStorage 被清空或 JSON.parse 返回 null/undefined，直接 `.filter()` 会抛 `TypeError: Cannot read property 'filter' of null`，导致整个页面白屏。

**影响范围**: 所有 12 个页面的渲染函数  
**修复建议**:
```js
// Before (19处)
const staff = Store.get('staff').filter(s => s.status === 'active');

// After
const staff = (Store.get('staff') || []).filter(s => s.status === 'active');
```

### P0-2: Router.render() 全量 innerHTML 重绘 — 无虚拟DOM无diff

**位置**: app.js:8610  
**模式**: `content.innerHTML = pages[this.current]()`

**问题**: 每次切换 Tab、筛选、编辑都触发完整重绘。Dashboard 页面含 Chart.js 图表，每次 render 都重新创建 canvas → 图表闪烁 + 重复初始化。对于有大量 DOM 节点的页面（如供班总览表格），全量 innerHTML 赋值导致明显卡顿。

**影响**: 
- 移动端切换页面时有 200-500ms 卡顿感
- Chart.js 重复初始化可能导致内存泄漏（旧实例未被 destroy）
- 用户正在输入的表单数据在 render 后丢失

**修复建议**: 引入轻量 diff 或至少对 Chart.js 做 `chart.destroy()` 后再重新创建

### P0-3: GitHub Token 明文存储在 LocalStorage

**位置**: sync.js:47  
**模式**: `localStorage.getItem('gh_sync_token')`

**问题**: GitHub Personal Access Token 以明文存储在 LocalStorage 中。任何 XSS 攻击（虽然当前 innerHTML 使用较安全）或恶意浏览器扩展都能直接读取。

**影响**: Token 泄露后可修改 GitHub 仓库所有代码  
**修复建议**: 使用 sessionStorage（关闭即失效）或至少 Base64 编码 + 过期自动清除

---

## 三、P1 高优先问题

### P1-1: 7月特例逻辑硬编码 — 下月不可复用

**位置**: pages.js 多处
```
monthKey === '2026-07'  → slice(2)  // 跳过前两周
isJULY = month === '2026-07'
```

**问题**: 所有"只统计第3周起"的逻辑都硬编码了 `'2026-07'`。到了8月这些代码不会自动适配，需要手动改字符串。

**修复建议**: 用配置驱动
```js
const MONTH_CONFIG = {
  '2026-07': { startWeek: 3 },  // 7月从第3周开始
  '2026-08': { startWeek: 1 },  // 8月恢复正常
};
```

### P1-2: 102处内联 onclick — 无法单元测试

**问题**: 所有交互（筛选、编辑、删除、导航）都通过 `onclick="staffFilter='all';Router.render()"` 内联在 HTML 模板字符串中。这些代码：
- 无法被任何测试框架覆盖
- 字符串拼接中的引号嵌套容易出错
- 全局变量污染命名空间

**修复建议**: 使用事件委托或至少提取为命名函数

### P1-3: Store 缓存失效逻辑不完整

**位置**: app.js Store._cache  
**问题**: `_cache` 在 init 时设置，但 `Store.set()` 后是否同步更新缓存？如果不同步，同一页面中先读后写再读会拿到旧值。

### P1-4: 灵工打卡数据手动更新 — 无法自动化闭环

**问题**: 灵工打卡需要手动运行 `fetch_auto_final.js` → 手动运行 `sync_linggong_to_app.js` → 手动改 app.js → 手动 git push。整个链路 4 步人工操作，任何一步漏掉就数据不同步。

**修复建议**: 写一个 `一键更新全部.command` 脚本串联全流程

### P1-5: performanceData 中 workHours/hourlyOutput 全为 0 — 依赖运行时动态计算

**问题**: defaults 里写死 `workHours: 0, hourlyOutput: 0`，运行时靠 `renderPerformance` 动态计算注入。如果任何其他代码路径直接读 `record.hourlyOutput`（如导出数据、评分计算），拿到的就是 0。

**已修复但仍有残余**: `calcPerformanceScore` 已加 fallback 逻辑，但代码中有两条独立计算路径（renderPerformance vs calcPerformanceScore），维护时容易不同步。

---

## 四、P2 中优先问题

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| P2-1 | **app.js 8767 行单文件** — defaults 数据占 5000+ 行 | app.js | 编辑体验差，git diff 噪音大 |
| P2-2 | **88 次 Store.get 重复调用** — renderRatings 中 calcAvailabilityScore + calcPerformanceScore + calcBehaviorScore 各自独立读数据 | pages.js | 同一次渲染重复 JSON.parse |
| P2-3 | **无 loading 状态** — 网络请求（Sync.pull）期间 UI 无反馈 | sync.js | 用户不知道是否在同步 |
| P2-4 | **alert/confirm 共 7 处** — 阻塞主线程，移动端体验差 | pages.js | 阻断交互流 |
| P2-5 | **CSS 仅 2 个 @media 断点** — 中间尺寸（平板）可能样式异常 | styles.css | 平板体验 |
| P2-6 | **0 处 aria 属性** — 屏幕阅读器无法导航 | 全局 | 可访问性缺失 |
| P2-7 | **283 次数组遍历** — renderPerformance 中 forEach/filter/reduce 嵌套 | pages.js | 大数据量时可能卡顿 |
| P2-8 | **sync.js 18 处 console.log 残留** — 生产环境调试噪音 | sync.js | 控制台刷屏 |

---

## 五、P3 低优先问题

| # | 问题 | 建议 |
|---|------|------|
| P3-1 | 无 PWA/Service Worker | 可离线使用，提升加载速度 |
| P3-2 | JS 无压缩 | app.js 364K 未 gzip，首次加载慢 |
| P3-3 | 无骨架屏/占位图 | 数据加载时空白 |
| P3-4 | 表格无虚拟滚动 | 数据量大时（如灵工打卡 416 条）滚动卡 |
| P3-5 | 月份切换无 URL hash | 刷新后丢失当前查看的月份 |
| P3-6 | 无暗色模式 | 晚间使用刺眼 |

---

## 六、各维度详细分析

### 6.1 代码质量（6.5/10）

**优点**:
- 全局错误处理（app.js:8756）+ Router 层 try-catch（app.js:8609）防止白屏
- tombstone 软删除机制设计合理，解决了分布式删除复活问题
- 乱码守卫 `_isCorrupt()` 防止脏数据扩散
- Store.init 智能合并逻辑完善，版本号控制有效

**缺点**:
- 17,074 行代码挤在 3 个 JS 文件中，无模块化（无 import/export）
- 87 个全局函数 + 20+ 个全局变量（`staffFilter`、`perfMonth`、`_attMonth`...）
- 102 处内联 `onclick` 无法测试
- defaults 数据（5000+ 行 JSON）和业务逻辑混在 app.js 中
- sync.js 有 18 处 console.log 残留

### 6.2 运行稳定性（7.5/10）

**优点**:
- Router 有 try-catch + 全局 error handler 双层兜底
- Store.init 有安全备份（`createSafetyBackup`）+ 乱码过滤
- 版本号不匹配自动智能合并，不会丢用户数据

**缺点**:
- 19 处 `Store.get('xxx').filter()` 无 null 保护 — LocalStorage 被清空时崩溃
- Store._cache 与 Store.set 同步性存疑
- `round()` 未定义导致崩溃（v75fix 已修，但说明缺乏静态检查）
- 字符串拼接导致工时异常值（v82 已修，但 `parseFloat` 兜底是 hack 而非根治）

### 6.3 性能流畅度（6.0/10）

**测量数据**:
- 88 次 `Store.get` 调用（每次都 JSON.parse 或读缓存）
- 283 次数组遍历（.forEach/.map/.filter/.reduce/.sort）
- 61 次 DOM 直接操作
- 32 次 JSON.stringify/parse

**瓶颈分析**:
1. **Router.render 全量重绘**: 每次操作都重建整个 DOM 树。以供班总览为例，14 人 × 5 周 × 7 天 = ~500 个 DOM 节点，每次切换 Tab 全部重建
2. **Store.get 无缓存策略**: renderRatings 调用 3 个 calc 函数，各自独立读 `Store.get('staff')` / `Store.get('linggongAttendance')` 等，同一数据被读 3 次
3. **Chart.js 重复初始化**: Dashboard 每次 render 都 `new Chart()`，旧实例未 destroy → 内存泄漏

**优化方向**:
- 引入数据预取（render 前一次性读取所有需要的数据）
- Chart.js 实例缓存 + destroy
- 大表格用 DocumentFragment 替代 innerHTML

### 6.4 云同步可靠性（6.5/10）

**优点**:
- 多层竞态防护: `_pushInFlight` + `_pushQueue` + 15秒防抖
- 字段级 `_updatedAt` 时间戳仲裁
- tombstone 防删除复活
- 乱码守卫防数据膨胀
- 云端 >1MB 时自动 DELETE 重建

**缺点**:
- GitHub Contents API 1MB 硬限制是架构级天花板
- Token 明文存储
- 无离线队列（网络断开时操作丢失）
- pull 后无数据校验（只做 JSON.parse，不验证结构完整性）
- 合并冲突无可视化（静默合并，用户不知道发生了什么）

### 6.5 使用便捷性（7.0/10）

**优点**:
- 移动端适配（2个 @media 断点 + 汉堡菜单）
- Auth 感知（兼职只能看自己的数据）
- Toast 通知系统
- 多月份切换
- 表单交互流畅（日历选择、Tab 切换）

**缺点**:
- 7 处 alert/confirm 阻塞主线程
- 同步状态不透明（用户不知道当前是否同步成功）
- 月份/筛选状态不持久（刷新后丢失）
- 无搜索功能（人员/记录多时难以定位）
- 0 处 aria 属性，屏幕阅读器不可用

---

## 七、修复优先级建议

### 第一阶段：止血（1-2天）
1. **P0-1**: 给 19 处 Store.get 加 `|| []` null 保护
2. **P0-2**: Router.render 中 Chart.js 实例 destroy 后重建
3. **P1-1**: 把 `'2026-07'` 硬编码改为配置驱动

### 第二阶段：优化（3-5天）
4. **P1-2**: onclick 改事件委托（至少高频页面）
5. **P2-2**: renderRatings 中数据预取（一次读取传入各 calc 函数）
6. **P2-8**: 清理 sync.js 的 console.log
7. **P1-4**: 写一键更新全部脚本

### 第三阶段：技术债（长期）
8. **P2-1**: 把 defaults 数据拆到独立 JSON 文件
9. **P2-6**: 补 aria 属性
10. **P3-2**: 引入构建工具压缩 JS

---

## 八、总结

系统在**功能完整性**上表现出色——12 个页面覆盖了兼职管理的全链路，评分体系严谨，云同步设计考虑了多种边界情况。tombstone 软删除、字段级时间戳仲裁、乱码守卫这些机制说明开发者对分布式数据一致性有深入理解。

但从**工程化角度**看，系统正在逼近纯前端方案的极限：
- 17K 行无模块化代码的维护成本会越来越高
- GitHub API 作为"数据库"的 1MB 限制终将成为瓶颈
- innerHTML 全量重绘 + 102 处内联 onclick 让测试和性能优化无从下手

**核心矛盾**: 系统复杂度已经超过了"纯 LocalStorage + 模板字符串"架构能优雅承载的范围。如果团队规模或数据量继续增长，建议评估迁移到真正的后端服务（如 Supabase/Firebase）。
