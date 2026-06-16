import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@cbrain/core"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
