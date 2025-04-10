import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@tensorflow/tfjs-node"],
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb", // Adjust size limit as needed
      allowedOrigins: ["*"], // Configure allowed origins
    },
  },
};

export default nextConfig;
