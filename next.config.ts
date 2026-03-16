import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'd6mdqn0qagw6t.cloudfront.net' },
    ],
  },
};

export default nextConfig;
