import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, Panel, Pill } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { saveArticle, setArticleImageLink, uploadArticleImage } from "@/src/modules/news/admin-actions";
import { newsCategories, newsCategoryLabels, newsStatusLabels, newsStatusTone, type NewsStatus } from "@/src/modules/news/categories";
import { Markdown } from "@/src/modules/news/markdown";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit article" };

function ActionButtons({ status }: { status: NewsStatus }) {
  const publish = <button className="admin-button primary" type="submit" name="intent" value="publish" data-confirm="Publish this article on the website now?">Publish</button>;
  const reject = <button className="admin-button danger" type="submit" name="intent" value="reject" data-confirm="Reject this article? It won't be published.">Reject</button>;
  switch (status) {
    case "published":
      return <><button className="admin-button primary" type="submit" name="intent" value="save">Save changes</button><button className="admin-button danger" type="submit" name="intent" value="unpublish" data-confirm="Take this article off the website?">Unpublish</button></>;
    case "approved":
      return <><button className="admin-button" type="submit" name="intent" value="save">Save</button>{publish}<button className="admin-button" type="submit" name="intent" value="restore">Back to drafts</button>{reject}</>;
    case "rejected":
      return <><button className="admin-button" type="submit" name="intent" value="save">Save</button><button className="admin-button primary" type="submit" name="intent" value="restore">Move back to drafts</button></>;
    default:
      return <><button className="admin-button" type="submit" name="intent" value="save">Save draft</button><button className="admin-button" type="submit" name="intent" value="approve">Approve</button>{publish}{reject}</>;
  }
}

export default async function NewsEditorPage({ params }: { params: Params }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: article } = await supabase.from("news_articles").select("*").eq("id", id).maybeSingle();
  if (!article) notFound();
  const { data: duplicate } = article.possible_duplicate_of
    ? await supabase.from("news_articles").select("id, title, source_title, status").eq("id", article.possible_duplicate_of).maybeSingle()
    : { data: null };

  return <>
    <Link className="admin-back" href="/admin/news">← All news</Link>
    <AdminHeader eyebrow={`News / ${newsCategoryLabels[article.category]}`} title={article.title ?? article.source_title}>
      <Pill tone={newsStatusTone[article.status]}>{newsStatusLabels[article.status]}</Pill>
      {article.status === "published" && article.slug ? <Link className="admin-button" href={`/aviation-news/${article.slug}`} target="_blank">View live ↗</Link> : null}
    </AdminHeader>
    {duplicate ? <p className="next-step warn"><b>Possible duplicate</b>This looks like a story already collected: <Link className="admin-link" href={`/admin/news/${duplicate.id}`}>{duplicate.title ?? duplicate.source_title}</Link> ({newsStatusLabels[duplicate.status]}). Reject one of them unless they cover different facts.</p> : null}
    {article.status === "detected" ? <p className="next-step"><b>No AI draft yet</b>The AI drafts new stories on its next run, or you can write this one yourself below.</p> : null}

    <div className="admin-columns wide-left">
      <Panel title="Article">
        <ActionForm action={saveArticle} className="admin-form article-form">
          <input type="hidden" name="id" value={article.id} />
          <label>Headline<input name="title" maxLength={140} defaultValue={article.title ?? ""} placeholder={article.source_title} /></label>
          <label>URL slug<span className="input-prefix"><span>/aviation-news/</span><input name="slug" maxLength={90} defaultValue={article.slug ?? ""} placeholder="made-from-the-headline" /></span></label>
          <label>Summary<textarea name="summary" rows={3} maxLength={300} defaultValue={article.summary ?? ""} /><small>One or two sentences shown on the news list and in Google results.</small></label>
          <label>Body<textarea name="body" rows={18} defaultValue={article.body ?? ""} className="mono" /><small>Markdown: ## Heading · **bold** · *italic* · [link text](https://…) · - list item. Keep the source credit line at the end.</small></label>
          <div className="form-grid">
            <label>Category<select name="category" defaultValue={article.category}>{newsCategories.map((category) => <option key={category} value={category}>{newsCategoryLabels[category]}</option>)}</select></label>
            <label className="checkbox"><input type="checkbox" name="isFeatured" defaultChecked={article.is_featured} />Feature at the top of the news page</label>
            <label>Tags<input name="tags" defaultValue={article.tags.join(", ")} placeholder="DGCA, CPL, exams" /><small>Comma-separated, up to 8.</small></label>
            <label>SEO keywords<input name="keywords" defaultValue={article.keywords.join(", ")} /><small>Comma-separated, up to 10.</small></label>
            <label>SEO title<input name="metaTitle" maxLength={70} defaultValue={article.meta_title ?? ""} /><small>Up to 70 characters. Uses the headline if empty.</small></label>
            <label>SEO description<input name="metaDescription" maxLength={170} defaultValue={article.meta_description ?? ""} /><small>Up to 170 characters. Uses the summary if empty.</small></label>
            <label>Image alt text<input name="imageAlt" maxLength={200} defaultValue={article.image_alt ?? ""} /><small>Describe the image. Needed when there&apos;s an image.</small></label>
            <label>Image credit<input name="imageCredit" maxLength={200} defaultValue={article.image_credit ?? ""} placeholder="e.g. Photo: Airbus" /></label>
          </div>
          <div className="button-row sticky-actions"><ActionButtons status={article.status} /></div>
        </ActionForm>
      </Panel>

      <div className="admin-stack">
        <Panel title="Source">
          <dl className="admin-dl single">
            <div><dt>Publication</dt><dd>{article.source_name}</dd></div>
            <div><dt>Original headline</dt><dd><a className="admin-link" href={article.source_url} target="_blank" rel="noreferrer">{article.source_title} ↗</a></dd></div>
            <div><dt>Published by source</dt><dd>{formatDateTime(article.source_published_at)}</dd></div>
            <div><dt>Collected</dt><dd>{formatDateTime(article.created_at)}{article.ai_model ? ` · drafted by ${article.ai_model}` : ""}</dd></div>
            {article.published_at ? <div><dt>Published here</dt><dd>{formatDateTime(article.published_at)}</dd></div> : null}
          </dl>
          {article.source_summary ? <details className="advanced"><summary>Source text</summary><p className="source-text">{article.source_summary}</p></details> : null}
          <p className="admin-muted">Check every fact against the source before publishing. For DGCA notices, confirm on dgca.gov.in.</p>
        </Panel>

        <Panel title="Image">
          {article.image_url ? <figure className="document-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of any image host */}
            <img src={article.image_url} alt={article.image_alt ?? ""} />
            {article.image_credit ? <figcaption>{article.image_credit}</figcaption> : null}
          </figure> : <p className="admin-muted">No image. Articles without one show a branded placeholder.</p>}
          <ActionForm action={uploadArticleImage} className="admin-form">
            <input type="hidden" name="id" value={article.id} />
            <label>Upload an image<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
            <button className="admin-button" type="submit">Upload</button>
          </ActionForm>
          <ActionForm action={setArticleImageLink} className="admin-form">
            <input type="hidden" name="id" value={article.id} />
            <label>Or use an image link<input type="url" name="imageUrl" placeholder="https://" /></label>
            <div className="button-row">
              <button className="admin-button" type="submit" name="intent" value="link">Use link</button>
              {article.image_url ? <button className="admin-button danger" type="submit" name="intent" value="remove" formNoValidate data-confirm="Remove the image from this article?">Remove image</button> : null}
            </div>
          </ActionForm>
          <p className="admin-muted">Only use images you have the right to publish (your own, licensed, or official press images), and credit them.</p>
        </Panel>
      </div>
    </div>

    {article.body ? <Panel title="Preview (last saved)" className="article-preview">
      <h2 className="preview-title">{article.title ?? article.source_title}</h2>
      {article.summary ? <p className="preview-summary">{article.summary}</p> : null}
      <div className="article-body"><Markdown source={article.body} /></div>
    </Panel> : null}
  </>;
}
