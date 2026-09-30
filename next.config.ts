import type { NextConfig } from "next";

// 纯静态导出：零服务端函数，out/ 目录可直接部署到任意静态托管（Vercel 推荐）
// trailingSlash: 导出为 <path>/index.html 目录结构，任何静态服务器（含 GitHub Pages）零配置可跑
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
