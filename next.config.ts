import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

export default nextConfig;
