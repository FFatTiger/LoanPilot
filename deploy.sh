#!/bin/bash

# 高精度贷款计算器 - 一键部署脚本
echo "🚀 开始构建和部署高精度贷款计算器..."

# 1. 安装依赖
echo "📦 安装依赖..."
npm install

# 2. 构建静态文件
echo "🔨 构建静态文件..."
npm run build:static

# 3. 检查构建结果
if [ -d "out" ]; then
    echo "✅ 构建成功！静态文件已生成在 out/ 目录"
    echo "📊 构建统计："
    echo "   - 文件总数: $(find out -type f | wc -l)"
    echo "   - 目录大小: $(du -sh out | cut -f1)"
    echo ""
    echo "🌐 部署选项："
    echo "1. 手动部署: 将 out/ 目录内容上传到您的服务器"
    echo "2. Netlify: 拖拽 out/ 目录到 https://app.netlify.com/drop"
    echo "3. Vercel: 运行 'npx vercel --prod'"
    echo "4. 本地预览: 运行 'npx serve out'"
    echo ""
    echo "📁 静态文件位置: $(pwd)/out/"
else
    echo "❌ 构建失败！请检查错误信息"
    exit 1
fi

# 4. 可选：启动本地预览
read -p "🔍 是否启动本地预览？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 启动本地预览服务器 http://localhost:3000..."
    npx serve out -p 3000
fi 