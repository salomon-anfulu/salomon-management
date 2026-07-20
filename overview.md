# v127 工时数据强制刷新加固

> 版本: v126 → v127
> 日期: 2026-07-22
> 范围: 新增 Service Worker + 版本探针，解决"其他设备可能因缓存拿不到最新工时数据"的隐患

---

## 背景

v126 校准了 13 人的工时（龚赟昊 125.5h→78.3h、王雅澜等），通过 git push 发布到 GitHub Pages。
但有一个隐患：**如果其他设备的浏览器缓存了旧版 `index.html`，会引用旧 `?v=125`，加载旧 `app.js`，拿到过时的工时数据**。

而且工时数据走的是非常规通道：
- `linggongAttendance` / `performanceData` / `workHours` **不进入 submissions.json 云同步流**
- 它们是代码级数据，硬编码在 `js/app.js` 的 `Store.defaults` 里
- 流转：`defaults → _migrateData(版本不匹配时merge) → localStorage`
- 同步方式只有一种：**git push → GitHub Pages 发布新版 app.js**

所以必须保证其他设备一定能拿到最新 `index.html`，才能拿到最新工时。

---

## 方案：三件套

### 1. `version.json`（根目录，单一事实源）

```json
{
  "dataVersion": "2026-07-20-v126",
  "cacheBuster": "126",
  "updatedAt": "2026-07-20"
}
```

每次升级工时数据时同步更新此文件。

### 2. `sw.js`（Service Worker）

| 资源类型 | 缓存策略 | 原因 |
|---------|---------|------|
| HTML 导航请求 | **network-only** | 永远拿最新 index.html，避免引用旧 ?v= |
| version.json | **no-store** | 探针必须拿真实最新值 |
| JS/CSS | **stale-while-revalidate** | 先返回缓存快速渲染，后台拉新版下次生效 |
| 图片/字体 | **cache-first 7天 TTL** | 静态资源减少重复下载 |

### 3. `index.html` 启动探针（app.js 加载前执行）

```
fetch version.json?_=timestamp    // 绕缓存
  ↓
对比 localStorage.__lastSeenDataVersion
  ↓ 一致
  无动作（用户无感）
  ↓ 不一致
  ① 清所有 SW 缓存 (caches.deleteAll)
  ② 记录 __lastSeenDataVersion = latest
  ③ location.reload()    // 加载最新 app.js
  ↓
30 秒循环保护
  距上次刷新 <30s → 跳过 reload，避免死循环
```

---

## 验证结果

### 探针逻辑（4 种场景 node 模拟）

| 场景 | lastSeen | latest | 期望 reload | 期望清缓存 | 实测 |
|------|----------|--------|------------|-----------|------|
| S1 首次访问 | 无 | v126 | ❌ | ✅ | ✅ |
| S2 版本一致 | v126 | v126 | ❌ | ❌ | ✅ |
| S3 版本升级 | v125 | v126 | ✅ | ✅ | ✅ |
| S4 30s 内循环保护 | v125 (10s前刷新过) | v126 | ❌ | ❌ | ✅ |

### 线上 GitHub Pages 验证

```
✅ version.json  → HTTP 200，内容包含 dataVersion: 2026-07-20-v126
✅ sw.js         → HTTP 200
✅ index.html    → 8 处 VersionProbe 标记
✅ index.html    → 1 处 sw.js 引用
```

---

## ⚠️ 今后升级工时数据的工作流（重要！）

每次更新 `app.js` 的 `linggongAttendance` / `performanceData` / `_dataVersion` 时：

1. ✏️ `index.html` 三个 `?v=NNN` 改成新值（已有惯例）
2. ✏️ **`version.json`** 的 `dataVersion` 和 `cacheBuster` 改成新值（**新增**）
3. ✏️ **`index.html` 探针代码块** 的 `sw.js?v=NNN` 改成新值（**新增**）
4. 🚀 `git push origin main` → GitHub Pages 自动部署

漏掉任何一步都会导致其他设备的探针检测不到版本变化。

---

## 文件改动

| 文件 | 操作 | 行数 |
|------|------|------|
| `version.json` | 🆕 新增 | 6 行 |
| `sw.js` | 🆕 新增 | 137 行 |
| `index.html` | ✏️ 修改 | +76 行（注入探针 IIFE） |

**总计**: 3 文件，+230 行（无删除）

---

## git

- **commit**: `fc28011 v127: 工时数据强制刷新加固 - SW+版本探针`
- **push**: 已 push origin/main（rebase 了云端 v288 sync 提交）
