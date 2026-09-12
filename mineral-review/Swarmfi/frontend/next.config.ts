import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Polyfill Buffer for @coral-xyz/anchor and other Solana libraries
    // that rely on Node.js Buffer in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve("buffer/"),
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false,
    };

    return config;
  },
};

export default nextConfig;
