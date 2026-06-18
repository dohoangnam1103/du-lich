import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Place thumbnails come from Wikipedia/Wikimedia Commons and (optionally)
    // user media on object storage. Allow https remote images so next/image can
    // optimize them. Same-origin uploads (/uploads/...) need no pattern.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
