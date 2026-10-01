"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { bookingStatusLabels, deliveryMilestones, hasReached, paymentStatusLabels, returnMilestones } from "@/src/modules/bookings/tracking";
import type { BookingStatus, TrackedBooking, TrackedShipment } from "@/src/modules/bookings/tracking";
import { isValidEmail, isValidPhone } from "@/src/modules/bookings/validation";

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
    ["AWB / tracking number", shipment.awbNumber],
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

// Reads ?booking= (linked from the booking confirmation) to prefill the form.
export function TrackBookingFromLink() {
  const initialBookingId = useSearchParams().get("booking") ?? "";
  return <TrackBooking key={initialBookingId} initialBookingId={initialBookingId} />;
}

export function TrackBooking({ initialBookingId = "" }: { initialBookingId?: string }) {
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bookingId = normalizeBookingId(String(form.get("bookingId") ?? ""));
    const contact = String(form.get("contact") ?? "").trim();
    if (!BOOKING_ID_PATTERN.test(bookingId)) {
      setError("Enter the Booking ID from your confirmation, for example AR2026091842.");
      return;
    }
    if (!isValidPhone(contact) && !isValidEmail(contact)) {
      setError("Enter the phone number or email address used for the booking.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, contact }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setBooking(null);
        setError(result.message ?? "We couldn't load your booking. Please try again.");
        return;
      }
      setBooking(result as TrackedBooking);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const outbound = booking?.shipments.find((shipment) => shipment.direction === "outbound");
  const returnShipment = booking?.shipments.find((shipment) => shipment.direction === "return");
  const showReturn = booking ? hasReached(booking.status, "delivered") || Boolean(returnShipment) : false;

  return <main className="track-page"><section className="content-hero"><div className="shell"><p className="eyebrow">Customer tracking</p><h1>Know where<br /><em>you stand.</em></h1><p>Enter your Booking ID and the phone number or email used for booking to view your delivery timeline.</p><form className="track-form" onSubmit={submit} noValidate><input name="bookingId" aria-label="Booking ID" defaultValue={initialBookingId} autoCapitalize="characters" placeholder="AR202609XXXX" /><input name="contact" aria-label="Phone number or email" autoComplete="email" placeholder="Phone number or email" /><button className="button button-primary" disabled={loading}>{loading ? "Checking…" : "View tracking ↗"}</button></form>{error && <p className="form-error track-error" role="alert">{error}</p>}</div></section>
    {booking && <section className="section"><div className="shell tracking-card">
      <div className="tracking-header"><div><p className="eyebrow">Booking</p><h2>{booking.bookingCode}</h2></div><span className="status-pill" data-status={booking.status}>{bookingStatusLabels[booking.status]}</span></div>
      <dl className="tracking-summary">
        <div><dt>Exam session</dt><dd>{booking.sessionName}</dd></div>
        <div><dt>Payment</dt><dd>{booking.paymentStatus ? paymentStatusLabels[booking.paymentStatus] : "—"}</dd></div>
        <div><dt>Assigned CX-3</dt><dd>{booking.cx3Unit ?? "Not assigned yet"}</dd></div>
        <div><dt>Booked on</dt><dd>{formatDate(booking.createdAt)}</dd></div>
      </dl>
      {booking.status === "cancelled"
        ? <p className="demo-note">This booking has been cancelled. <a href={whatsappLink(whatsappMessages.bookingUpdate(booking.bookingCode))} target="_blank" rel="noreferrer">Message us on WhatsApp</a> if you have questions.</p>
        : <>
          <h3 className="tracking-section-title">Delivery</h3>
          <Timeline status={booking.status} milestones={deliveryMilestones} />
          <ShipmentDetails shipment={outbound} label="Courier details" />
          {showReturn && <><h3 className="tracking-section-title">Return</h3><p className="tracking-note">We arrange the return pickup after your exam period. You don&apos;t need to book it yourself.</p><Timeline status={booking.status} milestones={returnMilestones} /><ShipmentDetails shipment={returnShipment} label="Return courier details" /></>}
          {booking.paymentStatus === "rejected" && <p className="form-error">We couldn&apos;t verify your payment. Please message us on WhatsApp with your Booking ID.</p>}
          <p className="demo-note">Questions about your booking? <a href={whatsappLink(whatsappMessages.bookingUpdate(booking.bookingCode))} target="_blank" rel="noreferrer">Message us on WhatsApp</a> with your Booking ID.</p>
        </>}
    </div></section>}
  </main>;
}
