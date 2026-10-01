import Link from "next/link";
import type { ReactNode } from "react";

export function ContentPage({ eyebrow, title, intro, sections, actions }: { eyebrow: string; title: ReactNode; intro: string; sections: { title: string; text: string }[]; actions: ReactNode }) {
  return <main>
    <section className="content-hero"><div className="shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p>{actions}</div></section>
    <section className="section content-sections"><div className="shell content-grid">{sections.map((section, index) => <article className="content-card" key={section.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2><p>{section.text}</p></article>)}</div></section>
    <section className="dark-section content-bottom"><div className="shell"><p className="eyebrow">Need a clear next step?</p><h2>Let&apos;s find your<br /><em>way forward.</em></h2>{actions}</div></section>
  </main>;
}

export function SimpleFooterLinks() {
  return <div className="related-links shell"><Link href="/rent-cx3">Rent CX-3 →</Link><Link href="/services">Explore services →</Link><Link href="/careers">Explore careers →</Link></div>;
}
