"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/src/components/admin/action-form";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { adminErrorMessage } from "@/src/lib/supabase/errors";
import { sessionStatusLabels, type ExamSessionStatus, type ExamSessionType } from "@/src/modules/exam-sessions/sessions";

const sessionTypes: ExamSessionType[] = ["OLODE", "REGULAR"];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export async function saveSession(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const sessionType = String(formData.get("sessionType") ?? "") as ExamSessionType;
  const status = String(formData.get("status") ?? "") as ExamSessionStatus;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (name.length < 3 || name.length > 60) return { error: "Give the session a name of 3–60 characters, e.g. FC OLODE 05." };
  if (!sessionTypes.includes(sessionType)) return { error: "Choose OLODE or Regular." };
  if (!(status in sessionStatusLabels)) return { error: "Choose a status." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) return { error: "Order must be a whole number from 0 to 999." };

  const values = { name, session_type: sessionType, status, sort_order: sortOrder };
  const newId = slugify(name);
  if (!id && !newId) return { error: "Use letters or numbers in the session name." };
  const { error } = id
    ? await supabase.from("exam_sessions").update(values).eq("id", id)
    : await supabase.from("exam_sessions").insert({ id: newId, ...values });
  if (error) return { error: error.code === "23505" ? "A session with this name already exists." : adminErrorMessage(error) };

  await supabase.from("audit_log").insert({ actor_id: userId, action: id ? "session.updated" : "session.created", entity: "exam_session", entity_id: id || newId, details: values });
  revalidatePath("/admin", "layout");
  return { ok: id ? "Session saved." : `${name} added.` };
}

export async function savePrices(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const prices = sessionTypes.map((type) => ({ session_type: type, amount_inr: Number(formData.get(type)) }));
  if (prices.some((price) => !Number.isInteger(price.amount_inr) || price.amount_inr < 1 || price.amount_inr > 100000)) {
    return { error: "Prices must be whole rupees between ₹1 and ₹1,00,000." };
  }

  for (const price of prices) {
    const { error } = await supabase.from("rental_prices").update({ amount_inr: price.amount_inr }).eq("session_type", price.session_type);
    if (error) return { error: adminErrorMessage(error) };
  }
  await supabase.from("audit_log").insert({ actor_id: userId, action: "prices.updated", entity: "rental_prices", details: Object.fromEntries(prices.map((price) => [price.session_type, price.amount_inr])) });
  revalidatePath("/admin", "layout");
  return { ok: "Prices saved. New bookings use them straight away; existing bookings keep the price they were booked at." };
}
