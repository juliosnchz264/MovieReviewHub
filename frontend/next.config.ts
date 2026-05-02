import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo standalone cuando building para Docker. Vercel usa default (serverless).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
