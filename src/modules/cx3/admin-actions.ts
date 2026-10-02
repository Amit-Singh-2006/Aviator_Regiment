"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/src/components/admin/action-form";
import type { Enums } from "@/src/db/database.types";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { adminErrorMessage } from "@/src/lib/supabase/errors";
import { recordAudit } from "@/src/modules/audit/record";

type UnitStatus = Enums<"cx3_unit_status">;

// Assigned and with-customer are set by bookings; admins only move units between these.
const manualStatuses: UnitStatus[] = ["available", "maintenance", "retired"];

export async function addUnit(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const unitCode = String(formData.get("unitCode") ?? "").trim().toUpperCase().replace(/\s+/g, "-");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300);
  if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(unitCode)) return { error: "Use a unit ID of 2–20 letters, numbers or dashes, e.g. CX3-01." };

  const { error } = await supabase.from("cx3_units").insert({ unit_code: unitCode, notes: notes || null });
  if (error) return { error: error.code === "23505" ? `${unitCode} already exists.` : adminErrorMessage(error) };
  await recordAudit(supabase, { actor_id: userId, action: "cx3.added", entity: "cx3_unit", entity_id: unitCode });
  revalidatePath("/admin", "layout");
  return { ok: `${unitCode} added.` };
}

export async function updateUnit(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as UnitStatus;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300);

  const { data: unit } = await supabase.from("cx3_units").select("unit_code, status").eq("id", id).maybeSingle();
  if (!unit) return { error: "That unit no longer exists." };
  const changesStatus = status && status !== unit.status;
  if (changesStatus && (!manualStatuses.includes(status) || !manualStatuses.includes(unit.status))) {
    return { error: "This unit is on a booking. Its status changes when the booking moves on." };
  }

  const { error } = await supabase.from("cx3_units").update({ notes: notes || null, ...(changesStatus ? { status } : {}) }).eq("id", id);
  if (error) return { error: adminErrorMessage(error) };
  if (changesStatus) await recordAudit(supabase, { actor_id: userId, action: "cx3.status_set", entity: "cx3_unit", entity_id: unit.unit_code, details: { from: unit.status, to: status } });
  revalidatePath("/admin", "layout");
  return { ok: "Unit saved." };
}
