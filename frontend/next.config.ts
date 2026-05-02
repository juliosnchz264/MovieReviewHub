import type { NextConfig } from "next";

const isStandalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  // output solo se incluye cuando build para Docker. Sin la propiedad,
  // Vercel usa su modo serverless por defecto.
  ...(isStandalone && { output: "standalone" as const }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
