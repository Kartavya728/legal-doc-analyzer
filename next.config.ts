import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 👇 Use a custom loader so ANY URL is allowed
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
  },
};

export default nextConfig;
