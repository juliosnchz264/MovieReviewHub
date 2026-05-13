import type { NextConfig } from "next";

const isStandalone = process.env.NEXT_OUTPUT === "standalone";

// Backend origin para proxy rewrites. En prod (Vercel) apunta al backend de
// Render; en local podemos dejarlo vacio y el codigo del cliente sigue usando
// NEXT_PUBLIC_API_URL absoluto.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "";

const nextConfig: NextConfig = {
  // output solo se incluye cuando build para Docker. Sin la propiedad,
  // Vercel usa su modo serverless por defecto.
  ...(isStandalone && { output: "standalone" as const }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async rewrites() {
    if (!BACKEND_ORIGIN) return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND_ORIGIN}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${BACKEND_ORIGIN}/login/oauth2/:path*` },
    ];
  },
};

export default nextConfig;
