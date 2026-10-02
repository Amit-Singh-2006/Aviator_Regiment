import Link from "next/link";
import { AdminHeader, EmptyState, Panel, Pill, Tabs } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { newsCategoryLabels, newsStatusLabels, newsStatusTone, type NewsStatus } from "@/src/modules/news/categories";

export const metadata = { title: "News" };

const queues: { id: string; label: string; statuses: NewsStatus[] }[] = [
  { id: "review", label: "To review", statuses: ["draft", "review"] },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "published", label: "Published", statuses: ["published"] },
  { id: "rejected", label: "Rejected", statuses: ["rejected"] },
  { id: "detected", label: "Waiting for AI", statuses: ["detected"] },
  { id: "all", label: "All", statuses: [] },
];

export default async function NewsAdminPage({ searchParams }: { searchParams: Promise<{ queue?: string; q?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const queue = queues.find((item) => item.id === params.queue) ?? queues[0];
  const search = (params.q ?? "").replace(/[^\p{L}\p{N} .\-]/gu, "").trim().slice(0, 60);

  let query = supabase
    .from("news_articles")
    .select("id, title, source_title, source_name, category, status, possible_duplicate_of, is_featured, published_at, created_at")
    .order(queue.id === "published" ? "published_at" : "created_at", { ascending: false })
    .limit(100);
  if (queue.statuses.length) query = query.in("status", queue.statuses);
  if (search) query = query.or(`title.ilike.%${search}%,source_title.ilike.%${search}%`);

  const [{ data: articles, error }, ...counts] = await Promise.all([
    query,
    ...queues.map((item) => {
      const countQuery = supabase.from("news_articles").select("id", { count: "exact", head: true });
      return item.statuses.length ? countQuery.in("status", item.statuses) : countQuery;
    }),
  ]);
  const hrefFor = (queueId: string) => `/admin/news${queueId === "review" ? "" : `?queue=${queueId}`}`;

  return <>
    <AdminHeader eyebrow="Content / Aviation news" title="News">
      <Link className="admin-button" href="/admin/news/sources">Manage sources</Link>
    </AdminHeader>
    <p className="next-step"><b>How it works</b>Every 3 hours, n8n reads the news sources and an AI writes a draft for each new story. Nothing goes live until an admin publishes it here.</p>
    <Tabs active={queue.id} items={queues.map((item, index) => ({ id: item.id, label: item.label, href: hrefFor(item.id), count: item.id === "all" ? undefined : counts[index].count ?? 0 }))} />
    <Panel>
      <form className="admin-search" action="/admin/news" role="search">
        {queue.id !== "review" ? <input type="hidden" name="queue" value={queue.id} /> : null}
        <label className="visually-hidden" htmlFor="news-search">Search news</label>
        <input id="news-search" name="q" type="search" defaultValue={search} placeholder="Search headlines" />
        <button className="admin-button" type="submit">Search</button>
      </form>
      {error ? <EmptyState>News couldn&apos;t be loaded. Refresh the page to try again.</EmptyState> : !articles?.length ? <EmptyState>{search ? "No articles match your search." : "Nothing here right now."}</EmptyState> :
        <div className="table-wrap">
          <table>
            <thead><tr><th>Headline</th><th>Category</th><th>Source</th><th>Status</th><th>{queue.id === "published" ? "Published" : "Collected"}</th></tr></thead>
            <tbody>{articles.map((article) => <tr key={article.id}>
              <td className="wrap">
                <Link className="row-link" href={`/admin/news/${article.id}`}>{article.title ?? article.source_title}</Link>
                {article.possible_duplicate_of ? <Pill tone="warn">Possible duplicate</Pill> : null}
                {article.is_featured ? <Pill tone="info">Featured</Pill> : null}
              </td>
              <td>{newsCategoryLabels[article.category]}</td>
              <td>{article.source_name}</td>
              <td><Pill tone={newsStatusTone[article.status]}>{newsStatusLabels[article.status]}</Pill></td>
              <td>{formatDateTime(queue.id === "published" ? article.published_at : article.created_at)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </Panel>
  </>;
}
