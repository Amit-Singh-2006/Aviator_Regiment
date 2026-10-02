import "server-only";
import { cache } from "react";
import { createPublicClient, isPublicDataConfigured } from "@/src/lib/supabase/server";

// Public reads use the publishable key, so row level security returns only
// published careers and companies. Builds without Supabase settings (CI) get an
// empty directory instead of failing.

export async function getCareerRoles() {
  if (!isPublicDataConfigured()) return [];
  const { data, error } = await createPublicClient()
    .from("career_roles")
    .select("slug, name, summary")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load careers: ${error.message}`);
  return data;
}

export const getCareerRole = cache(async (slug: string) => {
  if (!isPublicDataConfigured()) return null;
  const { data, error } = await createPublicClient()
    .from("career_roles")
    .select("slug, name, summary, guide, enquiry, career_companies(id, name, careers_url, note, sort_order)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the career: ${error.message}`);
  if (!data) return null;
  const companies = [...data.career_companies].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return { ...data, career_companies: companies };
});

export async function getCareerSlugs() {
  if (!isPublicDataConfigured()) return [];
  const { data, error } = await createPublicClient().from("career_roles").select("slug, updated_at");
  if (error) throw new Error(`Couldn't load careers: ${error.message}`);
  return data;
}
