# v52: 同步失败根因修复

## 问题
用户点击同步按钮显示"❌ 上传和拉取均失败"

## 根因（第一性原理排查）
**不是代码逻辑问题，是数据膨胀问题！**

`data/submissions.json` 文件膨胀到 **1.43MB**，超过了 **GitHub Contents API 的 1MB 硬限制**。GitHub 对 >1MB 的文件返回 HTTP 200 但 **content 字段为空**，导致 `_fetchSharedData()` 收到空内容 → 返回 null → push 和 pull 全部失败。

这种失败模式极其隐蔽：HTTP 状态码是 200（成功），但实际数据为空。

## 膨胀原因
availability.data 中累积了 **12 个乱码人名条目**（UTF-8 编码错误的历史遗留）：

| 乱码 key | 实际人名 | 占用空间 |
|---------|---------|---------|
| `çé¾å®` | 王龙宇 | 111KB |
| `Ã§ÂÂÃ©Â¾ÂÂÃ¥ÂÂ` | 王龙宇 | 208KB |
| `ÃÃÂ§ÃÂÂÃÂÃÂ©ÃÂÂ¾ÃÂÂÃÂ¥ÃÂÂ` | 王龙宇 | **389KB** |
| `ç°ä½³ä¹` | 田佳乐 | 0.1KB |
| `æ¨å­è±ª` | 杨子豪 | 1.1KB |
| ... 共 12 个 | | **总计 727KB** |

乱码来自多次 push/pull 循环中 UTF-8 编码错误的累积，每个乱码 key 都是同一个人名的不同损坏程度版本。

## 修复内容

### 1. 数据清理
删除 12 个乱码条目：**1.43MB → 46KB（瘦身 97%）**

### 2. 乱码守卫（防止复发）
新增 `Sync._isValidName()` 函数：
```javascript
_isValidName(name) {
  if (/[\u00c0-\u00ff]{2,}/.test(name)) return false; // Latin-1 补充区连续字符
  if (/[\u0000-\u001f]{3,}/.test(name)) return false; // 控制字符
  return true;
}
```

### 3. push/pull 两端过滤
- `_mergeIntoLocal` (pull端): 跳过乱码人名 key
- `_mergeLocalIntoShared` (push端): 跳过乱码人名 key

### 4. >1MB 明确报错
`_fetchSharedData` 检测到文件 >1MB 时抛出明确错误信息

## 验证
GitHub 上文件已从 1.43MB → 101KB，content 字段恢复正常返回 ✓

## 提交
- commit: `bccb321` v52
- 已 push 到 GitHub main
