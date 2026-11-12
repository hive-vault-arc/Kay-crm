import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/partage",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "private, no-store" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }, {
      source: "/heic/decoder-worker.js",
      headers: [
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'self'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }, {
      source: "/webp/encoder-worker.js",
      headers: [
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }, {
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
