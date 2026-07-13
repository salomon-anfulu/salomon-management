#!/bin/bash
# ============================================
# GitHub Secrets 配置脚本
# 将本地 data/auth_state.json 同步到 GitHub Secret LINGGONG_AUTH_STATE
#
# 注意：Secret 内容用 base64 编码，避免 JSON 里的引号/换行被 shell 解释
# CI 端会解码后使用
# ============================================

cd "$(dirname "$0")/.."

echo ""
echo "============================================"
echo "  GitHub Secrets 配置"
echo "============================================"
echo ""

if [ ! -f data/auth_state.json ]; then
    echo "❌ 找不到 data/auth_state.json"
    echo "   请先运行「一键更新考勤.command」登录灵工管家"
    exit 1
fi

# 生成 base64 编码
B64=$(cat data/auth_state.json | base64 | tr -d '\n')
echo "📋 base64 编码长度: ${#B64} 字符"

# 方法 1: 尝试 gh CLI
if command -v gh &> /dev/null; then
    echo "📡 检测到 gh CLI，正在同步..."
    echo "$B64" | gh secret set LINGGONG_AUTH_STATE --repo salomon-anfulu/salomon-management
    if [ $? -eq 0 ]; then
        echo "✅ Secret LINGGONG_AUTH_STATE 已更新（base64 编码）"
        echo ""
        echo "   CI 将自动使用此 cookie 抓取考勤数据。"
        echo "   Cookie 有效期约 30 天，到期前重新运行此脚本即可。"
    else
        echo "❌ gh CLI 同步失败，请检查 gh 是否已登录 (gh auth login)"
    fi
    exit 0
fi

# 方法 2: 输出 base64 编码，引导手动设置
echo "⚠️ 未检测到 gh CLI"
echo ""
echo "请按以下步骤手动配置 GitHub Secret："
echo ""
echo "  1. 打开浏览器访问："
echo "     https://github.com/salomon-anfulu/salomon-management/settings/secrets/actions"
echo ""
echo "  2. 点击「New repository secret」"
echo ""
echo "  3. Name 填写："
echo "     LINGGONG_AUTH_STATE"
echo ""
echo "  4. Value 填写 base64 编码后的内容："
echo ""
echo "----- 复制下面的内容（不包含本行） -----"
echo "$B64"
echo "----- 复制结束 -----"
echo ""
echo "  5. 点击「Add secret」保存"
echo ""
echo "  6. 配置完成后，CI 将每天 22:00 自动抓取考勤数据"
echo ""
echo "============================================"

# 尝试在 macOS 上自动打开 GitHub Settings + 把 base64 复制到剪贴板
if [ "$(uname)" = "Darwin" ]; then
    echo ">>> 是否自动打开 GitHub Settings 并复制到剪贴板？(y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        open "https://github.com/salomon-anfulu/salomon-management/settings/secrets/actions"
        echo -n "$B64" | pbcopy
        echo "✅ base64 已复制到剪贴板，浏览器已打开 GitHub Settings"
        echo "   直接在 Value 框 Cmd+V 粘贴即可"
    fi
fi
