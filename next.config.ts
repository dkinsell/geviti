import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@tensorflow/tfjs-node"],

  experimental: {
    // Empty for now
  },
};

export default nextConfig;
