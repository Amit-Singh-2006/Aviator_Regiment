"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { RazorpayCheckout } from "@/src/components/razorpay-checkout";
import { UpiPaymentDetails } from "@/src/components/upi-payment-details";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { keepUntilDate } from "@/src/modules/bookings/rental-period";
import { bookingStatusLabels, deliveryMilestones, depositStatusLabels, hasReached, paymentStatusLabels, returnMilestones } from "@/src/modules/bookings/tracking";
import type { BookingStatus, TrackedBooking, TrackedShipment } from "@/src/modules/bookings/tracking";
import { isValidEmail, isValidPhone, normalizePhone, validateImageFile } from "@/src/modules/bookings/validation";
import { formatInr } from "@/src/modules/exam-sessions/sessions";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const formatDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : null);

function Timeline({ status, milestones }: { status: BookingStatus; milestones: BookingStatus[] }) {
  return <div className="timeline">{milestones.map((milestone) => {
    const done = hasReached(status, milestone);
    return <div className={done ? "timeline-item complete" : "timeline-item"} key={milestone}><i /><div><strong>{bookingStatusLabels[milestone]}</strong><p>{done ? (milestone === status ? "Current status" : "Done") : "Waiting for this step"}</p></div></div>;
  })}</div>;
}

function ShipmentDetails({ shipment, label }: { shipment?: TrackedShipment; label: string }) {
  if (!shipment || (!shipment.courier && !shipment.awbNumber && !shipment.trackingUrl)) return null;
  const rows = [
    ["Courier", shipment.courier],
    ["AWB / tracking / order ID", shipment.awbNumber],
    ["Dispatched", formatDate(shipment.dispatchDate)],
    ["Pickup date", formatDate(shipment.pickupDate)],
    ["Expected delivery", formatDate(shipment.expectedDeliveryDate)],
    ["Received", formatDate(shipment.receivedDate)],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return <div className="shipment-details">
    <p className="eyebrow">{label}</p>
    <dl>{rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
    {shipment.trackingUrl && <a className="button button-primary" href={shipment.trackingUrl} target="_blank" rel="noreferrer">Track shipment ↗</a>}
  </div>;
}

// Lets a customer pay (online, or by UPI with a screenshot) after leaving the booking
// flow, or try again after a payment was rejected.
function PaymentPanel({ booking, contact, onlinePayments, onUploaded }: { booking: TrackedBooking; contact: string; onlinePayments: boolean; onUploaded: () => Promise<void> }) {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  // The rental and the refundable deposit are paid together.
  const amount = formatInr(booking.amountInr + booking.depositInr);
  const rejected = booking.paymentStatus === "rejected";

  async function upload() {
    const fileError = validateImageFile(screenshot, "Choose your payment screenshot to upload.");
    if (fileError || !screenshot) {
      setMessage(fileError ?? "");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const body = new FormData();
    body.set("contact", contact);
    body.set("screenshot", screenshot);
    try {
      const response = await fetch(`/api/bookings/${booking.bookingCode}/payment-proof`, { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.message ?? "We couldn't submit your screenshot. Please try again.");
        return;
      }
      await onUploaded();
    } catch {
      setMessage("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="upi-card track-payment">
    <p className="eyebrow">{rejected ? "Payment not verified" : "Complete your payment"}</p>
    {rejected
      ? <p className="form-error">We couldn&apos;t verify your payment{booking.paymentNote ? `: ${booking.paymentNote}` : "."} If you haven&apos;t paid the full amount, pay it now, then upload a new screenshot.</p>
      : <p className="track-payment-intro">{onlinePayments ? "Pay online for instant confirmation, or pay by UPI and upload your payment screenshot so we can verify it." : "Pay by UPI, then upload your payment screenshot so we can verify it and confirm your booking."}</p>}
    {onlinePayments && <>
      <RazorpayCheckout bookingCode={booking.bookingCode} amountInr={booking.amountInr + booking.depositInr} contact={contact} prefill={isValidPhone(contact) ? { contact: `+91${normalizePhone(contact)}` } : { email: contact }} onPaid={onUploaded} />
      <p className="payment-divider">or pay by UPI · no fee</p>
    </>}
    <UpiPaymentDetails amount={amount} bookingId={booking.bookingCode} />
    <label className="upload-label">Payment screenshot<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setScreenshot(event.target.files?.[0] ?? null); setMessage(""); }} /><small>JPG, PNG or WebP, up to 5 MB. Stored privately and only seen by our team.</small></label>
    {message && <p className="form-error upi-error" role="alert">{message}</p>}
    <div className="upi-actions">
      <button type="button" className="button button-primary submit-button" onClick={upload} disabled={submitting}>{submitting ? "Uploading…" : "Submit payment screenshot"}</button>
      <a className="button button-ghost submit-button" href={whatsappLink(whatsappMessages.upiPayment(booking.bookingCode, booking.sessionName, amount))} target="_blank" rel="noreferrer">Share screenshot on WhatsApp ↗</a>
    </div>
  </div>;
}

// Reads ?booking= (linked from the booking confirmation) to prefill the form.
export function TrackBookingFromLink({ onlinePayments = false }: { onlinePayments?: boolean }) {
  const initialBookingId = useSearchParams().get("booking") ?? "";
  return <TrackBooking key={initialBookingId} initialBookingId={initialBookingId} onlinePayments={onlinePayments} />;
}

export function TrackBooking({ initialBookingId = "", onlinePayments = false }: { initialBookingId?: string; onlinePayments?: boolean }) {
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(bookingId: string, contactValue: string) {
    try {
      const response = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, contact: contactValue }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBooking(null);
        setError(result.message ?? "We couldn't load your booking. Please try again.");
        return;
      }
      setBooking(result as TrackedBooking);
      setContact(contactValue);
    } catch {
      setError("Network error. Check your connection and try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bookingId = normalizeBookingId(String(form.get("bookingId") ?? ""));
    const contactValue = String(form.get("contact") ?? "").trim();
    if (!BOOKING_ID_PATTERN.test(bookingId)) {
      setError("Enter the Booking ID from your confirmation, for example AR2026091842.");
      return;
    }
    if (!isValidPhone(contactValue) && !isValidEmail(contactValue)) {
      setError("Enter the phone number or email address used for the booking.");
      return;
    }

    setLoading(true);
    setError("");
    await load(bookingId, contactValue);
    setLoading(false);
  }

  const outbound = booking?.shipments.find((shipment) => shipment.direction === "outbound");
  const returnShipment = booking?.shipments.find((shipment) => shipment.direction === "return");
  const showReturn = booking ? hasReached(booking.status, "delivered") || Boolean(returnShipment) : false;

  return <main className="track-page"><section className="content-hero"><div className="shell"><p className="eyebrow">Customer tracking</p><h1>Know where<br /><em>you stand.</em></h1><p>Enter your Booking ID and the phone number or email used for booking to view your delivery timeline.</p><form className="track-form" onSubmit={submit} noValidate><input name="bookingId" aria-label="Booking ID" defaultValue={initialBookingId} autoCapitalize="characters" placeholder="AR202609XXXX" /><input name="contact" aria-label="Phone number or email" autoComplete="email" placeholder="Phone number or email" /><button className="button button-primary" disabled={loading}>{loading ? "Checking…" : "View tracking ↗"}</button></form>{error && <p className="form-error track-error" role="alert">{error}</p>}</div></section>
    {booking && <section className="section"><div className="shell tracking-card">
      <div className="tracking-header"><div><p className="eyebrow">Booking</p><h2>{booking.bookingCode}</h2></div><span className="status-pill" data-status={booking.status}>{bookingStatusLabels[booking.status]}</span></div>
      <dl className="tracking-summary">
        <div><dt>Exam session</dt><dd>{booking.sessionName}</dd></div>
        <div><dt>Payment</dt><dd>{booking.paymentStatus ? paymentStatusLabels[booking.paymentStatus] : "—"}{booking.paymentStatus === "verified" && booking.paymentMethod === "razorpay" ? " · paid online" : ""}</dd></div>
        <div><dt>Assigned CX-3</dt><dd>{booking.cx3Unit ?? "Not assigned yet"}</dd></div>
        <div><dt>Booked on</dt><dd>{formatDate(booking.createdAt)}</dd></div>
        {booking.depositInr > 0 && <div><dt>Security deposit</dt><dd>{formatInr(booking.depositInr)} · {depositStatusLabels[booking.depositStatus]}</dd></div>}
        {booking.lastExamDate && <div><dt>Keep the CX-3 until</dt><dd>{formatDate(keepUntilDate(booking.lastExamDate))}</dd></div>}
      </dl>
      {booking.status === "cancelled"
        ? <p className="demo-note">This booking has been cancelled. <a href={whatsappLink(whatsappMessages.bookingUpdate(booking.bookingCode))} target="_blank" rel="noreferrer">Message us on WhatsApp</a> if you have questions.</p>
        : <>
          {booking.status === "payment_pending" && <PaymentPanel booking={booking} contact={contact} onlinePayments={onlinePayments} onUploaded={() => load(booking.bookingCode, contact)} />}
          {booking.status === "payment_review" && <p className="tracking-note">We&apos;ve received your payment screenshot and will verify it shortly. Your booking is confirmed once the payment is verified.</p>}
          <h3 className="tracking-section-title">Delivery</h3>
          <Timeline status={booking.status} milestones={deliveryMilestones} />
          <ShipmentDetails shipment={outbound} label="Courier details" />
          {showReturn && <><h3 className="tracking-section-title">Return</h3><p className="tracking-note">{booking.lastExamDate ? `You can keep the CX-3 until ${formatDate(keepUntilDate(booking.lastExamDate))}, the day after your last exam. We arrange the return pickup then, so you don't need to book it yourself.` : "We arrange the return pickup the day after your last exam. You don't need to book it yourself."}{booking.depositInr > 0 ? " Your security deposit is refunded once the CX-3 is back with us." : ""}</p><Timeline status={booking.status} milestones={returnMilestones} /><ShipmentDetails shipment={returnShipment} label="Return courier details" /></>}
          <p className="demo-note">Questions about your booking? <a href={whatsappLink(whatsappMessages.bookingUpdate(booking.bookingCode))} target="_blank" rel="noreferrer">Message us on WhatsApp</a> with your Booking ID.</p>
        </>}
    </div></section>}
  </main>;
}
