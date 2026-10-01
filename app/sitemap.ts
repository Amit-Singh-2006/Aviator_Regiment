import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/lib/site-config";
import { careers } from "@/src/modules/content/careers";

const staticPaths = ["", "/rent-cx3", "/services", "/services/dgca-computer-number", "/services/medical-assistance", "/services/nios-assistance", "/aviation-news", "/careers", "/coaching", "/community", "/about", "/terms", "/refund-policy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...staticPaths, ...careers.map((career) => `/careers/${career.slug}`)].map((path) => ({ url: `${siteConfig.url}${path}` }));
}
