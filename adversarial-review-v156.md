# 对抗式审查报告 · v156（权限模型专项 + 全局复查）

> 审查视角：攻击者 / 批判性工程师。不假设现状、直接读代码验证（app.js / pages.js / auth-guard.js / index.html / 既有 adversarial-review.md）。
> 审查日期：2026-07-31，基线版本 **v156**（commit `65a5074`，已上线 GitHub Pages）。
> 审查触发：v156 新增「权限重构（管理员可编辑所有 / 普通用户只填报本人 + 只读全可见）」「隐藏 admin」「李若彤离职标记」后，检验底层是否真的兜住了 UI 的防。

---

## 总评

v156 在**诚实用户（不开 DevTools）视角下**基本达到了需求：普通用户界面上只能看到/填报自己，管理员按钮可见，admin 不出现在任何业务列表。

**但整套权限模型是「前端礼仪」而非「强制约束」**——根因是 v152 遗留的 🔴P0-1（RLS 让 22 个账号都能 upsert 整个 blob）一直没修。v156 在此之上加了纯 UI 守卫，反而制造了「系统已有权限控制」的**错觉**，比改之前更危险（因为看起来安全了）。

一句话结论：**v156 把权限写在了不该写的地方（浏览器 DOM），而该写的地方（数据库 RLS / 写入函数兜底）只覆盖了一半，且有一处 fail-open 和一处「管理员改不动」的硬伤。**

---

## 🔴 P0-0（v152 遗留 + v156 恶化）权限无后端强制，UI 守卫可被完全绕过

**证据**
- `supabase/sync_table.sql`：`FOR ALL USING (auth.role()='authenticated')` —— 22 个账号每个都能 `upsert` 整个 `app_data` blob（v152 报告 P0-1，至今未修）。
- v156 所有权限判断都在 `pages.js` 的 UI 层（`_auth.isAdmin`、表单 `disabled`、按钮 `if(_auth.isAdmin?...:'')`）。

**绕过方式（任一即可）**
1. 开 DevTools Console：`Auth.staffName='王雅澜'; saveShift({...})` / `saveSupport({...})` / `saveDateStatus(15)` / `saveDoorSlot()` —— 直接改全局后调函数，写任意人的数据。
2. 直连 Supabase：`salomonSupabase.client.from('app_data').update({data: 任意})` —— anon key 在 `config.js`、session 有效，整 blob 可整体覆盖。
3. 改 DOM：`document.getElementById('doorSlotStaff').disabled=false` 再把值改成别人，点保存。

**结论**：v156 的「普通用户只能填报自己」对**有意绕过者零保护**，对**无心误操作**有保护作用。这与需求「其他人只能填报自己的部分」在严格意义下不成立。

**修复建议（按成本排序）**
- 最小代价且立竿见影：**收紧 RLS**（`WITH CHECK` 限 `role='admin'|'manager'`，兼职只读整 blob）。代价：兼职不能自己 push（需靠管理员或定时任务汇总）——但安全性质变。
- 正确解法：把 `app_data` 整 blob 拆成按人子表 / 字段级，RLS 按 `auth.uid()` 限定只能改自己的行。工作量大，但是唯一能同时满足「兼职自更新 + 安全」的方案（与 v152 用户已确认的「员工要自己更新数据」需求一致）。

---

## 🔴 P0-1（v156 新增）`_auth` 守卫 fail-open

**证据** `pages.js:12-17`：
```js
const _auth = {
  get isAdmin()   { return typeof Auth !== 'undefined' ? Auth.isAdmin : true; },   // ← Auth 未定义时返回 true（管理员）！
  get staffId()   { return typeof Auth !== 'undefined' ? Auth.staffId : null; },
  get staffName() { return typeof Auth !== 'undefined' ? Auth.staffName : null; },
  get role()      { return typeof Auth !== 'undefined' ? Auth.role : 'admin'; },     // ← Auth 未定义时返回 'admin'！
};
```

**漏洞**：安全守卫在依赖对象 `Auth` 未初始化时应 **fail-closed（默认拒）**，这里却 fail-open（默认放行）。正常流程 `Auth` 必已定义，但任何时序意外（脚本加载竞态、某异常分支提前调保存函数）都会让所有人被当成 admin，绕过全部权限判断。

**修复**：`get isAdmin() { return typeof Auth !== 'undefined' && Auth.isAdmin === true; }`（默认 `false`）；`role` 默认 `''` 或 `'parttime'`。

---

## 🟠 P1-0（v156 遗漏）写入函数守卫「只加了一半」，与同质函数不一致

v156 给一批写入函数加了 `if(!_auth.isAdmin){ 强制本人 / 拦截 }` 兜底（`saveStaff`/`saveReviewForm`/`deleteReview`/`saveShift`/`saveSupport`/`deleteShift`/`deleteSupport`/`saveDoorSlotInline`/`deleteDoorSlotInline`）。但下列**同质的写入入口没有函数级守卫**，仅依赖渲染期 DOM 锁定：

| 函数 | 行 | 风险 |
|---|---|---|
| `saveDoorSlot`（门迎弹窗版） | 4561 | 读 `#doorSlotStaff` 值，无本人/管理员校验；控制台可写任意人 |
| `saveDoorDay`（新增门迎日期） | 4491 | 无守卫（结构性，低风险但应统一） |
| `deleteDoorSlot`（门迎弹窗版） | 4585 | 仅 `confirm()`，无本人归属校验 → 可删**他人** slot |
| `saveDateStatus`（个人可用性） | 5132 | 写全局 `_availStaff`，函数内无「只能写本人」校验 |
| `clearDateStatus`（清除可用性） | 5172 | 同上 |
| `saveRating`（提交评分） | 2724 | 读 `#rate_staff` 任意 staffId，无守卫 → 可给任何人打分 |

**对比**：inline 版 `saveDoorSlotInline`/`deleteDoorSlotInline` 都有 `if(!_auth.isAdmin){...}` 兜底，说明 v156 改造**漏掉了弹窗版和可用性/评分路径**。

**修复**：对以上每个函数补 `if(!_auth.isAdmin){ const me = staff.find(id===_auth.staffId); if(me) 目标=me.name; }`（可用性改为校验 `_availStaff===_auth.staffName` 否则拦截；`deleteDoorSlot` 改为校验 slot.staff===本人）。与已守卫函数保持同一模式。

---

## 🟠 P1-1（v156 硬伤）迁移强制覆盖 → 「管理员也改不动」4 个字段

**证据** `app.js:5605-5645`（v132/v140，每次 `Store.init` 执行）：
```js
// 用 defaults.staff 的 dept/status/transferredFrom/serviceTeamStartDate 强制覆盖 blob 同名成员
cur.staff = cur.staff.map(s => {
  const _def = _defMap.get(String(s.id));
  if (!_def) return s;
  if (s.dept!==_def.dept || s.status!==_def.status || (s.transferredFrom||'')!==(_def.transferredFrom||'') || (s.serviceTeamStartDate||'')!==(_def.serviceTeamStartDate||'')) {
    return { ...s, dept:_def.dept, status:_def.status, transferredFrom:_def.transferredFrom||s.transferredFrom, serviceTeamStartDate:_def.serviceTeamStartDate||s.serviceTeamStartDate };
  }
  return s;
});
```

**漏洞（与需求#3 直接矛盾）**：管理员在 UI 改了某人的 `dept`/`status`/`transferredFrom`/`serviceTeamStartDate` 并推送，**下次加载（或任何设备同步后）会被打回 defaults 的值**。即「管理员可编辑所有」对这 4 个字段是假的。
- 李若彤之所以**能**稳定显示离职，正是因为她在 `defaults.staff` 里就是 `status:'left'`——靠的是 defaults 权威，不是管理员改的。
- 反例：若管理员想通过 UI 让某人「离职」或「转部门」，改完下次打开又变回 active/原部门。

**修复**：把「defaults 强制覆盖」收窄为**仅首次补全缺失成员 + 仅当 blob 完全缺该字段时回填**，不再每次 init 覆盖已有值；或将这 4 个字段的编辑入口改为「改 defaults 并 redeploy」的明确流程，并在 UI 提示「该字段由系统模板管理，不可在页面修改」。

---

## 🟠 P1-2 / P1-3 / P1-4（v152 遗留，v156 未触及，仍开放）

- **P1-2 并发 last-write-wins 无乐观锁**（`sync.js` get→merge→save 非原子）：高峰多设备同改必丢数据。需 `updated_at` 条件写 + 重试，或 Postgres 函数服务端合并。
- **P1-3 离线写丢失无队列**：`Store.set` 只写本地，`Sync.push` 离线失败静默丢弃，重连只 pull 不重推本地未同步改动。需 `pendingWrites` 队列 + 重连先 flush。
- **P1-4 无审计/无快照**：整 blob 覆盖即不可逆；`updated_by` 仅记最后推的人且可伪造。需 `change_log` 表 + 每日快照。

---

## 🟡 P2 级

- **P2-1 `deleteDoorSlot`（弹窗版 4585）无归属校验**：可删他人 slot；inline 版 `deleteDoorSlotInline` 有校验，应统一。
- **P2-2 admin 填「我的填报」会写幽灵记录**：admin 登录后 `_auth.staffName='管理员'`，`renderMyForms` 把 `_availStaff` 锁成 '管理员'。若 admin 在可用性/门迎里提交，会落库一条 `staff='管理员'` 的记录；而 `isManagementStaff('管理员')` 只在**渲染过滤**生效、写入不校验 → 这条 '管理员' 记录会像幽灵一样存在 blob 里（列表不显示，但占数据、参与合并）。建议：admin 的「我的填报」直接禁用提交或显式提示「管理者无需填报」。
- **P2-3 渲染锁 / Realtime 回声 / 断路器**（P2-1~3，见原 `adversarial-review.md`）：仍静默、弱网误判、触发后无提示，未修。
- **P2-4 版本号硬编码 15 处**（`?v=` + footer 文字 + sw 缓存键）：v156 已全量 bump 且无残留，但结构脆弱，建议 footer/缓存键改读 `version.json` 动态渲染。

---

## 操作性 / 整体运行观察

1. **离职人员历史数据仍全量可见**：李若彤的排班/考勤/业绩/好评/支援历史仍在各页面（门迎表里还显示为 '李若彤'）。这符合「可查看所有信息」需求，非 bug；仅提示：若未来要「彻底隐藏离职者」，需在渲染层加 `status!=='left'` 过滤（当前只在人员管理标记 + 我的填报下拉排除）。
2. **诚实用户视角已达标**：不开 DevTools 时，普通用户界面受限、管理员按钮可见、admin 不出现——需求 1/2/3 的「表现层」满足。
3. **Service Worker 更新**：v156 缓存键 `sw-v156` 已升，用户刷新即拉新资源，无需手动清缓存（除非旧标签页长期不关导致 `__PANIC_SYNC__` 触发，见 P2-3）。

---

## 改进优先级路线图

| 优先级 | 项 | 成本 | 价值 |
|---|---|---|---|
| 🔴 P0-0 | RLS 收紧（至少 `WITH CHECK` 限 admin 写） | 低 | 阻断整 blob 被任意覆盖（根因） |
| 🔴 P0-1 | `_auth` 改 fail-closed | 极低 | 消除守卫自我失效 |
| 🟠 P1-0 | 补齐 6 个写入函数守卫 | 低 | 消除「守卫只加一半」的不一致 |
| 🟠 P1-1 | 迁移强制覆盖收窄 | 中 | 让「管理员可编辑所有」成真 |
| 🟠 P1-2/3/4 | 乐观锁 / 离线队列 / 审计快照 | 高 | 数据可靠性（建议单列迭代） |
| 🟡 P2 | 归属校验 / admin 幽灵记录 / 版本号动态化 | 低~中 | 健壮性 |

**最低可行加固（半天级）**：P0-1 + P1-0 + P2-1 + P2-2 全做，可把「诚实用户 + 轻度试探」场景彻底封死；再配合 P0-0 的 RLS 收紧，系统才真正谈得上「权限」。

---

## 遗留待办（合并前轮）

- [ ] **P0-0** RLS 收紧（v152 P0-1，v156 使其更危险）
- [ ] **P0-1** `_auth` fail-closed
- [ ] **P1-0** 补齐 saveDoorSlot/saveDoorDay/deleteDoorSlot/saveDateStatus/clearDateStatus/saveRating 守卫
- [ ] **P1-1** 迁移强制覆盖收窄（否则管理员改不动 dept/status 等）
- [ ] **P1-2** 并发乐观锁
- [ ] **P1-3** 离线写队列
- [ ] **P1-4** 审计日志 + 快照
- [ ] **P2-1** deleteDoorSlot 归属校验
- [ ] **P2-2** admin「我的填报」禁用提交 / 防幽灵记录
- [ ] **P2-3** 渲染锁/回声/断路器（见原报告）
- [ ] **P2-4** 版本号动态化
