import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    return [
      // Keep NextAuth routes inside Next.js
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
      // Keep OCR routes inside Next.js
      {
        source: "/api/ocr/:path*",
        destination: "/api/ocr/:path*",
      },
      // Keep Contract PDF routes inside Next.js
      {
        source: "/api/contracts/:id/pdf",
        destination: "/api/contracts/:id/pdf",
      },
      // Proxy all other API calls to NestJS backend on port 4000
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
