# 🚀 部署指南

本文档介绍如何将高精度贷款计算器部署到不同的平台。

## 📦 静态导出部署（推荐）

### 1. 构建静态文件

```bash
# 构建项目
npm run build:static

# 静态文件将生成在 out/ 目录中
```

### 2. 部署到静态文件服务器

构建完成后，`out/` 目录包含所有静态文件，可以部署到：

#### **GitHub Pages**
```bash
# 1. 将 out/ 目录内容推送到 gh-pages 分支
# 2. 在 GitHub 仓库设置中启用 GitHub Pages
```

#### **Netlify**
1. 拖拽 `out/` 目录到 [Netlify Drop](https://app.netlify.com/drop)
2. 或连接 GitHub 仓库，设置构建命令：`npm run build:static`

#### **Vercel**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### **Nginx 服务器**
```bash
# 将 out/ 目录内容复制到 Nginx 网站根目录
cp -r out/* /var/www/html/

# Nginx 配置示例
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

#### **Apache 服务器**
```bash
# 将 out/ 目录内容复制到 Apache 网站根目录
cp -r out/* /var/www/html/

# .htaccess 配置（可选）
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /$1.html [L]
```

## 🌐 在线部署平台

### 1. **Vercel（推荐 - 零配置）**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/calc)

```bash
# CLI 部署
npm i -g vercel
vercel
```

**优势**：
- 零配置，自动检测 Next.js
- 全球 CDN 加速
- 自动 HTTPS
- Git 集成，推送即部署

### 2. **Netlify**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/calc)

**构建设置**：
- Build command: `npm run build:static`
- Publish directory: `out`

### 3. **GitHub Pages**

1. 在 `.github/workflows/deploy.yml` 创建 GitHub Action：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build:static
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

## 🐳 Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build:static

# Production image, copy all the files and run next
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy the static files
COPY --from=builder /app/out .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. 创建 nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### 3. 构建和运行

```bash
# 构建镜像
docker build -t loan-calculator .

# 运行容器
docker run -p 3000:80 loan-calculator
```

## 📱 移动端优化

项目已包含响应式设计，但为了更好的移动体验：

### PWA 支持（可选）

```bash
# 安装 PWA 支持
npm install next-pwa

# 在 next.config.js 中配置
const withPWA = require('next-pwa')({
  dest: 'public'
})

module.exports = withPWA({
  // 现有配置...
})
```

## 🔧 环境变量配置

如果需要配置不同环境的参数，创建 `.env.local`：

```env
# .env.local
NEXT_PUBLIC_APP_NAME=高精度贷款计算器
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 📊 性能监控

### 1. **Web Vitals**
项目已内置性能监控，可以在浏览器开发者工具中查看。

### 2. **Google Analytics（可选）**

```bash
# 安装 GA
npm install @next/third-parties

# 在 _app.tsx 中配置
import { GoogleAnalytics } from '@next/third-parties/google'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <GoogleAnalytics gaId="GA_MEASUREMENT_ID" />
    </>
  )
}
```

## 🛠 故障排除

### 常见问题

1. **Web Worker 在生产环境不工作**
   - 确保服务器支持 MIME type `application/javascript`

2. **静态资源路径问题**
   - 检查 `next.config.js` 中的 `basePath` 和 `assetPrefix` 配置

3. **移动端样式问题**
   - 确保 viewport meta 标签正确设置

### 调试命令

```bash
# 本地预览构建结果
npm run build:static
npx serve out

# 分析包大小
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

---

选择最适合您需求的部署方式，推荐新手使用 **Vercel** 或 **Netlify**，它们提供最简单的部署体验！ 