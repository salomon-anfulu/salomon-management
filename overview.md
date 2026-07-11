# v86: P1-1 / P1-2 / P1-3 第一性原则优化

## 改动总览
- **版本**: v85 → v86
- **文件**: js/app.js (+103 -25), js/pages.js (+137 -32)
- **语法验证**: node -c 全部通过

---

## P1-1: 消除7月硬编码 — MonthConfig 配置层

### 第一性原则
"7月跳过前两周"不是代码逻辑，是**业务规则**。规则应该可配置，不应该写死在条件判断里。

### 新增: MonthConfig 对象 (pages.js)
```javascript
const MonthConfig = {
  rules: {
    '2026-07': { skipWeeks: 2 },  // 7月前两周过渡期
    '2026-08': { skipWeeks: 0 },  // 8月正常
  },
  getSkipWeeks(ym)      // 替代 monthKey === '2026-07' ? slice(2) : allWeeks
  getActiveScoringMonth() // 替代 let _scoringMonth = '2026-07'
  getAvailablePerfMonths() // 业绩 tab 动态生成（原只写死4个月）
};
```

### 替换的硬编码
| 位置 | 原代码 | 新代码 |
|------|--------|--------|
| pages.js:624 | `monthForWeeks === '2026-07' ? slice(2) : allWeeks` | `allWeeks.slice(MonthConfig.getSkipWeeks(monthForWeeks))` |
| pages.js:658 | `const isJULY = month === '2026-07'` | `const hasSkip = MonthConfig.hasSkipWeeks(month)` |
| pages.js:1464 | `monthKey === '2026-07' ? slice(2) : allWeeks` | `allWeeks.slice(MonthConfig.getSkipWeeks(monthKey))` |
| pages.js × 4 | `_scoringMonth : '2026-07'` | `MonthConfig.getActiveScoringMonth()` |
| pages.js:1947 | `_scoringMonth === '2026-07'` | `_scoringMonth === MonthConfig.getActiveScoringMonth()` |
| pages.js:2841 | `isMay/isJune/isJuly` 硬编码 | `_mNum >= 6` / `_mNum >= 5` |
| app.js:8578 | `let _scoringMonth = '2026-07'` | `null` → 启动后动态推导 |
| app.js:8324 | `currentMonth: '2026-07'` | `new Date()` 动态当前月 |
| 业绩页 tabs | 写死 4 个月按钮 | `MonthConfig.getAvailablePerfMonths()` 动态生成 |

### 扩展到8月
只需在 MonthConfig.rules 加一行: `'2026-08': { skipWeeks: 0 }`，零代码改动。

---

## P1-2: 事件委托框架 — ActionHandler

### 第一性原则
`onclick="xxx()"` 绑定在 HTML 字符串上，通过 `window.xxx` 全局查找 → 不可测试。
解法: 一个 document 级 click 委托，用 `data-action` 属性路由。

### 新增: ActionHandler (app.js)
```javascript
// HTML: <button data-action="navigate" data-params='{"page":"schedule"}'>
// 替代: <button onclick="Router.navigate('schedule')">

ActionHandler.registerAll({
  navigate: (p) => Router.navigate(p.page),
  switchScoringMonth: (p) => { _scoringMonth = p.month; Router.render(); },
  switchPerfMonth: (p) => { perfMonth = p.month; Router.render(); },
  // ...
});
```

### 迁移策略: 双轨并行
- 新代码: 一律用 `data-action`
- 老代码: 102 个 onclick 继续工作，维护时顺手迁移
- 已迁移示范: 工作台 4 个快捷入口 + Router.render 错误兜底

---

## P1-3: Store._cache 同步安全

### 第一性原则
`Store.set()` 先改引用再写 localStorage → quota exceeded 时 cache 已污染但 localStorage 没更新 → 反向不一致。

### 修复
1. **深拷贝写入**: `JSON.parse(JSON.stringify(this._cache))` 后修改 → localStorage 成功才更新 _cache
2. **storage 事件**: 跨 tab 写入时失效 _cache (`window.addEventListener('storage', ...)`)
3. **自动恢复**: get/getAll 遇到 _cache=null 时从 localStorage 重新 parse
4. **失败提示**: quota exceeded 时弹 toast 提醒清理
