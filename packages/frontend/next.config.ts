import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // In Docker, use the backend service running on the same container
    const backendUrl = process.env.DOCKER_ENV 
      ? "http://localhost:9000" 
      : "http://localhost:4444";
      
    return [
      {
        source: "/compile",
        destination: `${backendUrl}/compile`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
