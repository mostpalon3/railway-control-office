import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        destination: "https://13.63.0.60.nip.io/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;