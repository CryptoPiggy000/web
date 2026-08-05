import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-mono-app",
  subsets: ["latin"],
});

// Canonical site URL — baked at build (static export). Override via NEXT_PUBLIC_SITE_URL if the app is
// hosted anywhere other than https://piggy.onl (e.g. the pages.dev preview) while the domain is pending.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://piggy.onl";

const TITLE = "Piggy — a crypto piggy bank for your idle money";
const DESCRIPTION =
  "A non-custodial crypto piggy bank. Drop in USDC, pick how bold you feel, and your money quietly earns yield — always signed from your own wallet, never a seed phrase.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Piggy",
  keywords: ["piggy bank", "crypto", "savings", "yield", "USDC", "DeFi", "non-custodial"],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Piggy",
    title: TITLE,
    description: "Your idle money, quietly at work. Non-custodial: your funds never leave your wallet.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Piggy — a crypto piggy bank" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Piggy — a crypto piggy bank",
    description: "Your idle money, quietly at work. Non-custodial, gasless, beginner-friendly.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <head>
        {/* AI/SEO discovery: llms.txt (LLM-friendly site summary) + sitemap for search crawlers. */}
        <link rel="llms.txt" href="/llms.txt" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
