import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Arabic,
} from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteFrame } from "@/components/layout/site-frame";
import { siteUrl } from "@/lib/site-metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq-urdu",
  subsets: ["arabic"],
  display: "swap",
  preload: false,
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "EarthGuard Pakistan",
    template: "%s | EarthGuard Pakistan",
  },
  description:
    "Explore environmental patterns and change across Pakistan with EarthGuard Pakistan.",
  applicationName: "EarthGuard Pakistan",
  icons: {
    icon: "/brand/earthguard-mark.svg",
  },
  openGraph: {
    type: "website",
    siteName: "EarthGuard Pakistan",
    title: "EarthGuard Pakistan",
    description:
      "Explore environmental patterns and change across Pakistan with clear, understandable stories.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "EarthGuard Pakistan — explore environmental change",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EarthGuard Pakistan",
    description:
      "Explore environmental patterns and change across Pakistan with clear, understandable stories.",
    images: ["/opengraph-image"],
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
      dir="ltr"
      data-theme="dark"
      className={`${inter.variable} ${jetBrainsMono.variable} ${notoNastaliqUrdu.variable} ${notoSansArabic.variable}`}
    >
      <body>
        <AppProviders>
          <SiteFrame>{children}</SiteFrame>
        </AppProviders>
      </body>
    </html>
  );
}
