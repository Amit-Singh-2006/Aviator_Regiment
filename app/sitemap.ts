import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/lib/site-config";
import { careers } from "@/src/modules/content/careers";
import { getPublishedSlugs } from "@/src/modules/news/queries";

const staticPaths = ["", "/rent-cx3", "/services", "/services/dgca-computer-number", "/services/medical-assistance", "/services/nios-assistance", "/aviation-news", "/careers", "/coaching", "/community", "/about", "/terms", "/refund-policy"];

// Refreshed hourly, and whenever an article is published or unpublished.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [...staticPaths, ...careers.map((career) => `/careers/${career.slug}`)].map((path) => ({ url: `${siteConfig.url}${path}` }));
  const articles = await getPublishedSlugs().catch(() => []);
  return [...pages, ...articles.map((article) => ({ url: `${siteConfig.url}/aviation-news/${article.slug}`, lastModified: article.updated_at }))];
}
