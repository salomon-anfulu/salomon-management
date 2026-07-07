# v51: 多用户同步根因修复

## 问题现象
员工填写数据后，其他设备/用户无法看到最新数据。

## 第一性原理分析

从数据流最底层逐环节追踪「用户A填写 → 用户B看到」的完整链路：

```
A.saveDateStatus() → Store.set() → Sync.push() → GitHub API
                                                      ↓
B.Router.render() ← Store._cache ← _mergeIntoLocal ← Sync.pull()
```

## 发现的 3 个根因

### P0-1: pull 后不刷新页面（最关键）
**位置**: `js/sync.js` → `pull()` 方法

`_mergeIntoLocal()` 把云端数据写入了 `Store._cache`，但**没有调用 `Router.render()`**。
结果：用户B 的 LocalStorage 已经有最新数据，但页面 DOM 上仍然显示旧数据。
只有在用户B手动切换页面或刷新浏览器时才能看到新数据。

**修复**: pull 后对关键数据做快照对比，如果发生变化则 `requestAnimationFrame(() => Router.render())` 自动刷新页面。

### P0-2: push 时 availability 整体覆盖
**位置**: `js/sync.js` → `_mergeLocalIntoShared()` 方法

```javascript
// 旧逻辑（有Bug）:
shared.availability[monthKey].data[staffName] = personData;  // 直接覆盖！
```

场景：用户A 填了 7/3 可用 → push 到云端。用户B 同时填了 7/4 可用 → push 时把**自己的完整 personData** 覆盖了云端的，导致 A 的 7/3 数据丢失。

pull 端（`_mergeIntoLocal`）有逐日合并逻辑，但 push 端（`_mergeLocalIntoShared`）没有——**两端不对称**。

**修复**: push 端也改为逐日合并 `dates` 字段，保留双方填写的日期。

### P1: push 并发竞态
**位置**: `js/sync.js` → `push()` 方法

多次快速保存（如连续点击多个日期）会触发多个 `push()` 并发执行：
- push #1 拉取云端 v65 → 合并本地 → 准备写
- push #2 拉取云端 v65 → 合并本地 → 准备写（本地此时已有新数据）
- push #1 写入 v66
- push #2 用旧 SHA 写入 → 冲突 → 重试 → 再拉 → 再写

`_pushInFlight` 标记在多个并发 push 之间共享，导致状态混乱。

**修复**: push 队列化。多次调用 `push()` 只入队，由 `_processPushQueue()` 串行处理。队列中只执行最后一条（因为后保存的数据已包含前面的）。

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| `js/sync.js` | +130 行：pull 后自动 render、availability 逐日合并、push 队列化 |
| `js/app.js` | DATA_VERSION → v51 |
| `index.html` | cache-buster ?v=51 |

## 验证方式

1. 用户A 在手机上填写可上班时间 → 保存
2. 用户B 在电脑上等待 ≤15 秒（自动 pull 间隔）
3. 用户B 的页面应自动刷新显示 A 填写的数据（无需手动切换页面）
