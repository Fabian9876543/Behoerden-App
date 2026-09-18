import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Behoerdenbriefe koennen als Scan mehrere MB gross sein.
      bodySizeLimit: "12mb",
    },
  },
  // Dokumentinhalte duerfen nicht in Client-Bundles oder Caches landen.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
  ],
};

export default nextConfig;
