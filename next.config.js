/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  trailingSlash: true,
  basePath: '',
  assetPrefix: '',
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};
module.exports = nextConfig;
