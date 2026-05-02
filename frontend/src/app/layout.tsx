import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  title: {
    default: "MovieReviewHub",
    template: "%s · MovieReviewHub",
  },
  description: "Movie catalog with reviews, favorites, and ratings.",
  keywords: ["movies", "reviews", "ratings", "catalog", "favorites"],
  authors: [{ name: "MovieReviewHub" }],
  openGraph: {
    title: "MovieReviewHub",
    description: "Movie catalog with reviews, favorites, and ratings.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MovieReviewHub",
    description: "Movie catalog with reviews, favorites, and ratings.",
  },
  robots: {
    index: true,
    follow: true,
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
