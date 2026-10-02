import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/src/lib/supabase/server";
import type { NewsCategory } from "@/src/modules/news/categories";

const listColumns = "slug, title, summary, category, image_url, image_alt, published_at, source_name, is_featured";

// Published articles only; row level security hides everything else from the public key.
export async function getPublishedArticles({ category, limit = 30, excludeSlug, search }: { category?: NewsCategory; limit?: number; excludeSlug?: string; search?: string } = {}) {
  let query = createPublicClient()
    .from("news_articles")
    .select(listColumns)
    .eq("status", "published")
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  if (excludeSlug) query = query.neq("slug", excludeSlug);
  if (search) query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load news: ${error.message}`);
  return data;
}

export const getPublishedArticle = cache(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("news_articles")
    .select("slug, title, summary, body, category, tags, keywords, meta_title, meta_description, image_url, image_alt, image_credit, source_name, source_url, published_at, updated_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the article: ${error.message}`);
  return data;
});

export async function getPublishedSlugs() {
  const { data } = await createPublicClient()
    .from("news_articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .not("slug", "is", null);
  return data ?? [];
}
