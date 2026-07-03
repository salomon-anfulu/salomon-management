# 云同步系统全面复查报告 v44

## 检查时间
2026-07-03 18:27

## 发现并修复的问题

### 🔴 P0 严重: data/submissions.json git合并冲突
- **问题**: 文件包含5组未解决的git合并冲突标记（`<<<<<<< HEAD` / `=======` / `>>>>>>>`），且已被commit到本地和远端
- **影响**: 每次Sync.push/pull读写此文件都会失败，JSON.parse会抛异常
- **根因**: 某次merge操作中冲突未被解决就直接commit了
- **HEAD侧**: 包含大量UTF-8乱码残留（如 `çé¾å®` 应为王龙宇）
- **修复**: Python脚本逐行解析，保留incoming(清理后)侧数据，过滤所有mojibake
- **修复后**: 0冲突标记, 0乱码, 有效JSON

## 各项检查结果

### ✅ sync.js 编解码对称性
| 操作 | 代码 | 状态 |
|------|------|------|
| Push编码 | `btoa(unescape(encodeURIComponent(JSON.stringify(shared))))` | ✅ |
| Pull解码 | `decodeURIComponent(escape(atob(content)))` | ✅ |
| ForcePush编码 | 同Push | ✅ |

### ✅ pages.js 同步调用点 (7处)
- `Sync.push()` × 6 (availability保存×2, shiftChanges, storeSupport, doorSchedule, staff编辑)
- `Sync.pull()` × 1 (renderMyForms入口)

### ✅ 版本号一致性
| 位置 | 值 |
|------|-----|
| `_dataVersion` (defaults) | `2026-07-03-v44` |
| `DATA_VERSION` (init) | `2026-07-03-v44` |
| HTML `?v=` (index/app) | `v=44` |

### ✅ CI/CD 配置
- `deploy.yml`: 有 `cancel-in-progress: true` ✅
- `deploy.yml`: 有 `environment: github-pages` ✅
- `.gitignore`: `data/` 排除但 `!data/submissions.json` 放行 ✅

### ✅ submissions.json 数据完整性 (修复后)
| 数据集 | 记录数 |
|--------|--------|
| availability 2026-06 | 15人 |
| availability 2026-07 | 14人 |
| shiftChanges | 9条 |
| staff | 20人 |
| storeSupport | 0条 (原数据全乱码，已清空) |
| doorSchedule | 0天 (原数据全乱码，已清空) |

### ⚠️ 注意事项
- storeSupport和doorSchedule在云端为空，但这些数据在本地localStorage中存在(app.js defaults)
- 用户下次打开系统后，Sync.push会自动将本地完整数据上传到云端
- 也可以手动使用「高级同步工具 → 强制推送」立即上传

## Git提交
- Commit: `1d77d8d` - fix(v44): 修复submissions.json git合并冲突 + 清理所有UTF-8乱码
- 已推送到 origin/main
