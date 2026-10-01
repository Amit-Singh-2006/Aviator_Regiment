"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { siteConfig } from "@/src/lib/site-config";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { generateBookingId } from "@/src/modules/bookings/booking-id";
import { maskAadhaar, validateBookingInput, validatePassportPhoto } from "@/src/modules/bookings/validation";
import type { BookingErrors, BookingField, BookingInput } from "@/src/modules/bookings/validation";
import { findExamSession, formatInr, getSessionPrice, isBookable, sessionStatusLabels } from "@/src/modules/exam-sessions/sessions";

type Step = "details" | "review" | "payment" | "pending";

const fieldOrder: BookingField[] = ["fullName", "phone", "email", "address", "aadhaar", "dgcaNumber", "passportPhoto", "termsAccepted"];

function FieldError({ field, errors }: { field: BookingField; errors: BookingErrors }) {
  return errors[field] ? <small className="field-error" id={`${field}-error`}>{errors[field]}</small> : null;
}

export function BookingForm() {
  const sessionId = useSearchParams().get("session") ?? "";
  const session = findExamSession(sessionId);
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<BookingInput | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [bookingId, setBookingId] = useState("");
  const [copied, setCopied] = useState(false);

  if (!session || !isBookable(session)) {
    return <div className="shell booking-layout">
      <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Choose your<br /><em>session first.</em></h1><p>{session ? `${session.name} is ${sessionStatusLabels[session.status].toLowerCase()} right now. Please choose another examination session.` : "Select the DGCA examination session you're appearing for to start your booking."}</p></div>
      <div className="review-card"><p className="eyebrow">{session ? sessionStatusLabels[session.status] : "No session selected"}</p><p className="booking-notice">Bookings are made for one complete DGCA examination session. Pick an available session to continue.</p><Link className="button button-primary submit-button" href="/rent-cx3">View available sessions <span>↗</span></Link></div>
    </div>;
  }

  const price = formatInr(getSessionPrice(session));
  const paymentMessage = whatsappLink(whatsappMessages.upiPayment(bookingId, session.name, price));

  function goTo(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function describe(field: BookingField) {
    return errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};
  }

  function clearError(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name as BookingField;
    if (!errors[name]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : "";
    };
    const upload = form.get("passportPhoto");
    const chosenPhoto = upload instanceof File && upload.size > 0 ? upload : photo;

    const result = validateBookingInput({
      sessionId,
      fullName: text("fullName"),
      phone: text("phone"),
      email: text("email"),
      address: text("address"),
      aadhaar: text("aadhaar"),
      dgcaNumber: text("dgcaNumber"),
      termsAccepted: form.get("termsAccepted") === "on",
    });
    const nextErrors: BookingErrors = result.success ? {} : { ...result.errors };
    const photoError = validatePassportPhoto(chosenPhoto);
    if (photoError) nextErrors.passportPhoto = photoError;
    setErrors(nextErrors);

    if (!result.success || photoError) {
      const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
      const element = firstInvalid ? formElement.elements.namedItem(firstInvalid) : null;
      if (element instanceof HTMLElement) element.focus();
      return;
    }

    setDetails(result.data);
    setPhoto(chosenPhoto);
    if (!bookingId) setBookingId(generateBookingId());
    goTo("review");
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(siteConfig.upiId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (step === "review" && details) return <div className="shell booking-layout">
    <div className="booking-intro"><button type="button" className="back-link back-button" onClick={() => goTo("details")}>← Edit details</button><p className="eyebrow">Review / Before payment</p><h1>Check your<br /><em>flight plan.</em></h1><p>Review your session and delivery details before moving to the UPI payment instructions.</p><div className="booking-summary"><span>Booking ID (save this)</span><strong>{bookingId}</strong></div></div>
    <div className="review-card">
      <div className="review-row"><span>Examination session</span><strong>{session.name}</strong></div>
      <div className="review-row"><span>Session rental</span><strong>{price} for the complete session</strong></div>
      <div className="review-row"><span>Security deposit</span><strong>₹0</strong></div>
      <div className="review-row"><span>Customer</span><strong>{details.fullName}</strong></div>
      <div className="review-row"><span>Phone</span><strong>{details.phone}</strong></div>
      <div className="review-row"><span>Email</span><strong>{details.email}</strong></div>
      <div className="review-row"><span>Delivery address</span><strong>{details.address}</strong></div>
      <div className="review-row"><span>Aadhaar</span><strong>{maskAadhaar(details.aadhaar)}</strong></div>
      <div className="review-row"><span>DGCA computer / registration number</span><strong>{details.dgcaNumber}</strong></div>
      <div className="review-row"><span>Passport-size photo</span><strong>{photo?.name}</strong></div>
      <div className="review-row"><span>Policies</span><strong>Terms &amp; Conditions and No-Refund Policy accepted</strong></div>
      <div className="review-total"><span>Total payable</span><strong>{price}</strong></div>
      <button type="button" className="button button-primary submit-button" onClick={() => goTo("payment")}>Continue to UPI payment <span>↗</span></button>
      <p className="form-note">No security deposit. Rental covers the complete applicable examination session.</p>
    </div>
  </div>;

  if (step === "payment") return <div className="shell booking-layout">
    <div className="booking-intro"><button type="button" className="back-link back-button" onClick={() => goTo("review")}>← Back to review</button><p className="eyebrow">Payment / UPI</p><h1>Complete your<br /><em>payment.</em></h1><p>Use the UPI ID or QR code below, then share your payment screenshot with your Booking ID for manual verification.</p><div className="booking-summary"><span>Booking ID (save this)</span><strong>{bookingId}</strong><span>Amount payable</span><strong>{price}</strong></div></div>
    <div className="upi-card">
      <div className="upi-amount"><span>Pay exactly</span><strong>{price}</strong></div>
      {siteConfig.upiQrImage
        // A plain img keeps this page light; QR codes must not be recompressed anyway.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="upi-qr" src={siteConfig.upiQrImage} alt={`UPI QR code for ${siteConfig.upiPayeeName}`} width={190} height={190} />
        : <div className="qr-placeholder" aria-label="UPI QR code placeholder"><span>UPI</span><small>QR PLACEHOLDER</small></div>}
      {siteConfig.upiId
        ? <><p className="upi-label">UPI ID · {siteConfig.upiPayeeName}</p><button type="button" className="upi-id" onClick={copyUpiId}>{siteConfig.upiId} <span aria-live="polite">{copied ? "Copied" : "Copy"}</span></button></>
        : <p className="upi-note">Our UPI ID will be shared with you on WhatsApp along with your Booking ID.</p>}
      <p className="upi-note">Add <b>{bookingId}</b> as the payment note so we can match your transfer quickly.</p>
      <label className="upload-label">Payment screenshot <input type="file" accept="image/png,image/jpeg,image/webp" /><small>Demo only — secure upload is enabled after storage integration. Share the screenshot on WhatsApp for now.</small></label>
      <div className="upi-actions"><button type="button" className="button button-primary submit-button" onClick={() => goTo("pending")}>I&apos;ve completed payment</button><a className="button button-ghost submit-button" href={paymentMessage} target="_blank" rel="noreferrer">Share screenshot on WhatsApp ↗</a></div>
    </div>
  </div>;

  if (step === "pending") return <div className="booking-success shell">
    <p className="eyebrow">Payment submitted</p><h1>We&apos;ll verify<br /><em>your transfer.</em></h1>
    <div className="booking-summary"><span>Your Booking ID (save this)</span><strong>{bookingId}</strong><span>Payment status</span><strong>Pending verification</strong></div>
    <p>Share your payment screenshot on WhatsApp with your Booking ID so we can verify it. This demo does not store files or create a permanent booking until the database and private storage are connected.</p>
    <div className="booking-success-actions"><a className="button button-primary" href={paymentMessage} target="_blank" rel="noreferrer">Share screenshot on WhatsApp ↗</a><Link className="button button-ghost" href={`/track?booking=${bookingId}`}>Track your booking</Link></div>
  </div>;

  return <div className="shell booking-layout">
    <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Let&apos;s get you<br /><em>ready to fly.</em></h1><p>Tell us where to send your CX-3. We&apos;ll confirm your session and guide you through payment.</p><div className="booking-summary"><span>Selected session</span><strong>{session.name}</strong><span>Session rental</span><strong>{price}</strong><span>Security deposit</span><strong>₹0</strong></div></div>
    <form className="booking-form" onSubmit={submitDetails} onChange={clearError} noValidate>
      <label>Full name<input name="fullName" autoComplete="name" maxLength={100} defaultValue={details?.fullName} placeholder="As on your DGCA records" {...describe("fullName")} /><FieldError field="fullName" errors={errors} /></label>
      <div className="form-row"><label>Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={16} defaultValue={details?.phone} placeholder="10-digit mobile number" {...describe("phone")} /><FieldError field="phone" errors={errors} /></label><label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} defaultValue={details?.email} placeholder="you@example.com" {...describe("email")} /><FieldError field="email" errors={errors} /></label></div>
      <label>Full delivery address<textarea name="address" rows={4} autoComplete="street-address" maxLength={500} defaultValue={details?.address} placeholder="House / street, city, state, PIN code" {...describe("address")} /><FieldError field="address" errors={errors} /></label>
      <label>Aadhaar number<input name="aadhaar" inputMode="numeric" autoComplete="off" maxLength={14} defaultValue={details?.aadhaar} placeholder="12-digit Aadhaar number" {...describe("aadhaar")} /><small>Required for verification. It will be stored securely once private storage is connected.</small><FieldError field="aadhaar" errors={errors} /></label>
      <label>DGCA computer / registration number<input name="dgcaNumber" maxLength={40} defaultValue={details?.dgcaNumber} placeholder="Your relevant DGCA number" {...describe("dgcaNumber")} /><FieldError field="dgcaNumber" errors={errors} /></label>
      <label className="upload-label">Passport-size photo<input name="passportPhoto" type="file" accept="image/png,image/jpeg,image/webp" {...describe("passportPhoto")} /><small>{photo ? `Selected: ${photo.name}. Choose a new file to replace it.` : "JPG, PNG or WebP, up to 5 MB. Secure storage will be enabled with the database integration."}</small><FieldError field="passportPhoto" errors={errors} /></label>
      <label className="checkbox-label"><input name="termsAccepted" type="checkbox" defaultChecked={details?.termsAccepted} {...describe("termsAccepted")} /><span>I agree to the <Link href="/terms" target="_blank">Terms &amp; Conditions</Link> and understand that CX-3 rental bookings are non-refundable under the <Link href="/refund-policy" target="_blank">No-Refund Policy</Link>.</span></label>
      <FieldError field="termsAccepted" errors={errors} />
      {Object.keys(errors).length > 0 && <p className="form-error" role="alert">Please correct the highlighted details.</p>}
      <button className="button button-primary submit-button">Review booking <span>↗</span></button>
      <p className="form-note">Demo mode: no personal data or documents are persisted yet. We do not collect a security deposit.</p>
    </form>
  </div>;
}
