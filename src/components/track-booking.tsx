"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { isValidEmail, isValidPhone } from "@/src/modules/bookings/validation";

const milestones = ["Booking confirmed", "CX-3 assigned", "Dispatched", "In transit", "Out for delivery", "Delivered"];

// Reads ?booking= (linked from the booking confirmation) to prefill the form.
export function TrackBookingFromLink() {
  const initialBookingId = useSearchParams().get("booking") ?? "";
  return <TrackBooking key={initialBookingId} initialBookingId={initialBookingId} />;
}

export function TrackBooking({ initialBookingId = "" }: { initialBookingId?: string }) {
  const [bookingId, setBookingId] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = normalizeBookingId(String(form.get("bookingId") ?? ""));
    const contact = String(form.get("contact") ?? "").trim();
    if (!BOOKING_ID_PATTERN.test(id)) {
      setError("Enter the Booking ID from your confirmation, for example AR2026091842.");
      return;
    }
    if (!isValidPhone(contact) && !isValidEmail(contact)) {
      setError("Enter the phone number or email address used for the booking.");
      return;
    }
    setError("");
    setBookingId(id);
  }

  return <main className="track-page"><section className="content-hero"><div className="shell"><p className="eyebrow">Customer tracking</p><h1>Know where<br /><em>you stand.</em></h1><p>Enter your Booking ID and the phone number or email used for booking to view your delivery timeline.</p><form className="track-form" onSubmit={submit} noValidate><input name="bookingId" aria-label="Booking ID" defaultValue={initialBookingId} autoCapitalize="characters" placeholder="AR202609XXXX" /><input name="contact" aria-label="Phone number or email" autoComplete="email" placeholder="Phone number or email" /><button className="button button-primary">View tracking ↗</button></form>{error && <p className="form-error track-error" role="alert">{error}</p>}</div></section>{bookingId && <section className="section"><div className="shell tracking-card"><div className="tracking-header"><div><p className="eyebrow">Demo tracking record</p><h2>{bookingId}</h2></div><span className="status-pill">In transit</span></div><div className="timeline">{milestones.map((item, index) => <div className={index < 4 ? "timeline-item complete" : "timeline-item"} key={item}><i /><div><strong>{item}</strong><p>{index < 4 ? "Updated in the demo timeline" : "Waiting for the next update"}</p></div></div>)}</div><p className="demo-note">Tracking is currently a frontend demonstration. Live verification and shipment data will be enabled after database integration. For a real update, <a href={whatsappLink(whatsappMessages.bookingUpdate(bookingId))} target="_blank" rel="noreferrer">message us on WhatsApp</a>.</p></div></section>}</main>;
}
