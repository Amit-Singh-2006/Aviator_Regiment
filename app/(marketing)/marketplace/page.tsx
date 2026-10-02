import Link from "next/link";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

export const metadata = pageMetadata({ title: "Aviation Marketplace", description: "The Aviator's Regiment Aviation Marketplace is coming soon: flight computers, headsets, aviation books, pilot accessories, navigation equipment and study material.", path: "/marketplace" });

const categories = [
  { title: "Flight computers", text: "Tools for planning and navigation calculations." },
  { title: "Headsets", text: "Clear communication for training and flying." },
  { title: "Aviation books", text: "Reference books for DGCA exams and beyond." },
  { title: "Pilot accessories", text: "Kneeboards, logbooks and everyday flying kit." },
  { title: "Navigation equipment", text: "Plotters, charts and planning essentials." },
  { title: "Study material", text: "Notes and resources for your next exam." },
];

export default function MarketplacePage() {
  return <main>
    <section className="content-hero">
      <div className="shell">
        <p className="eyebrow">Marketplace / Coming soon</p>
        <h1>Gear up for<br /><em>every flight.</em></h1>
        <p>We&apos;re building an aviation marketplace for genuine flying and study equipment. It isn&apos;t open yet. Tell us on WhatsApp and we&apos;ll let you know when it launches.</p>
        <WhatsAppCta message={whatsappMessages.marketplace} label="Notify me when it opens" />
      </div>
    </section>
    <section className="section">
      <div className="shell">
        <div className="section-heading"><div><p className="eyebrow">What&apos;s coming</p><h2>Built for aviators.</h2></div><p>Only legitimate aviation products, and every listing will be checked by our team.</p></div>
        <div className="content-grid">{categories.map((category) => <article className="content-card plain" key={category.title}><h2>{category.title}</h2><p>{category.text}</p></article>)}</div>
      </div>
    </section>
    <section className="dark-section content-bottom">
      <div className="shell">
        <p className="eyebrow">Sell with us</p>
        <h2>Have aviation gear<br /><em>to sell?</em></h2>
        <a className="button button-primary" href={whatsappLink(whatsappMessages.marketplaceSeller)} target="_blank" rel="noreferrer">Talk to us on WhatsApp <span aria-hidden="true">↗</span></a>
      </div>
    </section>
    <div className="related-links shell"><Link href="/rent-cx3">Rent a CX-3 for your DGCA exam →</Link><Link href="/community">Join the community →</Link></div>
  </main>;
}
