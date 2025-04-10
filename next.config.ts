import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only include tfjs-node as external in development
  serverExternalPackages: process.env.VERCEL ? [] : ["@tensorflow/tfjs-node"],
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["*"],
    },
  },
  webpack: (config, { isServer }) => {
    // For browser builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // For Vercel deployment, use tfjs instead of tfjs-node
    if (isServer && process.env.VERCEL) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@tensorflow/tfjs-node": "@tensorflow/tfjs",
      };
    }

    return config;
  },
};

export default nextConfig;
