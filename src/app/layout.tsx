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

export const metadata: Metadata = {
  title: "CryptoPiggy",
  description: "A piggy bank for crypto. Drop money in, watch it grow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
