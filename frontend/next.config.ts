import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
  distDir: process.env.KAY_UI_CHECKS === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
