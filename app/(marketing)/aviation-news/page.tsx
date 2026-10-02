import Link from "next/link";
import { NewsCard } from "@/src/components/news-card";
import { pageMetadata } from "@/src/lib/seo";
import { categoryFromSlug, categorySlug, newsCategories, newsCategoryLabels } from "@/src/modules/news/categories";
import { getPublishedArticles } from "@/src/modules/news/queries";
import { cleanNewsSearch } from "@/src/modules/news/search";

export const metadata = pageMetadata({ title: "Aviation News", description: "Source-attributed aviation news for India: DGCA updates, DGCA exam updates, pilot news, regulations and aviation training, reviewed before publication.", path: "/aviation-news" });

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  const category = categoryFromSlug(params.category);
  const search = cleanNewsSearch(params.q);
  let articles: Awaited<ReturnType<typeof getPublishedArticles>> = [];
  let failed = false;
  try {
    articles = await getPublishedArticles({ category, search, limit: 30 });
  } catch (error) {
    console.error(error);
    failed = true;
  }
  // Without a filter or search, a featured article (or the newest) leads the page.
  const lead = category || search ? undefined : articles.find((article) => article.is_featured) ?? articles[0];
  const rest = articles.filter((article) => article !== lead);
  const filterHref = (slug?: string) => {
    const query = new URLSearchParams();
    if (slug) query.set("category", slug);
    if (search) query.set("q", search);
    const value = query.toString();
    return value ? `/aviation-news?${value}` : "/aviation-news";
  };

  return <main>
    <section className="content-hero"><div className="shell"><p className="eyebrow">Aviation news / Source first</p><h1>Stay informed.<br /><em>Stay airborne.</em></h1><p>Source-attributed aviation updates for student pilots and aviation professionals in India. Every article is reviewed by our team before it&apos;s published.</p></div></section>
    <section className="section news-section">
      <div className="shell">
        <form className="news-search" action="/aviation-news" role="search">
          {category ? <input type="hidden" name="category" value={categorySlug(category)} /> : null}
          <label className="visually-hidden" htmlFor="news-search">Search aviation news</label>
          <input id="news-search" name="q" type="search" defaultValue={search} placeholder="Search news, e.g. DGCA exam" maxLength={60} />
          <button className="button button-primary" type="submit">Search</button>
        </form>
        <nav className="news-filters" aria-label="News categories">
          <Link href={filterHref()} aria-current={category ? undefined : "page"}>All news</Link>
          {newsCategories.map((item) => <Link key={item} href={filterHref(categorySlug(item))} aria-current={item === category ? "page" : undefined}>{newsCategoryLabels[item]}</Link>)}
        </nav>
        {search ? <p className="news-results">{articles.length ? `Results for “${search}”` : `No articles match “${search}”.`} <Link href={category ? `/aviation-news?category=${categorySlug(category)}` : "/aviation-news"}>Clear search</Link></p> : null}
        {failed ? <p className="news-empty">News couldn&apos;t be loaded right now. Please try again in a moment.</p>
          : !articles.length ? (search ? null : <p className="news-empty">{category ? `No ${newsCategoryLabels[category]} articles yet.` : "The first articles are on their way."} Join our <Link href="/community">community</Link> to hear about updates first.</p>)
          : <>
            {lead ? <NewsCard article={lead} lead /> : null}
            {rest.length ? <div className="news-grid">{rest.map((article) => <NewsCard key={article.slug} article={article} />)}</div> : null}
          </>}
      </div>
    </section>
    <div className="related-links shell"><Link href="/rent-cx3">Rent a CX-3 for your DGCA exam →</Link><Link href="/careers">Explore aviation careers →</Link><Link href="/coaching">Explore coaching →</Link></div>
  </main>;
}
