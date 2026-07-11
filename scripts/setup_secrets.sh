#!/bin/bash
# ============================================
# GitHub Secrets 配置脚本
# 将本地 data/auth_state.json 同步到 GitHub Secret LINGGONG_AUTH_STATE
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

# 方法 1: 尝试 gh CLI
if command -v gh &> /dev/null; then
    echo "📡 检测到 gh CLI，正在同步..."
    cat data/auth_state.json | gh secret set LINGGONG_AUTH_STATE --repo salomon-anfulu/salomon-management
    if [ $? -eq 0 ]; then
        echo "✅ Secret LINGGONG_AUTH_STATE 已更新！"
        echo ""
        echo "   CI 将自动使用此 cookie 抓取考勤数据。"
        echo "   Cookie 有效期约 30 天，到期前重新运行此脚本即可。"
    else
        echo "❌ gh CLI 同步失败，请检查 gh 是否已登录 (gh auth login)"
    fi
    exit 0
fi

# 方法 2: 输出内容，引导手动设置
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
echo "  4. Value 填写 data/auth_state.json 的完整内容"
echo "     （文件路径：$(pwd)/data/auth_state.json）"
echo ""
echo "  5. 点击「Add secret」保存"
echo ""
echo "  6. 配置完成后，CI 将每天 22:00 自动抓取考勤数据"
echo ""
echo "============================================"

# 尝试在 macOS 上自动打开文件和浏览器
if [ "$(uname)" = "Darwin" ]; then
    echo ">>> 是否自动打开 GitHub Settings 和 auth_state.json？(y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        open "https://github.com/salomon-anfulu/salomon-management/settings/secrets/actions"
        open -a "TextEdit" data/auth_state.json
    fi
fi
