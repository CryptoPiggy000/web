import type { NextConfig } from "next";

// Static export → Cloudflare Pages (the app is fully client-side; the backend worker holds all secrets).
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
