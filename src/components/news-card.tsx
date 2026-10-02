import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/src/lib/format";
import { newsCategoryLabels, type NewsCategory } from "@/src/modules/news/categories";

export type NewsCardArticle = {
  slug: string | null;
  title: string | null;
  summary: string | null;
  category: NewsCategory;
  image_url: string | null;
  image_alt: string | null;
  published_at: string | null;
  source_name: string;
};

export function NewsCard({ article, lead = false }: { article: NewsCardArticle; lead?: boolean }) {
  return <article className={lead ? "news-card lead" : "news-card"}>
    <Link href={`/aviation-news/${article.slug}`} className="news-card-link">
      <div className="news-card-media">
        {article.image_url
          // eslint-disable-next-line @next/next/no-img-element -- images can come from any licensed host
          ? <img src={article.image_url} alt={article.image_alt ?? ""} loading={lead ? "eager" : "lazy"} decoding="async" />
          : <span className="news-card-placeholder"><Image src="/images/logo.png" alt="" width={72} height={72} /></span>}
      </div>
      <div className="news-card-body">
        <p className="eyebrow">{newsCategoryLabels[article.category]}</p>
        <h2>{article.title}</h2>
        {article.summary ? <p>{article.summary}</p> : null}
        <span>{formatDate(article.published_at)} · {article.source_name}</span>
      </div>
    </Link>
  </article>;
}
