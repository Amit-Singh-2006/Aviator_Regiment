import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://aviatorsregiment.com";
  return ["", "/rent-cx3", "/services", "/aviation-news", "/careers", "/coaching", "/community", "/about"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
