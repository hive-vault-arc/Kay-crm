import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/kay-push.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
  },
  devIndicators: false,
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
  distDir: process.env.KAY_UI_CHECKS === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
