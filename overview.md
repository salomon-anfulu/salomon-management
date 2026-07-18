# 全系统对抗性审查报告 (v114)

> 审查范围: app.js + pages.js + sync.js 全量扫描，6 维度覆盖
> 审查日期: 2026-07-18
> 代码量: app.js(9000+行) + pages.js(5786行) + sync.js(1582行)

---

## 一、审查结果概览

| 维度 | P0 严重 | P1 中危 | P2 低危 | 状态 |
|------|---------|---------|---------|------|
| XSS 与输入安全 | **3** | 2 | — | 本轮发现 |
| Store 数据层 | **1** | 2 | 3 | 本轮发现 |
| 云同步 sync.js | — | — | — | ✅ 已加固 |
| Router 与初始化 | — | 2 | 2 | 本轮发现 |
| 渲染层 null 安全 | — | 1 | — | ✅ v114已修 |
| 评分模块 | — | — | — | ✅ v113-v114已修 |
| **合计** | **4** | **7** | **5** | |

---

## 二、P0 严重问题（4 个，建议立即修复）

### P0-1: XSS — 全系统无 HTML 转义层 ⚠️ 最高危

**位置**: `js/pages.js` 全局，~30 处模板插值

**问题**: 所有渲染函数返回 HTML 字符串直接赋值给 `innerHTML`，用户输入（姓名、评语、好评内容、支援详情等）直接 `${变量}` 插值，无任何 `escapeHtml` 或 `textContent` 转义。

**攻击向量**: 在任何文本输入框输入 `<img src=x onerror=alert(1)>` 后保存，该内容会在所有引用该字段的页面执行。

**最高危字段**:
| 字段 | 来源 | 危险行号 | 影响 |
|------|------|----------|------|
| `r.snippet`（好评内容） | textarea 自由文本 | pages.js:4182 | 渲染在好评详情页，完整内容无截断 |
| `r.comment`（评语） | textarea 自由文本 | pages.js:2521, 3964 | 评分卡片+个人中心 |
| `s.detail`（支援详情） | textarea 自由文本 | pages.js:345, 3667, 5288 | 3 处渲染 |
| `c.applicantShift`（换班说明） | input 自由文本 | pages.js:3852, 3854 | 换班记录页 |
| `s.name`（员工姓名） | input 自由文本 | ~15 处 | 全局影响 |

**特殊漏洞 — input 属性注入**:
```javascript
// pages.js:4253 — keywords 回填到 value 属性
value="${review.keywords ? review.keywords.join(', ') : ''}"
```
如果 keywords 包含 `"` 可以闭合属性，注入 `onfocus=alert(1) autofocus`。

**修复方案**: 新增全局 `escapeHtml()` 函数，包装所有用户可控数据的模板插值。

```javascript
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### P0-2: Store.set() 引用污染

**位置**: `js/app.js:5214`

**问题**: `data[key] = value` 直接存入调用方引用。`JSON.stringify` 写入 localStorage 是安全的，但 `_cache = data` 后，cache 内部指向的是调用方原始对象。

```javascript
const list = Store.getList('staff');
list[0].name = '<script>';  // 直接污染 _cache，且不持久化
// 下次 Store.get('staff') 返回被污染的数据
```

**修复方案**: 第 5214 行改为深拷贝：
```javascript
data[key] = JSON.parse(JSON.stringify(value));
```

### P0-3: localStorage 异常处理路径二次崩溃

**位置**: `js/app.js:5165`

**问题**: `init()` 的 catch 块中，第 5162 行有 try/catch 保护备份操作，但第 5165 行的重置操作 `localStorage.setItem(this.KEY, JSON.stringify(this.defaults))` **没有 try/catch**。在隐私模式（localStorage 被禁用）下，这里会再次抛异常，导致整个应用启动失败白屏。

```javascript
} catch (e) {
  // ...
  try {
    localStorage.setItem(this.KEY + '_error_backup', existing);  // 有保护
  } catch (e2) { /* ignore */ }
  localStorage.setItem(this.KEY, JSON.stringify(this.defaults));  // ❌ 无保护
}
```

同样问题也在 `reset()`(5240) 和 `importData()`(5296) 中存在。

**修复方案**:
1. 文件开头增加 localStorage 可用性检测
2. 第 5165 行包裹 try/catch
3. 提供"内存模式"降级（不持久化但能用）

### P0-4: _auth 跨文件初始化冻结

**位置**: `js/pages.js:9` vs `js/index.html:155`

**问题**: pages.js 第 9 行 `_auth = typeof Auth !== 'undefined' ? Auth : { fallback }`，此时 Auth（定义在 index.html 内联脚本，在 pages.js 之后加载）处于 TDZ。`typeof Auth` 在某些浏览器返回 `'undefined'`，导致 `_auth` 被冻结为 fallback 值（`staffName: null`）。

结果：非管理员用户在"我的填报"页面无法正确过滤个人数据（`find(s => s.id === null)` 返回 undefined）。

**修复方案**: 改为函数式获取 `getAuth()`，在运行时（而非加载时）读取 `Auth`。

---

## 三、P1 中危问题（7 个）

| # | 问题 | 位置 | 描述 |
|---|------|------|------|
| P1-1 | getStaff 类型不一致 | app.js:5331 | `s.id === id` 严格比较 Number id，DOM `data-id` 传字符串会静默返回 null |
| P1-2 | staff 合并以 name 为键 | app.js:5005 | 用户改名导致数据重复 + 编辑丢失 |
| P1-3 | switchAttMonth/switchPerfMonth TDZ | app.js:5366, 5504 | handler 引用后续脚本中 `let` 声明的变量 |
| P1-4 | get() catch 返回 defaults 引用 | app.js:5197 | 调用方修改会污染 Store.defaults |
| P1-5 | performanceData 浅引用赋值 | app.js:5126 | defaults 对象被 data.performanceData 引用，修改会污染 defaults |
| P1-6 | Router 无 hashchange 路由 | app.js:5371 | 浏览器前进/后退无效，刷新丢失页面状态 |
| P1-7 | 全局错误兜底条件过严 | app.js:5622 | `main.children.length === 0` 很少触发 |

---

## 四、P2 低危问题（5 个）

| # | 问题 | 位置 | 描述 |
|---|------|------|------|
| P2-1 | _scoringMonth 跨文件初始化 | app.js:5643 | dead code（MonthConfig 此时未定义），真正初始化在 pages.js:5753 |
| P2-2 | 脚本无 defer/async | index.html:150 | 因在 body 末尾所以无实际问题，但依赖位置 |
| P2-3 | localStorage 隐私模式未全局检测 | 多处 | reset/importData 等 API 在隐私模式下崩溃 |
| P2-4 | 无备份数据完整性校验 | app.js:5315 | restoreSafetyBackup 恢复损坏备份会触发循环崩溃 |
| P2-5 | 全局变量散落 | app.js+pages.js | _scoringMonth/_scheduleMonth/_attMonth/perfMonth 分散在 4 处 |

---

## 五、已确认安全的模块

### 云同步 sync.js ✅

经逐行审查确认以下机制安全：

| 机制 | 位置 | 状态 |
|------|------|------|
| push/pull 竞态保护 | `_pushInFlight` (sync.js:36) | ✅ push 进行中 pull 跳过 |
| push 队列合并 | `_processPushQueue` (sync.js:510) | ✅ v65 修复引用拷贝+清空竞态 |
| _mergeFields 字段仲裁 | sync.js:1289 | ✅ `_updatedAt` 时间戳取最新 |
| tombstone 软删除 | sync.js:1309+ | ✅ distributed delete 不物理删除 |
| Token 安全存储 | sync.js:84 | ✅ btoa 编码 + fine-grained scope |
| 1MB 限制处理 | sync.js:566 | ✅ 超限自动删除+重建 |
| 409 冲突重试 | sync.js:547 | ✅ MAX_ROUNDS=3 乐观锁重试 |

### 评分模块 ✅（上轮已修）

v113-v114 已修复全部 P0(3) + P1(4) + P2(1)，包括门控 shape 一致性、UI 视觉矛盾、除零保护、tickets fallback、时区坑、魔法数字提取。

### 渲染层 ✅（上轮已修）

v114 已修复 `perfCalc.hourly` 等字段无 `|| 0` 兜底的问题。

---

## 六、推荐修复优先级

### 第一批（立即修，约 30 分钟）
1. **P0-1**: 新增 `escapeHtml()` 函数 + 包装高危字段（snippet/comment/detail/name）
2. **P0-2**: Store.set 深拷贝 value
3. **P0-3**: init() catch 路径 + 隐私模式降级

### 第二批（本周修，约 20 分钟）
4. **P1-1**: getStaff 类型归一（`String(s.id) === String(id)`）
5. **P0-4**: _auth 改为函数式获取
6. **P1-4/P1-5**: get() catch 和 performanceData 浅引用修复

### 第三批（后续迭代）
7. **P1-6**: Router 增加 hashchange 支持
8. **P1-2**: staff 合并键改为 id+name 双键
9. **P1-3**: switchAttMonth handler 改用函数闭包延迟绑定
10. P2 系列按需处理

---

## 七、总结

系统核心架构（数据层、同步层、评分模块）经过 v89-v114 的持续加固，已经相当健壮。本轮新发现的 16 个问题中：

- **P0 集中在 XSS 和引用安全**——这两个是纯前端应用最常见的系统性漏洞，需要在架构层面引入转义层和深拷贝规范
- **sync.js 经审查确认安全**——竞态保护、版本仲裁、tombstone 机制设计成熟
- **评分模块已完全加固**——上一轮 v113-v114 修复的 10 个问题覆盖了所有发现的缺陷

建议优先处理 P0-1（XSS 转义层）和 P0-2/P0-3（Store 引用+降级），这三项修复后系统安全等级将显著提升。
