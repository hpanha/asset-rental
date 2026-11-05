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
    icon: "/app-logo.png",
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
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 selection:bg-purple-500/30 selection:text-purple-200`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
