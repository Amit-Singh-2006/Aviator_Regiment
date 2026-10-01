import { notFound } from "next/navigation";
import { ContentPage } from "@/src/components/content-page";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappMessages } from "@/src/lib/whatsapp";
import { careerGuideTitle, careers, findCareer } from "@/src/modules/content/careers";

// Only the careers defined in the content module exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() { return careers.map((career) => ({ slug: career.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const career = findCareer(slug);
  if (!career) return {};
  return pageMetadata({ title: careerGuideTitle(career), description: career.summary, path: `/careers/${career.slug}` });
}

export default async function CareerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const career = findCareer(slug);
  if (!career) notFound();
  return <ContentPage eyebrow={`Careers / ${career.name}`} title={<>{career.name}<br /><em>career guide.</em></>} intro={career.summary} sections={[{ title: "What the work looks like", text: "Understand the responsibility, environment and rhythm behind this aviation pathway." }, { title: "How to prepare", text: "Build a plan around education, training, eligibility and the practical milestones ahead." }, { title: "Ask better questions", text: "Use informed guidance to compare routes and make decisions with confidence." }]} actions={<WhatsAppCta message={whatsappMessages.career(career.enquiry)} label="Ask about this career" />} />;
}
