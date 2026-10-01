import type { Metadata } from "next";
import { siteConfig } from "@/src/lib/site-config";

// Logo shown in link previews (WhatsApp, Telegram, social).
export const shareImage = { url: "/images/logo.png", width: 640, height: 640, alt: siteConfig.name };

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

// Child metadata replaces the parent's openGraph object entirely, so every page
// sets its own Open Graph fields instead of inheriting the homepage values.
export function pageMetadata({ title, description, path, noIndex = false }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: "en_IN",
      type: "website",
      images: [shareImage],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
