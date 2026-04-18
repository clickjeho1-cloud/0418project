import type { NextConfig } from "next";

// 의도: 사용자 홈(C:\Users\ds20)에 있는 lockfile 영향으로 루트가 잘못 추론되는 경고를 제거한다.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
