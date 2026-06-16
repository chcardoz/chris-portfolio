import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@florence/brain-core"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
