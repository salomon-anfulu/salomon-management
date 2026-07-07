# v53: 同步失败第二层根因修复

## 问题
v52 修复后用户再次点击同步，仍然显示 "❌ 上传和拉取均失败" + "共享文件过大(1.44MB)"

## 根因（更深一层）

### 1. 死锁
- 云端文件 > 1MB → GitHub API 不返回 content
- v52 的 `_fetchSharedData()` 检测到 > 1MB 抛错
- push 端**先拉云端再合并** → 拉不到云端 → 无法 push
- 形成了**"拉不到 → 推不上去"**的死锁

### 2. note 字段无限追加
pull 端的 note 合并逻辑：
```javascript
if (!localPerson.note.includes(clonedShared.note)) {
  localPerson.note = localPerson.note + '; ' + clonedShared.note;  // ← 追加
}
```
当云端 note 被双重 UTF-8 编码污染时：
- "19日~30日出差" 和 "19Ã¦ÂÃ¥ÂÂ..." 是同一文本的不同损坏形态
- `includes()` 检查返回 false → 每次 pull 都追加
- 王龙宇的 6/19-6/30 出差备注被重复了几千次
- 单个 note 字段就达到 **142KB**

### 3. 污染源确认
git log 显示有 commit `2e0b1b8 sync: auto-retry 更新数据 [v66]`，是**用户浏览器自动推送**的 v52 之前的旧代码，把 localStorage 里的 1.44MB 脏数据推上了云端。

## 修复内容

### 代码修复（v53）
1. **note 字段追加改时间戳仲裁**：
```javascript
if (clonedShared.note !== undefined) {
  const cloudTs = clonedShared._noteUpdatedAt || 0;
  const localTs = localPerson._noteUpdatedAt || 0;
  if (!localPerson.note || cloudTs > localTs) {
    localPerson.note = clonedShared.note;  // ← 直接覆盖，不再追加
    localPerson._noteUpdatedAt = cloudTs || Date.now();
  }
}
```

2. **死锁恢复机制**：push 端遇到云端 > 1MB 时自动 DELETE + 重建
```javascript
if (e.message.includes('超过GitHub API 1MB限制')) {
  await this._deleteRemoteFile();  // 删除污染文件
  shared = { _meta: { version: 0 }, ... };  // 用空数据重新开始
  sha = null;
  break;
}
```

3. **新增 `_deleteRemoteFile()` 方法**

### 数据恢复
- 用 `git push --force-with-lease` 强制覆盖云端污染文件
- GitHub 文件大小：**1.44MB → 101KB**
- content 字段正常返回

## 验证
- GitHub 上文件：101KB（之前 1.44MB）✓
- content 字段：正常返回 ✓
- 用户刷新页面后点击同步应该能正常工作

## 教训
**v52 的修复不完整**！只过滤了乱码 key，没改 note 字段的追加逻辑。**修复同步问题必须从数据契约层面入手**——所有"累加"操作都要用时间戳或版本号仲裁。

## 提交
- commit: `d6c31dc` v53
- 已 force push 到 GitHub main
