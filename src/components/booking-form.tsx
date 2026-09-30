"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function BookingForm() {
  const selectedSession = useSearchParams().get("session") ?? "";
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setError(result.message ?? "We could not create your booking. Please check the form."); return; }
    setSubmitted(true);
  }

  if (submitted) return <div className="booking-success shell"><p className="eyebrow">Request received</p><h1>Your flight path is<br /><em>in motion.</em></h1><p>We have received your booking request. Payment options and your unique Booking ID will be available once the booking service is connected to the operational database.</p><Link className="button button-primary" href="/rent-cx3">Back to Rent CX-3</Link></div>;

  return <div className="shell booking-layout">
    <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Let&apos;s get you<br /><em>ready to fly.</em></h1><p>Tell us where to send your CX-3. We&apos;ll confirm your session and guide you through payment.</p><div className="booking-summary"><span>Selected session</span><strong>{selectedSession || "Choose a session first"}</strong><span>Security deposit</span><strong>₹0</strong></div></div>
    <form className="booking-form" onSubmit={submit} noValidate>
      <input type="hidden" name="session" value={selectedSession} />
      <label>Full name<input name="fullName" required placeholder="As on your DGCA records" /></label>
      <div className="form-row"><label>Phone number<input name="phone" required inputMode="numeric" placeholder="10-digit mobile number" /></label><label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label></div>
      <label>Full delivery address<textarea name="address" required rows={4} placeholder="House / street, city, state, PIN code" /></label>
      <label>DGCA computer / registration number<input name="dgcaNumber" required placeholder="Your relevant DGCA number" /></label>
      <label className="checkbox-label"><input name="noRefundAccepted" type="checkbox" value="true" required /><span>I understand and accept that CX-3 rental bookings are non-refundable once confirmed.</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary submit-button" disabled={loading || !selectedSession}>{loading ? "Submitting..." : "Continue to payment"} <span>↗</span></button>
      <p className="form-note">Your documents and payment details are handled securely. We do not collect a security deposit.</p>
    </form>
  </div>;
}
