import Link from "next/link";
import { notFound } from "next/navigation";
import { AadhaarReveal } from "@/src/components/admin/aadhaar-reveal";
import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel, Pill } from "@/src/components/admin/admin-ui";
import { formatDate, formatDateTime, todayInIndia } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { BOOKING_DOCUMENTS_BUCKET } from "@/src/lib/supabase/server";
import { assignUnit, markCx3Lost, refundDeposit, reviewPayment, saveAdminNotes, saveShipment, setBookingStatus } from "@/src/modules/bookings/admin-actions";
import { adminDepositLabels, bookingTone, couriers, currentPayment, customerWhatsappLink, cx3OutStatuses, depositRefundStatuses, depositTone, outboundStatuses, paymentTone, returnStatuses, shipmentStatusLabels, type ShipmentDirection, type ShipmentStatus } from "@/src/modules/bookings/admin";
import { keepUntilDate } from "@/src/modules/bookings/rental-period";
import { describeAction, describeDetails } from "@/src/modules/audit/labels";
import { BOOKING_ID_PATTERN } from "@/src/modules/bookings/booking-id";
import { bookingStatusLabels, hasReached, paymentStatusLabels, type BookingStatus } from "@/src/modules/bookings/tracking";
import { maskAadhaar } from "@/src/modules/bookings/validation";
import { formatInr } from "@/src/modules/exam-sessions/sessions";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  return { title: (await params).code };
}

type Shipment = {
  status: ShipmentStatus;
  courier: string | null;
  awb_number: string | null;
  tracking_url: string | null;
  dispatch_date: string | null;
  pickup_date: string | null;
  expected_delivery_date: string | null;
  received_date: string | null;
};

type DepositInfo = { amount: string; held: boolean; keepUntil: string | null };

function nextStep(status: BookingStatus, amount: string, deposit: DepositInfo, unitCode?: string) {
  switch (status) {
    case "payment_pending": return `Waiting for the customer to pay ${amount} online, or by UPI with a screenshot. If they sent a UPI screenshot on WhatsApp instead, check it in your UPI app and verify the payment.`;
    case "payment_review": return `Check the screenshot against your UPI app. If ${amount} has arrived, verify the payment. Otherwise reject it with a reason.`;
    case "confirmed": return "Payment is verified. Assign a CX-3 unit.";
    case "cx3_assigned": return `Pack ${unitCode ?? "the CX-3"} and add the courier details once it's dispatched.`;
    case "dispatched":
    case "in_transit":
    case "out_for_delivery": return "Update the delivery status as the courier moves it. The customer sees each update on the tracking page.";
    case "delivered": return deposit.keepUntil
      ? `The customer keeps the CX-3 until ${deposit.keepUntil} (the day after their last exam). Schedule the return pickup for then.`
      : "Schedule the return pickup for the day after the customer's last exam.";
    case "return_pickup_scheduled":
    case "return_in_transit": return "Update the return as it moves. Mark it received when the CX-3 is back with you.";
    case "cx3_received": return deposit.held
      ? `Check the CX-3 is complete and working, refund the ${deposit.amount} deposit, then close the booking.`
      : "Check the CX-3 is complete and working, then close the booking.";
    case "closed": return deposit.held ? `This booking is closed, but the ${deposit.amount} deposit still needs to be refunded.` : "This booking is complete.";
    case "cancelled": return deposit.held ? `This booking was cancelled. Refund the ${deposit.amount} deposit the customer paid.` : "This booking was cancelled.";
  }
}

function ShipmentSummary({ direction, shipment }: { direction: ShipmentDirection; shipment?: Shipment }) {
  if (!shipment) return <p className="admin-muted">Nothing recorded.</p>;
  return <dl className="admin-dl">
    <div><dt>Courier</dt><dd>{shipment.courier ?? "—"}</dd></div>
    <div><dt>AWB / order ID</dt><dd>{shipment.awb_number ?? "—"}</dd></div>
    {direction === "outbound" ? <>
      <div><dt>Dispatched</dt><dd>{formatDate(shipment.dispatch_date)}</dd></div>
      <div><dt>Expected delivery</dt><dd>{formatDate(shipment.expected_delivery_date)}</dd></div>
    </> : <>
      <div><dt>Pickup</dt><dd>{formatDate(shipment.pickup_date)}</dd></div>
      <div><dt>Received</dt><dd>{formatDate(shipment.received_date)}</dd></div>
    </>}
  </dl>;
}

function ShipmentForm({ code, direction, shipment }: { code: string; direction: ShipmentDirection; shipment?: Shipment }) {
  const statuses = direction === "return" ? returnStatuses : outboundStatuses;
  const defaultStatus = shipment?.status ?? (direction === "return" ? "pickup_scheduled" : "dispatched");
  return <ActionForm action={saveShipment} className="admin-form">
    <input type="hidden" name="bookingCode" value={code} />
    <input type="hidden" name="direction" value={direction} />
    <div className="form-grid">
      <label>Status<select name="status" defaultValue={defaultStatus}>{statuses.map((status) => <option key={status} value={status}>{shipmentStatusLabels[status]}</option>)}</select></label>
      <label>Courier<input name="courier" list="courier-list" defaultValue={shipment?.courier ?? ""} /></label>
      <label>AWB / order ID<input name="awbNumber" defaultValue={shipment?.awb_number ?? ""} /></label>
      <label>Tracking link<input name="trackingUrl" type="url" placeholder="https://" defaultValue={shipment?.tracking_url ?? ""} /></label>
      {direction === "outbound" ? <>
        <label>Dispatch date<input name="dispatchDate" type="date" defaultValue={shipment ? shipment.dispatch_date ?? "" : todayInIndia()} /></label>
        <label>Expected delivery<input name="expectedDeliveryDate" type="date" defaultValue={shipment?.expected_delivery_date ?? ""} /></label>
      </> : <>
        <label>Pickup date<input name="pickupDate" type="date" defaultValue={shipment?.pickup_date ?? ""} /></label>
        <label>Received date<input name="receivedDate" type="date" defaultValue={shipment?.received_date ?? ""} /></label>
      </>}
    </div>
    <button className="admin-button primary" type="submit">{direction === "return" ? "Save return" : "Save delivery"}</button>
  </ActionForm>;
}

export default async function BookingDetailPage({ params }: { params: Params }) {
  const { supabase } = await requireAdmin();
  const { code } = await params;
  if (!BOOKING_ID_PATTERN.test(code)) notFound();

  const [{ data: booking }, { data: units }, { data: history }, { data: admins }] = await Promise.all([
    supabase.from("bookings").select(`
      booking_code, status, amount_inr, full_name, phone, email, delivery_address, aadhaar_number, dgca_number,
      photo_path, terms_version, terms_accepted_at, admin_notes, created_at,
      deposit_inr, deposit_status, deposit_settled_at, deposit_note, last_exam_date,
      exam_sessions(name, session_type),
      payments(method, status, amount_inr, gateway_fee_inr, screenshot_path, submitted_at, reviewed_at, rejection_reason, razorpay_order_id, razorpay_payment_id, updated_at),
      cx3_assignments(assigned_at, released_at, cx3_units(unit_code)),
      shipments(direction, status, courier, awb_number, tracking_url, dispatch_date, pickup_date, expected_delivery_date, received_date)
    `).eq("booking_code", code).maybeSingle(),
    supabase.from("cx3_units").select("id, unit_code").eq("status", "available").order("unit_code"),
    supabase.from("audit_log").select("id, action, actor_id, details, created_at").eq("entity", "booking").eq("entity_id", code).order("created_at", { ascending: false }).limit(50),
    supabase.from("admin_users").select("user_id, full_name"),
  ]);
  if (!booking) notFound();

  const payment = currentPayment(booking.payments);
  const paidOnline = payment?.method === "razorpay";
  const activeUnit = booking.cx3_assignments.find((assignment) => !assignment.released_at);
  const lastUnit = activeUnit ?? [...booking.cx3_assignments].sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0];
  const outbound = booking.shipments.find((shipment) => shipment.direction === "outbound");
  const inbound = booking.shipments.find((shipment) => shipment.direction === "return");
  const isFinal = booking.status === "closed" || booking.status === "cancelled";
  // Matches public.admin_set_booking_status: a booking can only be cancelled before the CX-3 leaves.
  const canCancel = ["payment_pending", "payment_review", "confirmed", "cx3_assigned"].includes(booking.status);
  // What the customer pays: the rental plus the refundable deposit.
  const amount = formatInr(booking.amount_inr + booking.deposit_inr);
  const depositAmount = formatInr(booking.deposit_inr);
  const keepUntil = booking.last_exam_date ? keepUntilDate(booking.last_exam_date) : null;
  const depositHeld = booking.deposit_status === "held";
  const canRefundDeposit = depositHeld && depositRefundStatuses.includes(booking.status);
  const canMarkLost = cx3OutStatuses.includes(booking.status);
  const adminNames = new Map((admins ?? []).map((admin) => [admin.user_id, admin.full_name ?? "Admin"]));

  const documentPaths = [booking.photo_path, payment?.screenshot_path].filter((path): path is string => Boolean(path));
  const { data: signedUrls } = await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).createSignedUrls(documentPaths, 600);
  const signedUrl = (path?: string | null) => (path ? signedUrls?.find((item) => item.path === path)?.signedUrl ?? null : null);
  const photoUrl = signedUrl(booking.photo_path);
  const screenshotUrl = signedUrl(payment?.screenshot_path);
  const firstName = booking.full_name.split(" ")[0];
  const canAssign = booking.status === "confirmed" || booking.status === "cx3_assigned";
  const canReturn = hasReached(booking.status, "delivered") || Boolean(inbound);

  return <>
    <Link className="admin-back" href="/admin/bookings">← All bookings</Link>
    <AdminHeader eyebrow={`${booking.exam_sessions?.name ?? "Booking"} · ${formatInr(booking.amount_inr)} rental${booking.deposit_inr ? ` + ${depositAmount} deposit` : ""}`} title={booking.booking_code}>
      <Pill tone={bookingTone(booking.status)}>{bookingStatusLabels[booking.status]}</Pill>
    </AdminHeader>
    <p className="next-step"><b>Next step</b>{nextStep(booking.status, amount, { amount: depositAmount, held: depositHeld, keepUntil: keepUntil ? formatDate(keepUntil) : null }, lastUnit?.cx3_units?.unit_code)}</p>

    <div className="admin-columns">
      <div className="admin-stack">
        <Panel title="Payment" actions={payment ? <Pill tone={paymentTone(payment.status)}>{paymentStatusLabels[payment.status]}</Pill> : null}>
          {payment ? <>
            <dl className="admin-dl">
              <div><dt>Method</dt><dd>{payment.method === "upi" ? "UPI" : "Razorpay"}</dd></div>
              <div><dt>Amount</dt><dd>{formatInr(payment.amount_inr)}{payment.gateway_fee_inr ? ` (incl. ${formatInr(payment.gateway_fee_inr)} gateway fee)` : ""}</dd></div>
              {paidOnline ? <>
                <div><dt>Paid</dt><dd>{formatDateTime(payment.submitted_at)}</dd></div>
                <div><dt>Razorpay payment ID</dt><dd>{payment.razorpay_payment_id ?? "Not paid yet"}</dd></div>
                <div className="wide"><dt>Razorpay order ID</dt><dd>{payment.razorpay_order_id}</dd></div>
              </> : <>
                <div><dt>Screenshot uploaded</dt><dd>{formatDateTime(payment.submitted_at)}</dd></div>
                <div><dt>Reviewed</dt><dd>{formatDateTime(payment.reviewed_at)}</dd></div>
              </>}
              {payment.rejection_reason ? <div className="wide"><dt>Rejection reason</dt><dd>{payment.rejection_reason}</dd></div> : null}
            </dl>
            {screenshotUrl ? <a className="document-preview" href={screenshotUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img src={screenshotUrl} alt={`UPI payment screenshot for ${booking.booking_code}`} />
              <span>Open full screenshot ↗</span>
            </a> : paidOnline ? <p className="admin-muted">{payment.status === "verified" ? "Paid online. Razorpay confirmed the payment, so there is nothing to check." : "The customer opened online payment but hasn't paid yet. If they paid by UPI instead, verify it below."}</p> : <p className="admin-muted">No screenshot uploaded on the website yet. Customers may send it on WhatsApp instead.</p>}
            {!isFinal && payment.status !== "verified" ? <ActionForm action={reviewPayment} className="admin-form review-form">
              <input type="hidden" name="bookingCode" value={booking.booking_code} />
              <label>Reason (needed to reject)<input name="reason" maxLength={300} placeholder="e.g. Amount received doesn't match" /></label>
              <div className="button-row">
                <button className="admin-button primary" type="submit" name="decision" value="verify" data-confirm={`Confirm ${amount} for ${booking.booking_code} has arrived in your UPI account?`}>Verify payment</button>
                <button className="admin-button danger" type="submit" name="decision" value="reject" data-confirm="Reject this payment? The booking goes back to awaiting payment.">Reject</button>
              </div>
            </ActionForm> : null}
            {payment.status === "rejected" ? <a className="admin-link" href={customerWhatsappLink(booking.phone, `Hi ${firstName}, this is Aviator's Regiment about your CX-3 booking ${booking.booking_code}. We couldn't verify your UPI payment${payment.rejection_reason ? `: ${payment.rejection_reason}` : ""}. Please send the correct payment screenshot here.`)} target="_blank" rel="noreferrer">Message the customer on WhatsApp ↗</a> : null}
          </> : <EmptyState>No payment record.</EmptyState>}
        </Panel>

        {booking.deposit_inr === 0 ? <Panel title="Security deposit">
          <p className="admin-muted">No security deposit on this booking. It was made before deposits were introduced.</p>
        </Panel> : <Panel title="Security deposit" actions={<Pill tone={depositTone(booking.deposit_status)}>{adminDepositLabels[booking.deposit_status]}</Pill>}>
          <dl className="admin-dl">
            <div><dt>Amount</dt><dd>{depositAmount}</dd></div>
            <div><dt>{booking.deposit_status === "forfeited" ? "Kept on" : "Refunded on"}</dt><dd>{formatDateTime(booking.deposit_settled_at)}</dd></div>
            {booking.deposit_note ? <div className="wide"><dt>Note</dt><dd>{booking.deposit_note}</dd></div> : null}
          </dl>
          {canRefundDeposit ? <ActionForm action={refundDeposit} className="admin-form">
            <input type="hidden" name="bookingCode" value={booking.booking_code} />
            <label>Refund reference (optional)<input name="note" maxLength={300} placeholder="e.g. UPI reference number" /></label>
            <button className="admin-button primary" type="submit" data-confirm={`Confirm you've sent the ${depositAmount} deposit back to ${firstName}?`}>Mark deposit refunded</button>
          </ActionForm> : depositHeld ? <p className="admin-muted">Refund it once the CX-3 is received back (or if the booking is cancelled).</p>
            : booking.deposit_status === "unpaid" ? <p className="admin-muted">Paid together with the rental. It&apos;s held once the payment is verified.</p> : null}
          {canMarkLost ? <details className="advanced">
            <summary>CX-3 lost?</summary>
            <ActionForm action={markCx3Lost} className="admin-form">
              <input type="hidden" name="bookingCode" value={booking.booking_code} />
              <label>What happened<input name="note" maxLength={300} required placeholder="e.g. Customer reported it lost on 12 Oct" /></label>
              <button className="admin-button danger" type="submit" data-confirm={`Record the CX-3 on ${booking.booking_code} as lost? Under the Terms nothing is refunded: the ${depositAmount} deposit is kept, the booking closes and the unit is retired.`}>Record CX-3 as lost</button>
            </ActionForm>
          </details> : null}
        </Panel>}

        <Panel title="Customer">
          <dl className="admin-dl">
            <div><dt>Name</dt><dd>{booking.full_name}</dd></div>
            <div><dt>Phone</dt><dd><a href={`tel:+91${booking.phone}`}>{booking.phone}</a> · <a className="admin-link" href={customerWhatsappLink(booking.phone, `Hi ${firstName}, this is Aviator's Regiment about your CX-3 booking ${booking.booking_code}.`)} target="_blank" rel="noreferrer">WhatsApp ↗</a></dd></div>
            <div className="wide"><dt>Email</dt><dd><a href={`mailto:${booking.email}`}>{booking.email}</a></dd></div>
            <div className="wide"><dt>Delivery address</dt><dd className="pre-line">{booking.delivery_address}</dd></div>
            <div><dt>Aadhaar</dt><dd><AadhaarReveal bookingCode={booking.booking_code} masked={maskAadhaar(booking.aadhaar_number)} /></dd></div>
            <div><dt>DGCA computer number</dt><dd>{booking.dgca_number}</dd></div>
            <div><dt>Session</dt><dd>{booking.exam_sessions?.name ?? "—"} ({booking.exam_sessions?.session_type === "OLODE" ? "OLODE" : "Regular"})</dd></div>
            <div><dt>Booked</dt><dd>{formatDateTime(booking.created_at)}</dd></div>
            <div><dt>Last exam</dt><dd>{formatDate(booking.last_exam_date)}</dd></div>
            <div><dt>Keeps the CX-3 until</dt><dd>{formatDate(keepUntil)}</dd></div>
            <div className="wide"><dt>Terms &amp; refund policy</dt><dd>Accepted {formatDateTime(booking.terms_accepted_at)} (version {booking.terms_version})</dd></div>
          </dl>
          {photoUrl ? <a className="document-preview photo" href={photoUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
            <img src={photoUrl} alt={`Passport photo of ${booking.full_name}`} />
            <span>Passport photo ↗</span>
          </a> : null}
        </Panel>
      </div>

      <div className="admin-stack">
        <Panel title="CX-3 unit" actions={activeUnit ? <Pill tone="info">{activeUnit.cx3_units?.unit_code}</Pill> : null}>
          {lastUnit ? <p className="admin-muted">{activeUnit ? "Assigned" : `${lastUnit.cx3_units?.unit_code} was assigned`} {formatDateTime(lastUnit.assigned_at)}{activeUnit ? "" : ` and released ${formatDateTime(lastUnit.released_at)}`}.</p> : null}
          {canAssign ? units?.length ? <ActionForm action={assignUnit} className="admin-form inline-form">
            <input type="hidden" name="bookingCode" value={booking.booking_code} />
            <label>{activeUnit ? "Replace with" : "Available units"}<select name="unitId" required defaultValue="">
              <option value="" disabled>Choose a unit</option>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_code}</option>)}
            </select></label>
            <button className="admin-button primary" type="submit">{activeUnit ? "Replace unit" : "Assign"}</button>
          </ActionForm> : <p className="admin-muted">No CX-3 units are available. Add or free one on the <Link className="admin-link" href="/admin/units">CX-3 units</Link> page.</p>
            : !lastUnit ? <p className="admin-muted">{isFinal ? "No unit was assigned." : "Verify the payment before assigning a unit."}</p> : null}
        </Panel>

        <Panel title="Delivery" actions={outbound ? <Pill tone={outbound.status === "delivered" ? "good" : "info"}>{shipmentStatusLabels[outbound.status]}</Pill> : null}>
          {isFinal ? <ShipmentSummary direction="outbound" shipment={outbound} /> : activeUnit || outbound ? <ShipmentForm code={booking.booking_code} direction="outbound" shipment={outbound} /> : <p className="admin-muted">Assign a CX-3 first.</p>}
        </Panel>

        <Panel title="Return pickup" actions={inbound ? <Pill tone={inbound.status === "received" ? "good" : "info"}>{shipmentStatusLabels[inbound.status]}</Pill> : null}>
          {isFinal ? <ShipmentSummary direction="return" shipment={inbound} /> : canReturn ? <ShipmentForm code={booking.booking_code} direction="return" shipment={inbound} /> : <p className="admin-muted">Available once the CX-3 is delivered.</p>}
        </Panel>

        <Panel title="Booking status">
          <ActionForm action={setBookingStatus} className="admin-form">
            <input type="hidden" name="bookingCode" value={booking.booking_code} />
            <div className="button-row">
              {booking.status === "cx3_received" ? <button className="admin-button primary" type="submit" name="status" value="closed" data-confirm="Close this booking?">Close booking</button> : null}
              {canCancel ? <button className="admin-button danger" type="submit" name="status" value="cancelled" data-confirm="Cancel this booking? The rental is non-refundable and any assigned CX-3 is freed. Refund the deposit afterwards if it was paid.">Cancel booking</button> : null}
            </div>
          </ActionForm>
          <details className="advanced">
            <summary>Correct the status manually</summary>
            <ActionForm action={setBookingStatus} className="admin-form inline-form">
              <input type="hidden" name="bookingCode" value={booking.booking_code} />
              <label>Status<select name="status" defaultValue={booking.status}>{(Object.keys(bookingStatusLabels) as BookingStatus[]).map((status) => <option key={status} value={status}>{bookingStatusLabels[status]}</option>)}</select></label>
              <button className="admin-button" type="submit" data-confirm="Change the status? Use this only to fix a mistake.">Set status</button>
            </ActionForm>
          </details>
        </Panel>

        <Panel title="Internal notes">
          <ActionForm action={saveAdminNotes} className="admin-form">
            <input type="hidden" name="bookingCode" value={booking.booking_code} />
            <label className="visually-hidden" htmlFor="admin-notes">Internal notes</label>
            <textarea id="admin-notes" name="notes" rows={3} maxLength={2000} defaultValue={booking.admin_notes ?? ""} placeholder="Only admins see these notes" />
            <button className="admin-button" type="submit">Save notes</button>
          </ActionForm>
        </Panel>

        <Panel title="Activity">
          {history?.length ? <ol className="activity-list">{history.map((entry) => <li key={entry.id}>
            <b>{describeAction(entry.action)}</b>
            {describeDetails(entry.details) ? <span>{describeDetails(entry.details)}</span> : null}
            <small>{formatDateTime(entry.created_at)} · {entry.actor_id ? adminNames.get(entry.actor_id) ?? "Admin" : "Customer"}</small>
          </li>)}</ol> : <EmptyState>No activity yet.</EmptyState>}
        </Panel>
      </div>
    </div>
    <datalist id="courier-list">{couriers.map((courier) => <option key={courier} value={courier} />)}</datalist>
  </>;
}
