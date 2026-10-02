import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/src/components/news-card";
import { formatDate } from "@/src/lib/format";
import { shareImage } from "@/src/lib/seo";
import { siteConfig } from "@/src/lib/site-config";
import { categorySlug, newsCategoryLabels } from "@/src/modules/news/categories";
import { Markdown, stripMarkdown } from "@/src/modules/news/markdown";
import { getPublishedArticle, getPublishedArticles } from "@/src/modules/news/queries";

type Params = Promise<{ slug: string }>;

// Rendered on first visit, then cached; publishing or editing refreshes the page.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const article = await getPublishedArticle((await params).slug);
  if (!article?.title) return { title: "Article not found", robots: { index: false } };
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.summary || stripMarkdown(article.body ?? "").slice(0, 160);
  const path = `/aviation-news/${article.slug}`;
  return {
    title,
    description,
    keywords: article.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: "en_IN",
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      section: newsCategoryLabels[article.category],
      tags: article.tags,
      images: article.image_url ? [{ url: article.image_url, alt: article.image_alt ?? title }] : [shareImage],
    },
    twitter: { card: article.image_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const article = await getPublishedArticle((await params).slug);
  if (!article?.title || !article.body) notFound();
  const more = await getPublishedArticles({ category: article.category, limit: 3, excludeSlug: article.slug ?? undefined }).catch(() => []);
  const isDgca = article.category === "dgca_updates" || article.category === "dgca_exam_updates" || article.category === "regulations";
  const url = `${siteConfig.url}/aviation-news/${article.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    image: article.image_url ? [article.image_url] : [`${siteConfig.url}${shareImage.url}`],
    articleSection: newsCategoryLabels[article.category],
    keywords: article.keywords.join(", ") || undefined,
    isBasedOn: article.source_url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    publisher: { "@type": "Organization", name: siteConfig.name, logo: { "@type": "ImageObject", url: `${siteConfig.url}${shareImage.url}` } },
  };

  return <main>
    <article>
      <header className="article-hero">
        <div className="shell article-shell">
          <Link className="article-back" href="/aviation-news">← Aviation news</Link>
          <p className="eyebrow"><Link href={`/aviation-news?category=${categorySlug(article.category)}`}>{newsCategoryLabels[article.category]}</Link></p>
          <h1>{article.title}</h1>
          {article.summary ? <p className="article-dek">{article.summary}</p> : null}
          <p className="article-meta">
            {article.published_at ? <time dateTime={article.published_at}>{formatDate(article.published_at)}</time> : null}
            <span>Source: <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow">{article.source_name}</a></span>
          </p>
        </div>
      </header>
      {article.image_url ? <figure className="shell article-shell article-figure">
        {/* eslint-disable-next-line @next/next/no-img-element -- images can come from any licensed host */}
        <img src={article.image_url} alt={article.image_alt ?? ""} />
        {article.image_credit ? <figcaption>{article.image_credit}</figcaption> : null}
      </figure> : null}
      <div className="shell article-shell article-body"><Markdown source={article.body} /></div>
      <aside className="shell article-shell article-note">
        <p>This brief is based on reporting by <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow">{article.source_name}</a> and was reviewed by the Aviator&apos;s Regiment team before publication.{isDgca ? <> For official DGCA circulars and exam notices, always confirm on <a href="https://www.dgca.gov.in" target="_blank" rel="noopener noreferrer">dgca.gov.in</a>.</> : null}</p>
        {article.tags.length ? <ul className="article-tags" aria-label="Tags">{article.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
      </aside>
    </article>
    {more.length ? <section className="section news-section"><div className="shell">
      <h2 className="news-more-title">More {newsCategoryLabels[article.category]}</h2>
      <div className="news-grid">{more.map((item) => <NewsCard key={item.slug} article={item} />)}</div>
    </div></section> : null}
    <div className="related-links shell"><Link href="/aviation-news">All aviation news →</Link><Link href="/rent-cx3">Rent a CX-3 for your DGCA exam →</Link><Link href="/community">Join the community →</Link></div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </main>;
}
