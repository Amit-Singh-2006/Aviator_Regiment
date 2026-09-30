import Link from "next/link";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";

export function ContentPage({ eyebrow, title, intro, sections, cta = "I want to know more" }: { eyebrow: string; title: React.ReactNode; intro: string; sections: { title: string; text: string }[]; cta?: string }) {
  return <main>
    <section className="content-hero"><div className="shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p><WhatsAppCta message={`Hello Aviator's Regiment, ${cta}.`} /></div></section>
    <section className="section content-sections"><div className="shell content-grid">{sections.map((section, index) => <article className="content-card" key={section.title}><span>0{index + 1}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div></section>
    <section className="dark-section content-bottom"><div className="shell"><p className="eyebrow">Need a clear next step?</p><h2>Let&apos;s find your<br /><em>way forward.</em></h2><WhatsAppCta message={`Hello Aviator's Regiment, ${cta}. Please guide me on the next steps.`} /></div></section>
  </main>;
}

export function SimpleFooterLinks() {
  return <div className="related-links shell"><Link href="/rent-cx3">Rent CX-3 →</Link><Link href="/services">Explore services →</Link><Link href="/careers">Explore careers →</Link></div>;
}
