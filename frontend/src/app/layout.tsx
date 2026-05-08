import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MovieReviewHub",
    template: "%s · MovieReviewHub",
  },
  description: "Movie catalog with reviews, favorites, and ratings.",
  keywords: ["movies", "reviews", "ratings", "catalog", "favorites"],
  authors: [{ name: "MovieReviewHub" }],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "MovieReviewHub",
    description: "Movie catalog with reviews, favorites, and ratings.",
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "MovieReviewHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "MovieReviewHub",
    description: "Movie catalog with reviews, favorites, and ratings.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
