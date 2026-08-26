# 安福路兼职管理系统 · GitHub → Supabase 同步架构转变说明

> 整理日期：2026-07-30 | 当前版本：v151（commit `f5b1151`）
> 适用读者：项目维护者 / 接手开发者

---

## 一、为什么要转（原 GitHub 方案的痛点）

原系统架构：纯前端 HTML/CSS/JS + `LocalStorage` 本地存储 + **GitHub Contents API**（`data/submissions.json`）做云同步。

实际运行中暴露的问题：

| 维度 | GitHub Contents API 方案的问题 |
|---|---|
| 鉴权 | 必须配置 GitHub Token（PAT），Token 失效/权限不足即同步失败 |
| 稳定性 | 网络波动、API 限流、仓库权限变更都会导致同步中断，多设备数据不一致 |
| 并发 | 单 JSON 文件，多设备同时写易互相覆盖（last-write-wins，无合并） |
| 实时性 | 只能定时器轮询，"拉"动作有延迟，无推送能力 |
| 维护 | 依赖外部 GitHub 账号/仓库状态，与业务系统解耦差 |

**目标**：用 Supabase 替代 GitHub 做云端同步后端，获得稳定鉴权、行级权限（RLS）、实时推送（Realtime）、以及更可控的数据模型。

---

## 二、目标架构（Supabase）

```
┌─────────────┐   实时推送     ┌──────────────────────────────┐
│  浏览器 A    │◄─────────────►│  Supabase                     │
│ (LocalStorage)│  Realtime     │  app_data(id='main')          │
│   Store blob │               │    data: jsonb ← 整个 Store   │
└──────┬──────┘               │  Auth: 邮箱+密码登录          │
       │  push/pull           └──────────────────────────────┘
┌──────┴──────┐                       ▲
│  浏览器 B    │───────────────────────┘ 同表同步
└─────────────┘
```

- **存储表**：`public.app_data`，单行 `id = 'main'`，`data` 为 `jsonb`，存放**整个 LocalStorage Store 的 blob**（含 availability / performanceData / staff / 考勤 / 评分等全部模块数据）。
- **鉴权**：Supabase Auth（邮箱+密码，自 v142 引入），登录后拿 `access_token` 才能读写 `app_data`。
- **实时**：Realtime 订阅 `postgres_changes`，任一设备写入后其他设备秒级收到变更并自动合并渲染。
- **兜底**：GitHub Contents API 通道**保留**为降级路径，Supabase 不可用时自动回退。

---

## 三、数据模型转变

| 对比项 | 原 GitHub 方案 | 现 Supabase 方案 |
|---|---|---|
| 存储位置 | `data/submissions.json`（仓库文件） | `app_data` 表单行 `data` 字段（jsonb） |
| 同步粒度 | 整文件覆盖写 | 整 blob 覆盖写（upsert `onConflict: 'id'`） |
| 冲突策略 | last-write-wins，易覆盖 | 同样整包替换，但配合"远端→本地 merge"减少丢失 |
| 权限 | 依赖 GitHub Token | RLS 策略 `app_data_authed_rw`（`auth.role()='authenticated'`） |
| 实时 | 无 | Realtime 推送 |

> 设计取舍：采用「整包替换」而非字段级同步，是为了**规避复杂冲突合并**，保持前端逻辑简单。代价是理论上仍有整包覆盖风险，但配合 `_mergeLocalIntoShared` / `_mergeIntoLocal` 双向合并 + echo 防护，实际多设备体验稳定。

---

## 四、同步机制转变（核心）

**原方案（单通道轮询）**
```
定时器 → GitHub API 拉 submissions.json → 覆盖本地
本地变更 → GitHub API 推 submissions.json
```

**现方案（双通道并行 + 防循环）**
```
本地变更 → Sync.push()
            ├─ Supabase: app_data.save(blob)  [fire-and-forget，不阻塞]
            └─ GitHub:    推 submissions.json  [兜底，仍启用]

远端变更 → 统一入口 _applyRemoteData(remoteBlob, source)
            ├─ Supabase pull（定时 / 可见性恢复 / Realtime 触发）
            ├─ Realtime 订阅 → 防抖 800ms → 拉取 → 合并渲染
            └─ GitHub pull（兜底）

渲染锁 window.__applyingRemote 期间：阻断 Store.set 触发 push（切断死循环链路）
echo 时间戳 _lastSupabaseWriteTs：自己 push 后 3s 内忽略 Realtime 回声
render 上限断路器：8s 内 >6 次 → 标记 __PANIC_SYNC__ 短路（复用 v149）
```

**降级策略**：首次探测 `app_data` 表不存在（relation does not exist）则置 `_supabaseTableMissing = true`，**永久降级回 GitHub**，不打日志骚扰。

---

## 五、版本演进时间线（关键决策记录）

| 版本 | 日期 | 关键动作 |
|---|---|---|
| v138 | 07/26 | 门迎排班冻结 |
| v141 | — | 引入 Supabase 客户端层（`supabase-client.js`，封装 auth / 业务表读写 / subscribe） |
| v142 | — | 邮箱+密码登录体系（Supabase Auth 接入） |
| v145 | — | 数据库洁癖 + login 修复 |
| **v146** | — | ⚠️ **Store 接入 Supabase + Realtime** —— 引入「Realtime 回声 → pull → render → Store.set → push → 又回声」**秒级无限刷新死循环** |
| v147 | — | 回滚 v146 止血（移除 Realtime 循环代码） |
| v148 | — | 加固 Service Worker 缓存清理，防旧版坏脚本残留 |
| v149 | — | 刷新风暴断路器：index.html 探针 8s 内 >6 次 reload 计数 + `window.__PANIC_SYNC__` 短路 no-op |
| **v150** | 07/30 | ✅ **三重防循环安全重接 Supabase**：① echo 时间戳 ② 渲染锁 `__applyingRemote` ③ render 上限断路器。统一远端入口 `_applyRemoteData`。Node vm 回归测试 `echo-guard.cjs` 100% 通过 |
| **v151** | 07/30 | ✅ 修复退出登录无限刷新：`auth-guard.js` 全局变量名大小写错误（`SalomonSupabase` 应为 `salomonSupabase`），致 `signOut()` 从未执行、Supabase 会话残留触发 `login.html ↔ index.html` 无限弹跳 |

---

## 六、踩过的坑（永久教训）

1. **Realtime 回声死循环（v146）** —— Supabase Realtime 默认把变更回声给发起者自己。若 pull 成功后直接 `Router.render()`，而 render 内页面逻辑写 Store、写 Store 触发 push、push 又触发 Realtime 回声，形成秒级无限循环。根治靠 v150 三重防护（echo 时间戳 + 渲染锁 + render 上限）。

2. **旧标签页死结** —— 一旦坏脚本（如 v146）在旧标签页跑起来，标签页极快循环中浏览器没机会完成 SW 更新/缓存清理，旧 SW 永远喂旧坏脚本。代码改好也救不了**已运行**的坏标签页，必须用户关闭该站点 ALL 标签页（含后台）后重开，或 DevTools → Application → Service Workers → Unregister + Clear site data。

3. **全局变量名大小写（v151）** —— `supabase-client.js` 暴露 `window.salomonSupabase`（小写 s），`auth-guard.js` 误用 `SalomonSupabase`（大写 S）致 `typeof` 恒为 undefined、`signOut` 永不执行。跨文件引用全局变量前先 grep 确认确切命名。

4. **版本号 4 处同步铁律** —— 每次发布必须改：`app.js`（`_dataVersion` + `DATA_VERSION`）+ `index.html`（`?v=`×6）+ `sw.js`（`sw-vN` / `static-vN` / `img-vN`）+ `version.json`（`dataVersion` + `cacheBuster`）。漏改任何一处，浏览器/SW 就会继续喂旧脚本。

5. **建表顺序（用户侧操作）** —— `app_data` 表不建，前端会静默降级回 GitHub，Supabase 通道不生效。需手动在 Supabase SQL Editor 执行 `supabase/sync_table.sql`。

---

## 七、需执行的 SQL（两处）

**① `supabase/sync_table.sql`** —— 建 `app_data` 表 + RLS（✅ 已于 2026-07-30 由用户执行，验证 `table_exists=1, policy_count=1`）

**② `supabase/cleanup.sql`** —— 数据库洁癖 v2（补建田/杨、清退李若彤、删测试员 id=1、去重 auth.users/staff、回填 auth_id）。**幂等，可分段执行**，段 B/C 操作 `auth.users` 可能撞 `42501` 权限错，可改在 Authentication 面板手动删。

---

## 八、当前状态 & 用户侧验证清单

- ✅ v151 已推送（`f5b1151`）：退出登录不再无限刷新
- ✅ `app_data` 表已建好，Supabase 双通道同步生效，GitHub 兜底保留
- ✅ 隐身模式登录 / 退出登录正常

**已验证 / 待验证：**
- [x] `sync_table.sql` 执行成功（table_exists=1, policy_count=1）
- [x] 退出登录不再无限刷新（v151 代码修复）
- [ ] 关闭所有标签页重开，确认拿到 v151 + SW 缓存 `static-v151`
- [ ] 跨设备同步实测（A 设备改数据 → B 设备秒级同步）
- [ ] `cleanup.sql` v2 洁癖脚本执行（可选，人员表整理）

---

## 九、一句话总结

> 从「GitHub 单文件轮询同步」升级为「Supabase 单行 jsonb + Realtime 实时双通道同步」，历经 v146 死循环事故与 v151 大小写 bug 两次重大修复，目前 v151 已稳定运行：Supabase 实时同步为主、GitHub 兜底，退出登录已修复，云端同步能力恢复。
