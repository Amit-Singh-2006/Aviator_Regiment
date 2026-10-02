import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/lib/site-config";
import { getCareerSlugs } from "@/src/modules/careers/queries";
import { getPublishedSlugs } from "@/src/modules/news/queries";

const staticPaths = ["", "/rent-cx3", "/services", "/services/dgca-computer-number", "/services/medical-assistance", "/services/nios-assistance", "/aviation-news", "/careers", "/coaching", "/community", "/marketplace", "/about", "/contact", "/terms", "/privacy-policy", "/refund-policy", "/shipping-policy"];

// Refreshed hourly, and whenever news or careers change in the admin panel.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = staticPaths.map((path) => ({ url: `${siteConfig.url}${path}` }));
  const [careers, articles] = await Promise.all([getCareerSlugs().catch(() => []), getPublishedSlugs().catch(() => [])]);
  return [
    ...pages,
    ...careers.map((career) => ({ url: `${siteConfig.url}/careers/${career.slug}`, lastModified: career.updated_at })),
    ...articles.map((article) => ({ url: `${siteConfig.url}/aviation-news/${article.slug}`, lastModified: article.updated_at })),
  ];
}
