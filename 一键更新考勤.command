#!/bin/bash
# ============================================
# Salomon 安福路 - 灵工考勤一键更新（fetch + sync + git push）
# 双击运行，自动完成：抓取数据 → 合并到 app.js → 部署上线
# ============================================

cd "/Users/a86137/Desktop/兼职/安福路兼职管理系统"

echo ""
echo "============================================"
echo "  Salomon 安福路 - 灵工考勤一键更新"
echo "  自动完成：抓取 → 合并 → 部署"
echo "============================================"
echo ""

# 读取手机号（用户输入）
read -p "请输入灵工管家手机号: " PHONE
if [ -z "$PHONE" ]; then
    echo "❌ 手机号不能为空"
    read -p "按回车键关闭..."
    exit 1
fi

# 读取密码（隐藏输入）
read -s -p "请输入灵工管家密码: " PASSWORD
echo ""
if [ -z "$PASSWORD" ]; then
    echo "❌ 密码不能为空"
    read -p "按回车键关闭..."
    exit 1
fi

echo ""
echo ">>> [1/4] 正在启动浏览器抓取考勤数据..."
echo ">>> 浏览器弹出后，请输入手机验证码并点登录"
echo ""

# Step 1: Fetch 数据
NODE_PATH=/Users/a86137/.workbuddy/binaries/node/workspace/node_modules \
    /Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node \
    scripts/fetch_linggong.js \
    --phone="$PHONE" \
    --password="$PASSWORD" \
    --range=month

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 抓取失败，请检查上方错误信息"
    read -p "按回车键关闭..."
    exit 1
fi

echo ""
echo ">>> [2/4] 合并数据到 app.js..."

# Step 2: 合并到 app.js
/Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node \
    scripts/sync_linggong_to_app.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 合并失败"
    read -p "按回车键关闭..."
    exit 1
fi

echo ""
echo ">>> [3/4] 验证语法..."

# Step 3: 验证语法
/Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node -c js/app.js
if [ $? -ne 0 ]; then
    echo "❌ 语法错误，自动修复双逗号..."
    # 自动修复常见的双逗号问题
    sed -i '' 's/,,/,/g' js/app.js
    /Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node -c js/app.js
    if [ $? -ne 0 ]; then
        echo "❌ 语法仍然有误，请联系 AI 协助"
        read -p "按回车键关闭..."
        exit 1
    fi
fi

echo "✅ 语法正确"

echo ""
echo ">>> [4/4] 提交并部署到 GitHub Pages..."

# Step 4: Git commit & push
git add -A

# 获取当前日期
TODAY=$(date +%Y-%m-%d)

# 获取新数据条数
OLD_COUNT=$(git show HEAD:js/app.js 2>/dev/null | grep -c '"id":' || echo "?")
NEW_COUNT=$(grep -c '"id":' js/app.js || echo "?")

git commit -m "data: 灵工考勤自动更新至 $TODAY ($OLD_COUNT→$NEW_COUNT条)

自动生成 by 一键更新考勤.command"

# 尝试 push，如果远程有更新则 rebase
git pull --rebase origin main 2>/dev/null
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  ✅ 全部完成！"
    echo "  数据已更新至 $TODAY"
    echo "  GitHub Pages 将在 1-2 分钟内生效"
    echo "============================================"
    echo ""
    echo "  线上地址:"
    echo "  https://salomon-anfulu.github.io/salomon-management/"
else
    echo ""
    echo "⚠️ 推送失败，可能是网络问题"
    echo "  数据已保存到本地，稍后手动 git push 即可"
fi

echo ""
read -p "按回车键关闭窗口..."
