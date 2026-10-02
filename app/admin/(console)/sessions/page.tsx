import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel } from "@/src/components/admin/admin-ui";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { deleteSession, savePrices, saveSession } from "@/src/modules/exam-sessions/admin-actions";
import type { ExamSessionStatus } from "@/src/modules/exam-sessions/sessions";

export const metadata = { title: "Sessions & prices" };

const statusOptions: { value: ExamSessionStatus; label: string; help: string }[] = [
  { value: "available", label: "Available", help: "shown and bookable" },
  { value: "sold_out", label: "Sold out", help: "shown, not bookable" },
  { value: "temporarily_unavailable", label: "Temporarily unavailable", help: "shown, not bookable" },
  { value: "hidden", label: "Hidden", help: "not shown on the website" },
];

function SessionFields({ session }: { session?: { id: string; name: string; session_type: string; status: string; sort_order: number } }) {
  return <>
    {session ? <input type="hidden" name="id" value={session.id} /> : null}
    <label>Name<input name="name" required minLength={3} maxLength={60} defaultValue={session?.name} placeholder="e.g. FC OLODE 05" /></label>
    <label>Type<select name="sessionType" defaultValue={session?.session_type ?? "OLODE"}><option value="OLODE">OLODE</option><option value="REGULAR">Regular</option></select></label>
    <label>Status<select name="status" defaultValue={session?.status ?? "hidden"}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.help})</option>)}</select></label>
    <label>Order<input name="sortOrder" type="number" min={0} max={999} step={1} defaultValue={session?.sort_order ?? 0} /></label>
  </>;
}

export default async function SessionsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: sessions }, { data: prices }] = await Promise.all([
    supabase.from("exam_sessions").select("id, name, session_type, status, sort_order, bookings(count)").order("sort_order").order("name"),
    supabase.from("rental_prices").select("session_type, amount_inr"),
  ]);
  const price = (type: string) => prices?.find((item) => item.session_type === type)?.amount_inr;

  return <>
    <AdminHeader eyebrow="Operations / Catalogue" title="Sessions & prices" />
    <div className="admin-columns wide-left">
      <div className="admin-stack">
        <Panel title="DGCA exam sessions">
          <p className="admin-muted">Customers book one session at a time. Set a session to Sold out when every CX-3 for it is booked, or Hidden until bookings open.</p>
          {sessions?.length ? <ul className="session-admin-list">{sessions.map((session) => <li key={session.id}>
            <ActionForm action={saveSession} className="admin-form session-row">
              <SessionFields session={session} />
              <button className="admin-button" type="submit">Save</button>
            </ActionForm>
            <div className="source-meta">
              <small>{session.bookings[0]?.count ?? 0} bookings · ID {session.id}</small>
              {session.bookings[0]?.count ? null : <ActionForm action={deleteSession}>
                <input type="hidden" name="id" value={session.id} />
                <button className="admin-link danger" type="submit" data-confirm={`Delete ${session.name}? This can't be undone.`}>Delete</button>
              </ActionForm>}
            </div>
          </li>)}</ul> : <EmptyState>No sessions yet. Add the first one below.</EmptyState>}
        </Panel>
        <Panel title="Add a session">
          <ActionForm action={saveSession} className="admin-form session-row">
            <SessionFields />
            <button className="admin-button primary" type="submit">Add session</button>
          </ActionForm>
        </Panel>
      </div>
      <div className="admin-stack">
        <Panel title="Rental prices">
          <p className="admin-muted">Price for the complete exam session. There is no deposit.</p>
          <ActionForm action={savePrices} className="admin-form">
            <label>OLODE session (₹)<input name="OLODE" type="number" min={1} max={100000} step={1} required defaultValue={price("OLODE")} /></label>
            <label>Regular session (₹)<input name="REGULAR" type="number" min={1} max={100000} step={1} required defaultValue={price("REGULAR")} /></label>
            <button className="admin-button primary" type="submit" data-confirm="Change the rental prices for new bookings?">Save prices</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  </>;
}
