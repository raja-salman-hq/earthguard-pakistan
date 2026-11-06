import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteFrame } from "@/components/layout/site-frame";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EarthGuard Pakistan",
    template: "%s | EarthGuard Pakistan",
  },
  description:
    "Explore environmental patterns and change across Pakistan with EarthGuard Pakistan.",
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
      className={`${inter.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <AppProviders>
          <SiteFrame>{children}</SiteFrame>
        </AppProviders>
      </body>
    </html>
  );
}
