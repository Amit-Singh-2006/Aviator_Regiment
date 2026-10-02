import "server-only";
import type { Json } from "@/src/db/database.types";
import type { AuthClient } from "@/src/lib/supabase/auth";

// Records an admin change in public.audit_log. A failed write is logged rather
// than failing the change the admin already made.
export async function recordAudit(supabase: AuthClient, entry: { actor_id: string; action: string; entity: string; entity_id?: string | null; details?: Json }) {
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) console.error("Audit log write failed", entry.action, error.message);
}
