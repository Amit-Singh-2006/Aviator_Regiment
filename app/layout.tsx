import type { Metadata } from "next";
import { SiteHeader } from "@/src/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aviatorsregiment.com"),
  title: {
    default: "Aviator's Regiment | Build your flight path",
    template: "%s | Aviator's Regiment",
  },
  description:
    "Aviation services, flight training guidance and reliable CX-3 rental support for India's next generation of pilots.",
  openGraph: {
    title: "Aviator's Regiment",
    description: "Your flight path starts here.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
