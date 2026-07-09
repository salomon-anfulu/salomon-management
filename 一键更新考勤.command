#!/bin/bash
# ============================================
# Salomon 安福路 - 灵工考勤一键抓取脚本
# 双击此文件即可运行
# ============================================

cd "/Users/a86137/Desktop/兼职/安福路兼职管理系统"

echo ""
echo "============================================"
echo "  Salomon 安福路 - 灵工考勤抓取工具"
echo "============================================"
echo ""

# 读取手机号（用户输入）
read -p "请输入灵工管家手机号: " PHONE
if [ -z "$PHONE" ]; then
    echo "❌ 手机号不能为空，程序退出"
    read -p "按回车键关闭窗口..."
    exit 1
fi

# 读取密码（隐藏输入）
read -s -p "请输入灵工管家密码: " PASSWORD
echo ""
if [ -z "$PASSWORD" ]; then
    echo "❌ 密码不能为空，程序退出"
    read -p "按回车键关闭窗口..."
    exit 1
fi

echo ""
echo ">>> 正在启动浏览器，请等待..."
echo ">>> 浏览器弹出后，请输入手机验证码并点登录"
echo ">>> 全程不要关闭浏览器窗口"
echo ""

NODE_PATH=/Users/a86137/.workbuddy/binaries/node/workspace/node_modules \
    /Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node \
    scripts/fetch_linggong.js \
    --phone="$PHONE" \
    --password="$PASSWORD" \
    --range=month

echo ""
echo "============================================"
if [ $? -eq 0 ]; then
    echo "  ✅ 脚本执行完成！请检查上方输出"
    echo "  如果看到『✅ 完成！』就说明数据已保存"
    echo ""
    echo "  接下来回到对话告诉 AI「跑完了」"
    echo "  AI 会自动合并数据并部署上线"
else
    echo "  ❌ 脚本执行出错，请截图上方红色错误信息"
fi
echo "============================================"
echo ""
read -p "按回车键关闭窗口..."
