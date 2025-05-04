import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 添加这行以忽略 ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 允许在存在 TypeScript 错误的情况下进行生产构建
    ignoreBuildErrors: true,
  },

  /* 你可以继续添加其它配置项 */
};

export default nextConfig;