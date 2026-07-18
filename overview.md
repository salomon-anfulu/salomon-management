# v116 P1 中危修复报告

> 版本: v115 → v116
> 日期: 2026-07-18
> 范围: app.js 全量 P1 问题（7个）

---

## 修复清单

### P1-1: getStaff 类型归一 ✅
- **问题**: `s.id === id` 严格比较，DOM `data-id` 传字符串 → 查找静默返回 null
- **修复**: `String(s.id) === String(id)` 类型归一
- **影响范围**: `getStaff()` + `_isFullTimeStaff()` 两处
- **测试**: Number id / String id / 不存在 id 全覆盖

### P1-2: staff 合并 id+name 双键 ✅
- **问题**: 用户改名后 `existingStaffMap.set(s.name, s)` 以 name 为唯一键，导致数据重复
- **修复**: 改为 `existingById` + `existingByName` 双 Map，id 优先匹配，name 兜底
- **兼容**: 旧数据(id 缺失)走 name 匹配；新数据走 id 匹配
- **测试**: 新增成员(id 不在 defaults)仍被保留

### P1-3: switchMonth TDZ 安全 ✅
- **问题**: `window.switchAttMonth` / ActionHandler 引用 pages.js 中 `let _attMonth` / `let perfMonth`，加载时序错误会触发 TDZ
- **修复**: 所有跨文件 let 变量赋值加 `typeof X !== 'undefined'` 守卫
- **覆盖**: switchScoringMonth / switchScheduleMonth / switchAttMonth / switchPerfMonth 共 6 处

### P1-4: get() defaults 深拷贝 ✅
- **问题**: catch 块和正常路径回退 defaults 时返回直接引用，调用方修改污染 `Store.defaults`
- **修复**: 
  - 正常路径(5199行): `val = JSON.parse(JSON.stringify(_def))`
  - catch 路径(5203行): 同样深拷贝
- **测试**: 修改返回值的 nested 和 list，验证 defaults 未被污染

### P1-5: performanceData / linggongAttendance 深拷贝 ✅
- **问题**: 
  - `data.performanceData[mk] = this.defaults.performanceData[mk]` 直接引用
  - `merged.linggongAttendance = { ...defaults, records: [...defaultRecords] }` 浅拷贝，records 元素仍是引用
- **修复**: 两处都改为 `JSON.parse(JSON.stringify(...))`

### P1-6: Router hashchange 路由 ✅
- **问题**: 浏览器前进/后退无效，刷新丢失页面状态
- **修复**:
  - `navigate()` 同步 `location.hash = '#/' + page`
  - 注册 `hashchange` 事件监听，切换页面
  - 首次加载从 URL hash 恢复页面
  - 合法页面白名单校验（防恶意 hash）

### P1-7: 全局 error handler 放宽 ✅
- **问题**: `main.children.length === 0` 条件过严，渲染失败但有残留内容时不触发兜底
- **修复**:
  - 新增 `_lastRenderOk` 标记（声明在 Router 之前避免 TDZ）
  - Router.render 成功设 true，catch 设 false
  - error handler 检测 `isEmpty || renderFailed`

---

## 测试覆盖

**35 项 VM 测试全通过**:
- P1-1: 4 项（类型归一）
- P1-2: 3 项（双键合并）
- P1-3: 4 项（TDZ 守卫）
- P1-4: 2 项（深拷贝 + 污染检测）
- P1-5: 2 项（深拷贝代码存在性）
- P1-6: 4 项（hashchange 完整链路）
- P1-7: 4 项（声明顺序 + 标记设置）
- 12 个页面渲染回归: 全部无 undefined/NaN/[object Object]

测试脚本: `scripts/test_v116_p1.js`

---

## 剩余问题

- **P2×5**: 均为低危长期改进，不影响运行正确性
  - P2-1: _scoringMonth dead code
  - P2-2: 脚本无 defer
  - P2-3: localStorage 隐私模式全局检测
  - P2-4: 备份数据完整性校验
  - P2-5: 全局变量散落

**至此 P0×4 + P1×7 全部修复完成**，系统安全等级显著提升。
