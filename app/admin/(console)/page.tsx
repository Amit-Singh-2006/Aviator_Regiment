import Link from "next/link";
import { AdminHeader, EmptyState, Panel, Pill } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { bookingTone, depositRefundStatuses } from "@/src/modules/bookings/admin";
import { bookingStatusLabels, type BookingStatus } from "@/src/modules/bookings/tracking";
import { formatInr } from "@/src/modules/exam-sessions/sessions";
import { newsCategoryLabels } from "@/src/modules/news/categories";

export const metadata = { title: "Overview" };

const todo: Partial<Record<BookingStatus, string>> = {
  payment_review: "Verify payment",
  confirmed: "Assign a CX-3",
  cx3_assigned: "Dispatch",
  cx3_received: "Check and close",
};

export default async function OverviewPage() {
  const { supabase, name } = await requireAdmin();
  const countBookings = (statuses: BookingStatus[]) => supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", statuses);

  const [deposits, verify, assign, ship, out, returns, unitsAvailable, units, drafts, { data: attention }, { data: recent }, { data: newsDrafts }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("deposit_status", "held").in("status", depositRefundStatuses),
    countBookings(["payment_review"]),
    countBookings(["confirmed"]),
    countBookings(["cx3_assigned"]),
    countBookings(["dispatched", "in_transit", "out_for_delivery", "delivered"]),
    countBookings(["return_pickup_scheduled", "return_in_transit", "cx3_received"]),
    supabase.from("cx3_units").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("cx3_units").select("id", { count: "exact", head: true }).neq("status", "retired"),
    supabase.from("news_articles").select("id", { count: "exact", head: true }).in("status", ["draft", "review"]),
    supabase.from("bookings").select("booking_code, full_name, status, updated_at, exam_sessions(name)").in("status", Object.keys(todo) as BookingStatus[]).order("updated_at").limit(10),
    supabase.from("bookings").select("booking_code, full_name, amount_inr, deposit_inr, status, created_at, exam_sessions(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("news_articles").select("id, title, source_title, category, created_at").in("status", ["draft", "review"]).order("created_at", { ascending: false }).limit(5),
  ]);

  const metrics = [
    { label: "Payments to verify", value: verify.count, href: "/admin/bookings?queue=verify", urgent: true },
    { label: "Assign CX-3", value: assign.count, href: "/admin/bookings?queue=assign", urgent: true },
    { label: "Ready to ship", value: ship.count, href: "/admin/bookings?queue=ship", urgent: true },
    { label: "With customers", value: out.count, href: "/admin/bookings?queue=out" },
    { label: "Returns in progress", value: returns.count, href: "/admin/bookings?queue=returns" },
    { label: "Deposits to refund", value: deposits.count, href: "/admin/bookings?queue=deposits", urgent: true },
    { label: `CX-3 available (of ${units.count ?? 0})`, value: unitsAvailable.count, href: "/admin/units" },
    { label: "News drafts to review", value: drafts.count, href: "/admin/news" },
  ];

  return <>
    <AdminHeader eyebrow="Operations / Overview" title={`Hello, ${name.split(" ")[0]}`} />
    <div className="metric-grid">
      {metrics.map((metric) => <Link key={metric.label} href={metric.href} className={metric.urgent && metric.value ? "urgent" : undefined}>
        <span>{metric.label}</span><strong>{metric.value ?? 0}</strong>
      </Link>)}
    </div>
    <div className="admin-columns">
      <Panel title="Needs attention" actions={<Link className="admin-link" href="/admin/bookings">All bookings →</Link>}>
        {attention?.length ? <ul className="task-list">{attention.map((booking) => <li key={booking.booking_code}>
          <Link href={`/admin/bookings/${booking.booking_code}`}>
            <b>{todo[booking.status]}</b>
            <span>{booking.booking_code} · {booking.full_name} · {booking.exam_sessions?.name}</span>
            <small>Waiting since {formatDateTime(booking.updated_at)}</small>
          </Link>
        </li>)}</ul> : <EmptyState>Nothing waiting on you. New payments and dispatches show up here.</EmptyState>}
      </Panel>
      <Panel title="News drafts" actions={<Link className="admin-link" href="/admin/news">Review news →</Link>}>
        {newsDrafts?.length ? <ul className="task-list">{newsDrafts.map((article) => <li key={article.id}>
          <Link href={`/admin/news/${article.id}`}>
            <b>{article.title ?? article.source_title}</b>
            <span>{newsCategoryLabels[article.category]}</span>
            <small>Collected {formatDateTime(article.created_at)}</small>
          </Link>
        </li>)}</ul> : <EmptyState>No drafts waiting. New AI drafts arrive every 3 hours.</EmptyState>}
      </Panel>
    </div>
    <Panel title="Latest bookings">
      {recent?.length ? <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Customer</th><th>Session</th><th>Amount</th><th>Status</th><th>Booked</th></tr></thead>
          <tbody>{recent.map((booking) => <tr key={booking.booking_code}>
            <td><Link className="row-link" href={`/admin/bookings/${booking.booking_code}`}>{booking.booking_code}</Link></td>
            <td>{booking.full_name}</td>
            <td>{booking.exam_sessions?.name ?? "—"}</td>
            <td>{formatInr(booking.amount_inr + booking.deposit_inr)}</td>
            <td><Pill tone={bookingTone(booking.status)}>{bookingStatusLabels[booking.status]}</Pill></td>
            <td>{formatDateTime(booking.created_at)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState>No bookings yet.</EmptyState>}
    </Panel>
  </>;
}
