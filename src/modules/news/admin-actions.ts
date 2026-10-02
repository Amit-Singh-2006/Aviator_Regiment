"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/src/components/admin/action-form";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { adminErrorMessage } from "@/src/lib/supabase/errors";
import { recordAudit } from "@/src/modules/audit/record";
import { readImageUpload } from "@/src/modules/bookings/uploads";
import { newsCategoryLabels, type NewsCategory, type NewsStatus } from "@/src/modules/news/categories";

const NEWS_IMAGES_BUCKET = "news-images";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const intents = ["save", "review", "approve", "publish", "unpublish", "reject", "restore"] as const;
type Intent = (typeof intents)[number];

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(formData: FormData, name: string, maxItems: number, maxLength: number) {
  const items = String(formData.get(name) ?? "").split(",").map((item) => item.trim().slice(0, maxLength)).filter(Boolean);
  return [...new Set(items)].slice(0, maxItems);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");
}

function refreshNews(...slugs: (string | null | undefined)[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/aviation-news");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/aviation-news/${slug}`);
}

const nextStatus: Record<Intent, (current: NewsStatus) => NewsStatus> = {
  save: (current) => (current === "detected" ? "draft" : current),
  review: () => "review",
  approve: () => "approved",
  publish: () => "published",
  unpublish: () => "approved",
  reject: () => "rejected",
  restore: () => "draft",
};

const intentMessages: Record<Intent, string> = {
  save: "Saved.",
  review: "Sent for review.",
  approve: "Approved. Publish it when you're ready.",
  publish: "Published. It's live on the Aviation News page.",
  unpublish: "Unpublished. It's no longer on the website.",
  reject: "Rejected. It won't be published.",
  restore: "Moved back to drafts.",
};

export async function saveArticle(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "save") as Intent;
  if (!UUID_PATTERN.test(id) || !intents.includes(intent)) return { error: "Invalid request." };

  const { data: current } = await supabase.from("news_articles").select("status, slug, published_at, image_url").eq("id", id).maybeSingle();
  if (!current) return { error: "That article no longer exists." };

  const title = text(formData, "title", 140);
  const slug = slugify(String(formData.get("slug") ?? "") || title);
  const summary = text(formData, "summary", 300);
  const body = String(formData.get("body") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 20000);
  const category = String(formData.get("category") ?? "") as NewsCategory;
  const metaTitle = text(formData, "metaTitle", 70) || title.slice(0, 70);
  const metaDescription = text(formData, "metaDescription", 170) || summary.slice(0, 170);
  const imageAlt = text(formData, "imageAlt", 200);
  const imageCredit = text(formData, "imageCredit", 200);
  const status = nextStatus[intent](current.status);

  if (!(category in newsCategoryLabels)) return { error: "Choose a category." };
  if (current.image_url && !imageAlt) return { error: "Describe the image in a few words (alt text) for screen readers and search engines." };
  if (status === "approved" || status === "published") {
    if (title.length < 10) return { error: "Add a headline of at least 10 characters." };
    if (slug.length < 3) return { error: "Add a URL slug." };
    if (summary.length < 30) return { error: "Add a summary of at least 30 characters. It's shown on the news list and in search results." };
    if (body.length < 80) return { error: "The article body is too short to publish." };
  }

  const { error } = await supabase.from("news_articles").update({
    title: title || null,
    slug: slug || null,
    summary: summary || null,
    body: body || null,
    category,
    tags: list(formData, "tags", 8, 30),
    keywords: list(formData, "keywords", 10, 60),
    meta_title: metaTitle || null,
    meta_description: metaDescription || null,
    image_alt: imageAlt || null,
    image_credit: imageCredit || null,
    is_featured: formData.get("isFeatured") === "on",
    status,
    ...(intent === "save" ? {} : { reviewed_by: userId }),
    ...(status === "published" && !current.published_at ? { published_at: new Date().toISOString() } : {}),
  }).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Another article already uses this URL slug. Change the slug." : adminErrorMessage(error) };

  if (intent !== "save") await recordAudit(supabase, { actor_id: userId, action: `news.${intent}`, entity: "news_article", entity_id: id, details: { title } });
  refreshNews(current.slug, slug);
  return { ok: intentMessages[intent] };
}

// Path inside the news-images bucket for one of our own public URLs, if it is one.
function storagePath(url: string | null) {
  const marker = `/storage/v1/object/public/${NEWS_IMAGES_BUCKET}/`;
  return url?.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
}

export async function uploadArticleImage(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return { error: "Invalid request." };
  const upload = await readImageUpload(formData.get("image"), "Choose an image to upload.");
  if ("error" in upload) return { error: upload.error };

  const { data: article } = await supabase.from("news_articles").select("slug, image_url").eq("id", id).maybeSingle();
  if (!article) return { error: "That article no longer exists." };

  const path = `${id}/${randomUUID()}.${upload.extension}`;
  const bucket = supabase.storage.from(NEWS_IMAGES_BUCKET);
  const { error: uploadError } = await bucket.upload(path, upload.bytes, { contentType: upload.contentType, cacheControl: "31536000" });
  if (uploadError) return { error: "The image couldn't be uploaded. Please try again." };

  const imageUrl = bucket.getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("news_articles").update({ image_url: imageUrl }).eq("id", id);
  if (error) {
    await bucket.remove([path]);
    return { error: adminErrorMessage(error) };
  }
  const previous = storagePath(article.image_url);
  if (previous) await bucket.remove([previous]);
  refreshNews(article.slug);
  return { ok: "Image uploaded. Add alt text and credit, then save." };
}

// Deletes an article and its uploaded image. Published articles disappear from the site.
export async function deleteArticle(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return { error: "Invalid request." };

  const { data: article, error } = await supabase.from("news_articles").delete().eq("id", id).select("slug, title, source_title, image_url").maybeSingle();
  if (error) return { error: adminErrorMessage(error) };
  if (!article) return { error: "That article no longer exists." };
  const image = storagePath(article.image_url);
  if (image) await supabase.storage.from(NEWS_IMAGES_BUCKET).remove([image]);

  await recordAudit(supabase, { actor_id: userId, action: "news.delete", entity: "news_article", entity_id: id, details: { title: article.title ?? article.source_title } });
  refreshNews(article.slug);
  redirect("/admin/news");
}

export async function setArticleImageLink(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const remove = formData.get("intent") === "remove";
  const imageUrl = remove ? "" : text(formData, "imageUrl", 500);
  if (!UUID_PATTERN.test(id)) return { error: "Invalid request." };
  if (!remove && !/^https:\/\/\S+$/.test(imageUrl)) return { error: "Paste an image link starting with https://." };

  const { data: article } = await supabase.from("news_articles").select("slug, image_url").eq("id", id).maybeSingle();
  if (!article) return { error: "That article no longer exists." };
  const { error } = await supabase.from("news_articles").update(remove ? { image_url: null, image_alt: null, image_credit: null } : { image_url: imageUrl }).eq("id", id);
  if (error) return { error: adminErrorMessage(error) };
  const previous = storagePath(article.image_url);
  if (previous) await supabase.storage.from(NEWS_IMAGES_BUCKET).remove([previous]);
  refreshNews(article.slug);
  return { ok: remove ? "Image removed." : "Image link saved. Only use images you have the right to use, and credit the owner." };
}

export async function saveSource(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = text(formData, "name", 80);
  const url = text(formData, "url", 500);
  const category = String(formData.get("category") ?? "") as NewsCategory;
  if (id && !UUID_PATTERN.test(id)) return { error: "Invalid request." };
  if (name.length < 2) return { error: "Give the source a name." };
  if (!/^https?:\/\/\S+$/.test(url)) return { error: "Enter the RSS feed link, starting with https://." };
  if (!(category in newsCategoryLabels)) return { error: "Choose a default category." };

  const values = { name, url, default_category: category, active: formData.get("active") === "on" };
  const { error } = id ? await supabase.from("news_sources").update(values).eq("id", id) : await supabase.from("news_sources").insert(values);
  if (error) return { error: error.code === "23505" ? "That feed is already in the list." : adminErrorMessage(error) };
  await recordAudit(supabase, { actor_id: userId, action: id ? "news_source.updated" : "news_source.added", entity: "news_source", entity_id: id || url, details: values });
  revalidatePath("/admin", "layout");
  return { ok: id ? "Source saved." : `${name} added. It's checked on the next run (every 3 hours).` };
}

export async function deleteSource(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return { error: "Invalid request." };
  const { data: source, error } = await supabase.from("news_sources").delete().eq("id", id).select("name").maybeSingle();
  if (error) return { error: adminErrorMessage(error) };
  await recordAudit(supabase, { actor_id: userId, action: "news_source.removed", entity: "news_source", entity_id: id, details: { name: source?.name ?? null } });
  revalidatePath("/admin", "layout");
  return { ok: "Source removed. Articles already collected from it are kept." };
}
