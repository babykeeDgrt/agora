import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import { MarketplaceRuntime } from "@/components/marketplace-runtime";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agora",
  description:
    "Agora is the data layer for autonomous AI agents on Somnia.",
  icons: {
    icon: "/agora_logo.jpg",
    shortcut: "/agora_logo.jpg",
    apple: "/agora_logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-foreground">
        <Providers>
          <MarketplaceRuntime />
          <div className="min-h-screen bg-background">
            <Nav />
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1440px] flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
