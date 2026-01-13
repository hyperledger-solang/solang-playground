import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // Backend runs in the same container (expose 4444 internally)
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:4444";

    // Analytics is a separate service in Compose; default to service DNS
    const analyticsUrl = process.env.ANALYTICS_INTERNAL_URL || "http://analytics:4000";

    return [
      {
        source: "/compile",
        destination: `${backendUrl}/compile`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/api/analytics/:path*",
        destination: `${analyticsUrl}/analytics/:path*`,
      }
    ];
  },
};

export default nextConfig;
