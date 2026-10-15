import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { ClientInitializer } from "@/components/ClientInitializer";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Kahin | Ben Demiştim! — Gündem ve Spor Tahmin Borsası",
  description:
    "Türkiye gündemi, derbiler, ekonomi ve magazin olaylarında sanal puanlarla canlı oranlı Evet/Hayır hissesi al-sat, 'Ben Demiştim!' kanıt kartını kap.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kahin",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
  openGraph: {
    title: "Kahin | Gündem ve Spor Tahmin Borsası",
    description: "Sanal puanlarla canlı oranlı Evet/Hayır hissesi al-sat, 'Ben Demiştim!' kanıt kartını kap.",
    type: "website",
    locale: "tr_TR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        <ClientInitializer />
        <Navbar />
        <main className="flex-1 pb-20 md:pb-8">{children}</main>
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </body>
    </html>
  );
}
