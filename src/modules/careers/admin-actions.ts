"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/src/components/admin/action-form";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { adminErrorMessage } from "@/src/lib/supabase/errors";
import { recordAudit } from "@/src/modules/audit/record";
import { slugify } from "@/src/modules/careers/careers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sortOrder(formData: FormData) {
  const value = Number(formData.get("sortOrder") ?? 0);
  return Number.isInteger(value) && value >= 0 && value <= 999 ? value : null;
}

function refreshCareers(...slugs: (string | null | undefined)[]) {
  revalidatePath("/admin", "layout");
  revalidatePath("/careers");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/careers/${slug}`);
}

export async function saveCareerRole(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = text(formData, "name", 80);
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const summary = text(formData, "summary", 300);
  const enquiry = text(formData, "enquiry", 120);
  const guide = String(formData.get("guide") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 20000);
  const order = sortOrder(formData);

  if (id && !UUID_PATTERN.test(id)) return { error: "Invalid request." };
  if (name.length < 2) return { error: "Give the career a name." };
  if (slug.length < 2) return { error: "Add a URL slug using letters or numbers." };
  if (enquiry.length < 2) return { error: "Add the WhatsApp enquiry text, e.g. “becoming a commercial pilot”." };
  if (order === null) return { error: "Order must be a whole number from 0 to 999." };

  const values = { name, slug, summary, enquiry, guide: guide || null, sort_order: order, published: formData.get("published") === "on" };
  if (id) {
    const { data: previous } = await supabase.from("career_roles").select("slug").eq("id", id).maybeSingle();
    if (!previous) return { error: "That career no longer exists." };
    const { error } = await supabase.from("career_roles").update(values).eq("id", id);
    if (error) return { error: error.code === "23505" ? "Another career already uses this URL slug." : adminErrorMessage(error) };
    await recordAudit(supabase, { actor_id: userId, action: "career_role.updated", entity: "career_role", entity_id: id, details: { name } });
    refreshCareers(previous.slug, slug);
    return { ok: "Career saved." };
  }

  const { data, error } = await supabase.from("career_roles").insert(values).select("id").single();
  if (error) return { error: error.code === "23505" ? "A career with this name or URL slug already exists." : adminErrorMessage(error) };
  await recordAudit(supabase, { actor_id: userId, action: "career_role.created", entity: "career_role", entity_id: data.id, details: { name } });
  refreshCareers(slug);
  redirect(`/admin/careers/${data.id}`);
}

export async function deleteCareerRole(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return { error: "Invalid request." };
  const { data: role, error } = await supabase.from("career_roles").delete().eq("id", id).select("name, slug").maybeSingle();
  if (error) return { error: adminErrorMessage(error) };
  await recordAudit(supabase, { actor_id: userId, action: "career_role.deleted", entity: "career_role", entity_id: id, details: { name: role?.name ?? null } });
  refreshCareers(role?.slug);
  redirect("/admin/careers");
}

export async function saveCareerCompany(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const name = text(formData, "name", 80);
  const careersUrl = text(formData, "careersUrl", 500);
  const note = text(formData, "note", 120);
  const order = sortOrder(formData);

  if ((id && !UUID_PATTERN.test(id)) || !UUID_PATTERN.test(roleId)) return { error: "Invalid request." };
  if (name.length < 2) return { error: "Add the company name." };
  if (!/^https:\/\/\S+$/.test(careersUrl)) return { error: "Paste the company's careers page link, starting with https://." };
  if (order === null) return { error: "Order must be a whole number from 0 to 999." };

  const { data: role } = await supabase.from("career_roles").select("slug").eq("id", roleId).maybeSingle();
  if (!role) return { error: "That career no longer exists." };

  const values = { name, careers_url: careersUrl, note: note || null, sort_order: order, published: formData.get("published") === "on" };
  const { error } = id
    ? await supabase.from("career_companies").update(values).eq("id", id).eq("role_id", roleId)
    : await supabase.from("career_companies").insert({ role_id: roleId, ...values });
  if (error) return { error: error.code === "23505" ? `${name} is already listed for this career.` : adminErrorMessage(error) };

  await recordAudit(supabase, { actor_id: userId, action: id ? "career_company.updated" : "career_company.added", entity: "career_role", entity_id: roleId, details: { name } });
  refreshCareers(role.slug);
  return { ok: id ? "Company saved." : `${name} added.` };
}

export async function deleteCareerCompany(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(roleId)) return { error: "Invalid request." };

  const { data: company, error } = await supabase.from("career_companies").delete().eq("id", id).eq("role_id", roleId).select("name").maybeSingle();
  if (error) return { error: adminErrorMessage(error) };
  const { data: role } = await supabase.from("career_roles").select("slug").eq("id", roleId).maybeSingle();
  await recordAudit(supabase, { actor_id: userId, action: "career_company.removed", entity: "career_role", entity_id: roleId, details: { name: company?.name ?? null } });
  refreshCareers(role?.slug);
  return { ok: "Company removed." };
}
