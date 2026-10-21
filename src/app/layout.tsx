import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asset Rental",
  description: "The marketplace for rental assets: properties, vehicles, electronics, tools, spaces and more. Book by the day from trusted local owners.",
  keywords: ["rental", "marketplace", "properties", "vehicles", "gear", "Asset Rental"],
  authors: [{ name: "Asset Rental" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Asset Rental",
    description: "Rent properties, vehicles, gear and more by the day.",
    siteName: "Asset Rental",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset Rental",
    description: "Rent anything, own nothing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
