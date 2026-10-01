import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope } from "next/font/google";
import { shareImage } from "@/src/lib/seo";
import { siteConfig } from "@/src/lib/site-config";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Aviator's Regiment | Build your flight path",
    template: "%s | Aviator's Regiment",
  },
  description:
    "Aviation services, flight training guidance and reliable CX-3 rental support for India's next generation of pilots.",
  openGraph: {
    title: "Aviator's Regiment",
    description: "Your flight path starts here.",
    siteName: siteConfig.name,
    locale: "en_IN",
    type: "website",
    images: [shareImage],
  },
};

// Brand navy for the mobile browser toolbar.
export const viewport: Viewport = { themeColor: "#0a1b3d" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
