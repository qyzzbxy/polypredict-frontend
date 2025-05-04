import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 添加这行以忽略 ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* 你可以继续添加其它配置项 */
};

export default nextConfig;