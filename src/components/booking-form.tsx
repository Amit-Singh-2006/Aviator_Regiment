"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

const sessionPricing: Record<string, string> = {
  "FC OLODE 03": "₹2,000",
  "FC Regular 04": "₹2,500",
};

export function BookingForm() {
  const selectedSession = useSearchParams().get("session") ?? "";
  const [step, setStep] = useState<"details" | "review" | "payment" | "pending">("details");
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [bookingId, setBookingId] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries()) as Record<string, string>;
    if (!values.fullName || !values.phone || !values.email || !values.address || !values.dgcaNumber || values.noRefundAccepted !== "true") {
      setError("Please complete every required field and accept the no-refund policy.");
      return;
    }
    if (!/^\d{12}$/.test(values.aadhaar?.replace(/\s/g, "") ?? "")) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!sessionPricing[selectedSession]) {
      setError("Please return to the Rent CX-3 page and select an available examination session.");
      return;
    }
    setFormValues(values);
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setBookingId(`AR${datePart}${randomPart}`);
    setStep("review");
  }

  if (step === "review") return <div className="shell booking-layout">
    <div className="booking-intro"><button className="back-link back-button" onClick={() => setStep("details")}>← Edit details</button><p className="eyebrow">Review / Before payment</p><h1>Check your<br /><em>flight plan.</em></h1><p>Review your session and delivery details before moving to the UPI payment instructions.</p></div>
    <div className="review-card"><div className="review-row"><span>Examination session</span><strong>{selectedSession}</strong></div><div className="review-row"><span>Session rental</span><strong>{sessionPricing[selectedSession] ?? "Price shown on session page"}</strong></div><div className="review-row"><span>Customer</span><strong>{formValues.fullName}</strong></div><div className="review-row"><span>Email</span><strong>{formValues.email}</strong></div><div className="review-row"><span>Delivery address</span><strong>{formValues.address}</strong></div><div className="review-total"><span>Total payable</span><strong>{sessionPricing[selectedSession] ?? "—"}</strong></div><button className="button button-primary submit-button" onClick={() => setStep("payment")}>Continue to UPI payment <span>↗</span></button><p className="form-note">No security deposit. Rental covers the complete applicable examination session.</p></div>
  </div>;

  if (step === "payment") {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999";
    const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello Aviator's Regiment, my Booking ID is ${bookingId}. I have completed the UPI payment for ${selectedSession}.`)}`;
    return <div className="shell booking-layout">
      <div className="booking-intro"><button className="back-link back-button" onClick={() => setStep("review")}>← Back to review</button><p className="eyebrow">Payment / UPI</p><h1>Complete your<br /><em>payment.</em></h1><p>Use the UPI ID or QR instructions below. Then share your payment proof for manual verification.</p><div className="booking-summary"><span>Booking ID (save this)</span><strong>{bookingId}</strong><span>Amount payable</span><strong>{sessionPricing[selectedSession] ?? "—"}</strong></div></div>
      <div className="upi-card"><div className="upi-amount"><span>Pay exactly</span><strong>{sessionPricing[selectedSession] ?? "—"}</strong></div><div className="qr-placeholder" aria-label="UPI QR code placeholder"><span>UPI</span><small>QR PLACEHOLDER</small></div><p className="upi-label">UPI ID</p><button className="upi-id" onClick={() => navigator.clipboard?.writeText("aviatorsregiment@upi")}>aviatorsregiment@upi <span>Copy</span></button><label className="upload-label">Payment screenshot <input type="file" accept="image/png,image/jpeg,image/webp" /><small>Demo only — secure upload is enabled after storage integration.</small></label><div className="upi-actions"><button className="button button-primary submit-button" onClick={() => setStep("pending")}>I&apos;ve completed payment</button><Link className="button button-ghost submit-button" href={whatsappHref} target="_blank" rel="noreferrer">Share on WhatsApp ↗</Link></div></div>
    </div>;
  }

  if (step === "pending") return <div className="booking-success shell"><p className="eyebrow">Payment submitted</p><h1>We&apos;ll verify<br /><em>your transfer.</em></h1><p>Your payment proof is ready to be shared for manual review. This demo does not store files or create a permanent booking until the database and private storage are connected.</p><Link className="button button-primary" href="/rent-cx3">Back to Rent CX-3</Link></div>;

  return <div className="shell booking-layout">
    <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Let&apos;s get you<br /><em>ready to fly.</em></h1><p>Tell us where to send your CX-3. We&apos;ll confirm your session and guide you through payment.</p><div className="booking-summary"><span>Selected session</span><strong>{selectedSession || "Choose a session first"}</strong><span>Security deposit</span><strong>₹0</strong></div></div>
    <form className="booking-form" onSubmit={submit} noValidate>
      <input type="hidden" name="session" value={selectedSession} />
      <label>Full name<input name="fullName" required placeholder="As on your DGCA records" /></label>
      <div className="form-row"><label>Phone number<input name="phone" required inputMode="numeric" placeholder="10-digit mobile number" /></label><label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label></div>
      <label>Full delivery address<textarea name="address" required rows={4} placeholder="House / street, city, state, PIN code" /></label>
      <label>Aadhaar number<input name="aadhaar" required inputMode="numeric" maxLength={14} placeholder="12-digit Aadhaar number" /><small>Required for verification. It will be stored securely once private storage is connected.</small></label>
      <label>DGCA computer / registration number<input name="dgcaNumber" required placeholder="Your relevant DGCA number" /></label>
      <label className="checkbox-label"><input name="noRefundAccepted" type="checkbox" value="true" required /><span>I understand and accept that CX-3 rental bookings are non-refundable once confirmed.</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label className="upload-label">Passport-size photo<input name="passportPhoto" type="file" accept="image/png,image/jpeg,image/webp" required /><small>Required for a live booking. Secure storage will be enabled with the database integration.</small></label>
      <button className="button button-primary submit-button" disabled={!selectedSession}>Review booking <span>↗</span></button>
      <p className="form-note">Demo mode: no personal data or documents are persisted yet. We do not collect a security deposit.</p>
    </form>
  </div>;
}
