import Link from "next/link";
import { AdminHeader, EmptyState, Panel, Pill, Tabs } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { bookingQueues, bookingTone, currentPayment, paymentTone } from "@/src/modules/bookings/admin";
import { bookingStatusLabels, paymentStatusLabels } from "@/src/modules/bookings/tracking";
import { formatInr } from "@/src/modules/exam-sessions/sessions";

export const metadata = { title: "Bookings" };

const PAGE_SIZE = 30;

type SearchParams = Promise<{ queue?: string; q?: string; page?: string }>;

export default async function BookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const queue = bookingQueues.find((item) => item.id === params.queue) ?? bookingQueues[0];
  // Only characters that are safe inside a PostgREST filter.
  const search = (params.q ?? "").replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let query = supabase
    .from("bookings")
    .select("booking_code, full_name, phone, amount_inr, deposit_inr, status, created_at, exam_sessions(name), payments(status, updated_at)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (queue.statuses.length) query = query.in("status", queue.statuses);
  if (queue.depositStatus) query = query.eq("deposit_status", queue.depositStatus);
  if (/^AR\d*$/i.test(search)) query = query.ilike("booking_code", `${search.toUpperCase()}%`);
  else if (/^[\d +]{4,}$/.test(search)) query = query.ilike("phone", `%${search.replace(/\D/g, "").slice(-10)}%`);
  else if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

  const [{ data: bookings, count, error }, ...queueCounts] = await Promise.all([
    query,
    ...bookingQueues.map((item) => {
      const countQuery = supabase.from("bookings").select("id", { count: "exact", head: true });
      return item.statuses.length ? countQuery.in("status", item.statuses) : countQuery;
    }),
  ]);

  const hrefFor = (next: { queue?: string; page?: number; q?: string }) => {
    const urlParams = new URLSearchParams();
    const queueId = next.queue ?? queue.id;
    if (queueId !== "all") urlParams.set("queue", queueId);
    const q = next.q ?? search;
    if (q) urlParams.set("q", q);
    if (next.page && next.page > 1) urlParams.set("page", String(next.page));
    const value = urlParams.toString();
    return value ? `/admin/bookings?${value}` : "/admin/bookings";
  };
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <>
    <AdminHeader eyebrow="Operations / Bookings" title="Bookings" />
    <Tabs active={queue.id} items={bookingQueues.map((item, index) => ({ id: item.id, label: item.label, href: hrefFor({ queue: item.id }), count: item.id === "all" ? undefined : queueCounts[index].count ?? 0 }))} />
    <Panel>
      <form className="admin-search" action="/admin/bookings" role="search">
        {queue.id !== "all" ? <input type="hidden" name="queue" value={queue.id} /> : null}
        <label className="visually-hidden" htmlFor="booking-search">Search bookings</label>
        <input id="booking-search" name="q" type="search" defaultValue={search} placeholder="Booking ID, phone, name or email" />
        <button className="admin-button" type="submit">Search</button>
        {search ? <Link className="admin-link" href={hrefFor({ q: "" })}>Clear</Link> : null}
      </form>
      {error ? <EmptyState>Bookings couldn&apos;t be loaded. Refresh the page to try again.</EmptyState> : !bookings?.length ? <EmptyState>{search ? "No bookings match your search." : "No bookings here yet."}</EmptyState> : <>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Customer</th><th>Session</th><th>Amount</th><th>Status</th><th>Payment</th><th>Booked</th></tr></thead>
            <tbody>{bookings.map((booking) => {
              const payment = currentPayment(booking.payments);
              return <tr key={booking.booking_code}>
                <td><Link className="row-link" href={`/admin/bookings/${booking.booking_code}`}>{booking.booking_code}</Link></td>
                <td><b>{booking.full_name}</b><small>{booking.phone}</small></td>
                <td>{booking.exam_sessions?.name ?? "—"}</td>
                <td>{formatInr(booking.amount_inr + booking.deposit_inr)}{booking.deposit_inr ? <small>incl. {formatInr(booking.deposit_inr)} deposit</small> : null}</td>
                <td><Pill tone={bookingTone(booking.status)}>{bookingStatusLabels[booking.status]}</Pill></td>
                <td>{payment ? <Pill tone={paymentTone(payment.status)}>{paymentStatusLabels[payment.status]}</Pill> : "—"}</td>
                <td>{formatDateTime(booking.created_at)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div>
            {page > 1 ? <Link className="admin-button" href={hrefFor({ page: page - 1 })}>← Newer</Link> : null}
            {page < lastPage ? <Link className="admin-button" href={hrefFor({ page: page + 1 })}>Older →</Link> : null}
          </div>
        </div>
      </>}
    </Panel>
  </>;
}
