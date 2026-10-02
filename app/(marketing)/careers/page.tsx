import Link from "next/link";
import { pageMetadata } from "@/src/lib/seo";
import { getCareerRoles } from "@/src/modules/careers/queries";

export const metadata = pageMetadata({ title: "Aviation Careers", description: "Explore aviation careers in India: commercial and private pilot, flight instructor, defence aviation, cabin crew, aircraft maintenance, ATC, ground operations and more, with links to each company's official careers page.", path: "/careers" });

// Careers are managed in the admin panel; edits refresh this page straight away.
export const revalidate = 3600;

export default async function CareersPage() {
  const roles = await getCareerRoles();

  return <main>
    <section className="content-hero"><div className="shell"><p className="eyebrow">Careers / Find your altitude</p><h1>There is more<br /><em>than one runway.</em></h1><p>Choose a career to see the companies that hire for it, then go straight to their official careers pages.</p></div></section>
    <section className="section options-section">
      <div className="shell">
        {roles.length
          ? <nav className="option-grid" aria-label="Aviation careers">{roles.map((role) => <Link key={role.slug} href={`/careers/${role.slug}`} className="option-card">{role.name}</Link>)}</nav>
          : <p className="news-empty">Career guides are being updated. Please check back soon.</p>}
      </div>
    </section>
    <div className="related-links shell"><Link href="/coaching">Explore coaching →</Link><Link href="/services">Explore services →</Link><Link href="/community">Join the community →</Link></div>
  </main>;
}
