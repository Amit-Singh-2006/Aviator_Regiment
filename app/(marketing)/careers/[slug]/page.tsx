import { ContentPage } from "@/src/components/content-page";

const titles: Record<string, string> = {
  "commercial-pilot": "Commercial Pilot",
  "private-pilot": "Private Pilot",
  "flight-instructor": "Flight Instructor",
  "airline-careers": "Airline Careers",
  "defence-aviation": "Defence Aviation",
  "cabin-crew": "Cabin Crew",
  "aircraft-maintenance---engineering": "Aircraft Maintenance / Engineering",
  "atc": "ATC",
  "ground-operations": "Ground Operations",
  "other-aviation-careers": "Other Aviation Careers",
};

export function generateStaticParams() { return Object.keys(titles).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: titles[slug] ?? "Aviation Career" }; }
export default async function CareerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = titles[slug] ?? "Aviation Career";
  return <ContentPage eyebrow={`Career / ${title}`} title={<>A career with<br /><em>room to rise.</em></>} intro={`Explore the shape of a ${title.toLowerCase()} career, the preparation it demands and the questions worth asking before you begin.`} sections={[{ title: "What the work looks like", text: "Understand the responsibility, environment and rhythm behind this aviation pathway." }, { title: "How to prepare", text: "Build a plan around education, training, eligibility and the practical milestones ahead." }, { title: "Ask better questions", text: "Use informed guidance to compare routes and make decisions with confidence." }]} cta={`I want to explore a ${title} career`} />;
}
