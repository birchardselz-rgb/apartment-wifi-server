/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  // 本地运行时 basePath 设为空
  // GitHub Pages 部署时改为 '/apartment-wifi'
  basePath: '',
  assetPrefix: '',
  images: { unoptimized: true },
  turbopack: {
    root: path.resolve(__dirname),
  },
};
module.exports = nextConfig;
