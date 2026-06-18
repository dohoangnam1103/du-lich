import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output only for container builds (the Dockerfile sets this).
  // The mini PC deployment runs `next start`, which must not use standalone.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  images: {
    // Place thumbnails come from Wikipedia/Wikimedia Commons and (optionally)
    // user media on object storage. Allow https remote images so next/image can
    // optimize them. Same-origin uploads (/uploads/...) need no pattern.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
