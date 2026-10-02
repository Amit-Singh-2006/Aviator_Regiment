import Link from "next/link";
import { NewsCard } from "@/src/components/news-card";
import { pageMetadata } from "@/src/lib/seo";
import { categoryFromSlug, categorySlug, newsCategories, newsCategoryLabels } from "@/src/modules/news/categories";
import { getPublishedArticles } from "@/src/modules/news/queries";

export const metadata = pageMetadata({ title: "Aviation News", description: "Source-attributed aviation news for India: DGCA updates, DGCA exam updates, pilot news, regulations and aviation training, reviewed before publication.", path: "/aviation-news" });

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const category = categoryFromSlug((await searchParams).category);
  let articles: Awaited<ReturnType<typeof getPublishedArticles>> = [];
  let failed = false;
  try {
    articles = await getPublishedArticles({ category, limit: 30 });
  } catch (error) {
    console.error(error);
    failed = true;
  }
  // Without a filter, a featured article (or the newest) leads the page.
  const lead = category ? undefined : articles.find((article) => article.is_featured) ?? articles[0];
  const rest = articles.filter((article) => article !== lead);

  return <main>
    <section className="content-hero"><div className="shell"><p className="eyebrow">Aviation news / Source first</p><h1>Stay informed.<br /><em>Stay airborne.</em></h1><p>Source-attributed aviation updates for student pilots and aviation professionals in India. Every article is reviewed by our team before it&apos;s published.</p></div></section>
    <section className="section news-section">
      <div className="shell">
        <nav className="news-filters" aria-label="News categories">
          <Link href="/aviation-news" aria-current={category ? undefined : "page"}>All news</Link>
          {newsCategories.map((item) => <Link key={item} href={`/aviation-news?category=${categorySlug(item)}`} aria-current={item === category ? "page" : undefined}>{newsCategoryLabels[item]}</Link>)}
        </nav>
        {failed ? <p className="news-empty">News couldn&apos;t be loaded right now. Please try again in a moment.</p>
          : !articles.length ? <p className="news-empty">{category ? `No ${newsCategoryLabels[category]} articles yet.` : "The first articles are on their way."} Join our <Link href="/community">community</Link> to hear about updates first.</p>
          : <>
            {lead ? <NewsCard article={lead} lead /> : null}
            {rest.length ? <div className="news-grid">{rest.map((article) => <NewsCard key={article.slug} article={article} />)}</div> : null}
          </>}
      </div>
    </section>
    <div className="related-links shell"><Link href="/rent-cx3">Rent a CX-3 for your DGCA exam →</Link><Link href="/careers">Explore aviation careers →</Link><Link href="/coaching">Explore coaching →</Link></div>
  </main>;
}
