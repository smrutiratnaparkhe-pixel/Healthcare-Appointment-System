import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Expose the backend URL to the browser bundle at build time.
  // Render injects NEXT_PUBLIC_API_URL as a build-time env var.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  },
  // Strip the X-Powered-By header in production
  poweredByHeader: false,
};

export default nextConfig;
