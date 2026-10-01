import type { Metadata } from "next";
import { LandingHero } from "@/src/components/landing-hero";
import { HomeOverview } from "@/src/components/home-overview";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <main><LandingHero /><HomeOverview /></main>;
}
