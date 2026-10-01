import Link from "next/link";
import type { ReactNode } from "react";
import { CommunityLinks } from "@/src/components/community-links";
import { Reveal } from "@/src/components/reveal";
import { sectionFonts } from "@/src/lib/section-fonts";
import type { SectionFont } from "@/src/lib/section-fonts";

type HomeSection = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  text: string;
  href: string;
  link: string;
  font: SectionFont;
  actions?: ReactNode;
  dark?: boolean;
};

const homeSections: HomeSection[] = [
  {
    id: "rent-cx3",
    eyebrow: "Rent CX-3",
    title: <>One complete session.<br /><em>Clear, reliable access.</em></>,
    text: "Choose your DGCA exam session and we take care of the logistics — courier delivery to your door and return pickup after your exams. No security deposit, no per-day pricing.",
    href: "/rent-cx3",
    link: "See sessions",
    font: "cinzel",
    dark: true,
  },
  {
    id: "aviation-services",
    eyebrow: "Aviation Services",
    title: "Practical support for every stage of your flight path.",
    text: "From DGCA computer number assistance to medical and NIOS guidance, get clear help without the runaround.",
    href: "/services",
    link: "Explore services",
    font: "playfair",
  },
  {
    id: "aviation-news",
    eyebrow: "Aviation News",
    title: "Stay close to what is changing in aviation.",
    text: "DGCA updates, exam news, industry movement and stories worth knowing — gathered with source-first context.",
    href: "/aviation-news",
    link: "Read aviation news",
    font: "oswald",
  },
  {
    id: "aviation-careers",
    eyebrow: "Aviation Careers",
    title: "A clearer view of the careers above the clouds.",
    text: "Explore the routes into commercial flying, instruction, defence, cabin crew, engineering and more.",
    href: "/careers",
    link: "View career paths",
    font: "dmSerif",
  },
  {
    id: "coaching",
    eyebrow: "Coaching",
    title: "Build the confidence behind the certificate.",
    text: "Focused coaching and guidance for aspiring pilots who want a structured next step.",
    href: "/coaching",
    link: "Discover coaching",
    font: "spaceGrotesk",
  },
  {
    id: "community",
    eyebrow: "Community",
    title: "You do not have to navigate aviation alone.",
    text: "Connect with people learning, training and building their place in the aviation community.",
    href: "/community",
    link: "Explore the community",
    font: "bricolage",
    actions: <CommunityLinks />,
  },
  {
    id: "about",
    eyebrow: "About Aviator's Regiment",
    title: "A grounded team for ambitious flight paths.",
    text: "We bring practical aviation support, useful information and a long-term view of your journey.",
    href: "/about",
    link: "About us",
    font: "cormorant",
    actions: <CommunityLinks whatsappLabel="Join the Regiment" />,
  },
];

export function HomeOverview() {
  return homeSections.map((section, index) => {
    // Sections alternate sides (left, right, left...) and slide in from that side.
    const side = index % 2 === 0 ? "left" : "right";
    const tone = section.dark ? " dark-section" : index % 2 === 0 ? " home-section-alt" : "";

    return (
      <section key={section.id} id={section.id} className={`home-section home-section-${side}${tone}`}>
        <div className="shell">
          <Reveal from={side} className="home-section-content">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2 className={sectionFonts[section.font].className} data-font={section.font}>{section.title}</h2>
            <div className="home-section-detail">
              <p>{section.text}</p>
              {section.actions ? <div className="home-section-actions">{section.actions}</div> : null}
              <Link className="home-overview-link" href={section.href}>
                {section.link} <span>↗</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    );
  });
}
