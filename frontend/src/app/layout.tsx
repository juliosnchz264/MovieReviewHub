import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
