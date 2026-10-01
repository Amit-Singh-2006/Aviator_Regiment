import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/src/lib/supabase/server";
import type { ExamSession } from "@/src/modules/exam-sessions/sessions";

// Sessions that are not hidden, with their current price, in display order.
export const getVisibleSessions = cache(async (): Promise<ExamSession[]> => {
  const { data, error } = await createPublicClient()
    .from("exam_sessions")
    .select("id, name, session_type, status, rental_prices(amount_inr)")
    .neq("status", "hidden")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`Could not load exam sessions: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.session_type,
    status: row.status,
    priceInr: row.rental_prices.amount_inr,
  }));
});

export async function findSession(id: string) {
  const sessions = await getVisibleSessions();
  return sessions.find((session) => session.id === id) ?? null;
}
