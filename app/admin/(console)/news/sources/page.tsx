import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { deleteSource, saveSource } from "@/src/modules/news/admin-actions";
import { newsCategories, newsCategoryLabels } from "@/src/modules/news/categories";

export const metadata = { title: "News sources" };

type Source = { id: string; name: string; url: string; default_category: string; active: boolean };

function SourceFields({ source }: { source?: Source }) {
  return <>
    {source ? <input type="hidden" name="id" value={source.id} /> : null}
    <label>Name<input name="name" required maxLength={80} defaultValue={source?.name} placeholder="e.g. Aviation A2Z" /></label>
    <label className="grow">RSS feed link<input name="url" type="url" required defaultValue={source?.url} placeholder="https://example.com/feed/" /></label>
    <label>Default category<select name="category" defaultValue={source?.default_category ?? "aviation_industry"}>{newsCategories.map((category) => <option key={category} value={category}>{newsCategoryLabels[category]}</option>)}</select></label>
    <label className="checkbox"><input type="checkbox" name="active" defaultChecked={source?.active ?? true} />Active</label>
  </>;
}

export default async function NewsSourcesPage() {
  const { supabase } = await requireAdmin();
  const { data: sources } = await supabase.from("news_sources").select("id, name, url, default_category, active, last_checked_at").order("name");

  return <>
    <AdminHeader eyebrow="Content / Aviation news" title="News sources" />
    <p className="next-step"><b>Where news comes from</b>n8n checks every active feed every 3 hours and keeps stories from the last 48 hours. For Google News, search a topic and use a link like https://news.google.com/rss/search?q=DGCA&amp;hl=en-IN&amp;gl=IN&amp;ceid=IN:en</p>
    <Panel title="Feeds">
      {sources?.length ? <ul className="source-list">{sources.map((source) => <li key={source.id}>
        <ActionForm action={saveSource} className="admin-form source-row">
          <SourceFields source={source} />
          <button className="admin-button" type="submit">Save</button>
        </ActionForm>
        <div className="source-meta">
          <small>Last checked {formatDateTime(source.last_checked_at)}</small>
          <ActionForm action={deleteSource}>
            <input type="hidden" name="id" value={source.id} />
            <button className="admin-link danger" type="submit" data-confirm={`Remove ${source.name}? Articles already collected from it are kept.`}>Remove</button>
          </ActionForm>
        </div>
      </li>)}</ul> : <EmptyState>No sources yet. Add an RSS feed below.</EmptyState>}
    </Panel>
    <Panel title="Add a source">
      <ActionForm action={saveSource} className="admin-form source-row">
        <SourceFields />
        <button className="admin-button primary" type="submit">Add source</button>
      </ActionForm>
    </Panel>
  </>;
}
