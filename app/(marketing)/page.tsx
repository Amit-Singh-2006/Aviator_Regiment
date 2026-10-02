import type { Metadata } from "next";
import { LandingHero } from "@/src/components/landing-hero";
import { HomeOverview } from "@/src/components/home-overview";
import { shareImage } from "@/src/lib/seo";
import { siteConfig } from "@/src/lib/site-config";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Organization and WebSite structured data for search engines.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}${shareImage.url}`,
      ...(siteConfig.whatsappNumber ? { contactPoint: { "@type": "ContactPoint", telephone: `+${siteConfig.whatsappNumber}`, contactType: "customer service", areaServed: "IN" } } : {}),
    },
    { "@type": "WebSite", "@id": `${siteConfig.url}/#website`, name: siteConfig.name, url: siteConfig.url, publisher: { "@id": `${siteConfig.url}/#organization` }, inLanguage: "en-IN" },
  ],
};

export default function HomePage() {
  return <main>
    <LandingHero />
    <HomeOverview />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </main>;
}
