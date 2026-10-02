import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappMessages } from "@/src/lib/whatsapp";
import { careerPageTitle } from "@/src/modules/careers/careers";
import { getCareerRole, getCareerSlugs } from "@/src/modules/careers/queries";
import { Markdown } from "@/src/modules/news/markdown";

type Params = Promise<{ slug: string }>;

// Careers are managed in the admin panel; edits refresh these pages straight away.
export const revalidate = 3600;

export async function generateStaticParams() {
  const roles = await getCareerSlugs().catch(() => []);
  return roles.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const role = await getCareerRole(slug);
  if (!role) return { title: "Career not found", robots: { index: false } };
  return pageMetadata({ title: careerPageTitle(role.name), description: role.summary || `Companies hiring for ${role.name} roles in aviation, with links to their official careers pages.`, path: `/careers/${role.slug}` });
}

export default async function CareerPage({ params }: { params: Params }) {
  const { slug } = await params;
  const role = await getCareerRole(slug);
  if (!role) notFound();

  return <main>
    <section className="content-hero">
      <div className="shell">
        <Link className="article-back" href="/careers">← All careers</Link>
        <p className="eyebrow">Careers / {role.name}</p>
        <h1>{role.name}</h1>
        {role.summary ? <p>{role.summary}</p> : null}
      </div>
    </section>
    <section className="section options-section">
      <div className="shell">
        <h2 className="option-heading">Choose a company</h2>
        <p className="option-intro">Each link opens the company&apos;s official careers page in a new tab.</p>
        {role.career_companies.length
          ? <ul className="option-grid">{role.career_companies.map((company) => <li key={company.id}>
            <a className="option-card" href={company.careers_url} target="_blank" rel="noopener noreferrer">
              <span>{company.name}</span>
              {company.note ? <small>{company.note}</small> : null}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>)}</ul>
          : <p className="news-empty">Company links for this career are being updated. Please check back soon.</p>}
        <p className="option-disclaimer">Openings change often, so always apply through the company&apos;s official website. Aviator&apos;s Regiment isn&apos;t affiliated with these companies. Be wary of anyone who asks for money in return for a job offer.</p>
      </div>
    </section>
    {role.guide ? <section className="section career-guide"><div className="shell article-shell article-body"><Markdown source={role.guide} /></div></section> : null}
    <section className="dark-section content-bottom">
      <div className="shell">
        <p className="eyebrow">Need guidance?</p>
        <h2>Plan your path<br /><em>with us.</em></h2>
        <WhatsAppCta message={whatsappMessages.career(role.enquiry)} label="Ask about this career" />
      </div>
    </section>
  </main>;
}
