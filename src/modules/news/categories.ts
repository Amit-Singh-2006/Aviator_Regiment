import type { Tone } from "@/src/components/admin/admin-ui";
import type { Enums } from "@/src/db/database.types";

export type NewsCategory = Enums<"news_category">;
export type NewsStatus = Enums<"news_status">;

export const newsCategoryLabels: Record<NewsCategory, string> = {
  dgca_updates: "DGCA Updates",
  dgca_exam_updates: "DGCA Exam Updates",
  aviation_industry: "Aviation Industry",
  pilot_news: "Pilot News",
  regulations: "Regulations",
  aviation_training: "Aviation Training",
  defence_aviation: "Defence Aviation",
  interesting_stories: "Interesting Stories",
};

export const newsCategories = Object.keys(newsCategoryLabels) as NewsCategory[];

// URL-friendly category names for /aviation-news?category=…
export function categorySlug(category: NewsCategory) {
  return category.replace(/_/g, "-");
}

export function categoryFromSlug(slug: string | undefined) {
  const category = slug?.replace(/-/g, "_");
  return category && category in newsCategoryLabels ? (category as NewsCategory) : undefined;
}

export const newsStatusLabels: Record<NewsStatus, string> = {
  detected: "Waiting for AI draft",
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
};

export const newsStatusTone: Record<NewsStatus, Tone> = {
  detected: "neutral",
  draft: "warn",
  review: "warn",
  approved: "info",
  published: "good",
  rejected: "bad",
};
