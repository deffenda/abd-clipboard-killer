import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fmweb/shared", "@fmweb/ui"]
};

export default nextConfig;
