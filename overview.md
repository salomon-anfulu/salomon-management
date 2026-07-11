# P1-4: 灵工考勤 CI 自动同步

## 改动清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `scripts/linggong_ci.js` | **新增** | 纯 API 直连模式，无需 Playwright/浏览器，6秒拉完全月数据 |
| `.github/workflows/lingong-auto.yml` | **新增** | GitHub Actions 定时任务，每天 22:00 自动运行 |
| `scripts/setup_secrets.sh` | **新增** | GitHub Secret 配置助手，引导设置 `LINGGONG_AUTH_STATE` |
| `一键更新考勤.command` | **更新** | 新增 Step 4/5：刷新 cookie 后自动同步到 Secret |

## 架构

```
本地（首次/cookie过期时）            GitHub Actions CI（每天22:00）
┌──────────────────────┐           ┌──────────────────────────────┐
│ 一键更新考勤.command  │           │ lingong-auto.yml             │
│ 1. 浏览器登录(验证码) │           │ 1. 从 Secret 恢复 auth_state │
│ 2. 保存 auth_state    │───────►  │ 2. linggong_ci.js API直连    │
│ 3. 同步到 Secret      │  push     │ 3. sync_linggong_to_app.js   │
│ 4. git push           │           │ 4. git commit + push         │
└──────────────────────┘           │ 5. 失败 → 仅邮件通知，不推送  │
                                   └──────────────────────────────┘
```

## 关键设计决策

1. **纯 API 直连代替 Playwright** — 发现 archive 里有 `sync_linggong_api.js` 旧脚本，直接用 `https.request` 调灵工 API，不需要 Chromium，CI 环境零依赖、6秒完成
2. **JWT 30天有效期** — 实测 token issued 7/11 → expires 8/10，只要 CI 每天跑一次（理论上滑动续期），cookie 就不会过期
3. **Secret 存储** — `LINGGONG_AUTH_STATE` 存完整 auth_state.json 内容，CI 用 `echo "$SECRET" > data/auth_state.json` 恢复
4. **失败不推送** — token 过期时 `exit(10)`，workflow 后续步骤全部 skip，GitHub 自动发邮件通知仓库 owner

## 配置步骤（用户需做）

1. **运行 `scripts/setup_secrets.sh`** — 或手动到 GitHub Settings → Secrets 添加 `LINGGONG_AUTH_STATE`，值 = `data/auth_state.json` 内容
2. **手动触发测试** — GitHub Actions 页面 → "灵工考勤自动同步" → Run workflow
3. 确认通过后，每天 22:00 自动运行

## Token 续期预期

| 场景 | 效果 |
|------|------|
| 服务端有滑动续期 | CI 永久自动，无需人工 |
| 服务端硬30天过期 | 每30天跑一次本地脚本刷新 |
| 服务端主动踢（极少） | 邮件通知后跑本地脚本 |
