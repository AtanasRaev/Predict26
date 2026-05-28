import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Predict26 - World Cup 2026 Predictions",
  description: "Predict World Cup 2026 match scores and compete with friends",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Predict26",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased dark`}>
      <head>
        {/* Android Chrome theme color */}
        <meta name="theme-color" content="#0c0e16" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Registers /sw.js once; required for push on all platforms */}
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
