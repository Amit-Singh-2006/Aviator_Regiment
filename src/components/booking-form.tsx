"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { RazorpayCheckout } from "@/src/components/razorpay-checkout";
import { UpiPaymentDetails } from "@/src/components/upi-payment-details";
import { formatDate, todayInIndia } from "@/src/lib/format";
import { onlinePaymentAmount } from "@/src/lib/razorpay/fee";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { keepUntilDate, lastExamDateRange } from "@/src/modules/bookings/rental-period";
import { maskAadhaar, validateBookingInput, validateImageFile, validatePassportPhoto } from "@/src/modules/bookings/validation";
import type { BookingErrors, BookingField, BookingInput } from "@/src/modules/bookings/validation";
import { formatInr, isBookable, sessionStatusLabels } from "@/src/modules/exam-sessions/sessions";
import type { ExamSession } from "@/src/modules/exam-sessions/sessions";

type Step = "details" | "review" | "payment" | "pending" | "paid";
type CreatedBooking = { bookingCode: string; amountInr: number; depositInr: number };

const fieldOrder: BookingField[] = ["fullName", "phone", "email", "address", "aadhaar", "dgcaNumber", "lastExamDate", "passportPhoto", "termsAccepted"];

function FieldError({ field, errors }: { field: BookingField; errors: BookingErrors }) {
  return errors[field] ? <small className="field-error" id={`${field}-error`}>{errors[field]}</small> : null;
}

async function postForm(url: string, body: FormData) {
  try {
    const response = await fetch(url, { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok, result };
  } catch {
    return { ok: false, result: { message: "Network error. Check your connection and try again." } };
  }
}

// onlinePayments: Razorpay is configured, so customers can pay online as well as by UPI.
export function BookingForm({ session, onlinePayments = false }: { session: ExamSession | null; onlinePayments?: boolean }) {
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<BookingInput | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  if (!session || !isBookable(session)) {
    return <div className="shell booking-layout">
      <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Choose your<br /><em>session first.</em></h1><p>{session ? `${session.name} is ${sessionStatusLabels[session.status].toLowerCase()} right now. Please choose another examination session.` : "Select the DGCA examination session you're appearing for to start your booking."}</p></div>
      <div className="review-card"><p className="eyebrow">{session ? sessionStatusLabels[session.status] : "No session selected"}</p><p className="booking-notice">Bookings are made for one complete DGCA examination session. Pick an available session to continue.</p><Link className="button button-primary submit-button" href="/rent-cx3">View available sessions <span>↗</span></Link></div>
    </div>;
  }

  const bookedSession = session;
  // The rental and the refundable security deposit are paid together.
  const rentalInr = booking?.amountInr ?? bookedSession.priceInr;
  const depositInr = booking?.depositInr ?? bookedSession.depositInr;
  const price = formatInr(rentalInr);
  const deposit = formatInr(depositInr);
  const total = formatInr(rentalInr + depositInr);
  const bookingId = booking?.bookingCode ?? "";
  const paymentMessage = whatsappLink(whatsappMessages.upiPayment(bookingId, bookedSession.name, total));
  const onlineFee = formatInr(onlinePaymentAmount(rentalInr + depositInr).feeInr);
  const examDates = lastExamDateRange(todayInIndia());

  function goTo(next: Step) {
    setRequestError("");
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
      sessionId: bookedSession.id,
      fullName: text("fullName"),
      phone: text("phone"),
      email: text("email"),
      address: text("address"),
      aadhaar: text("aadhaar"),
      dgcaNumber: text("dgcaNumber"),
      lastExamDate: text("lastExamDate"),
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
    goTo("review");
  }

  // Creates the booking on the server, which assigns the Booking ID.
  async function confirmBooking() {
    if (!details || !photo || submitting) return;
    setSubmitting(true);
    setRequestError("");
    const body = new FormData();
    Object.entries(details).forEach(([key, value]) => body.set(key, String(value)));
    body.set("passportPhoto", photo);
    const { ok, result } = await postForm("/api/bookings", body);
    setSubmitting(false);
    if (!ok) {
      setRequestError(result.message ?? "We couldn't create your booking. Please try again.");
      return;
    }
    setBooking({ bookingCode: result.bookingCode, amountInr: result.amountInr, depositInr: result.depositInr ?? bookedSession.depositInr });
    goTo("payment");
  }

  async function submitPaymentProof() {
    if (!booking || !details || submitting) return;
    const screenshotError = validateImageFile(screenshot, "Choose your payment screenshot to upload.");
    if (screenshotError || !screenshot) {
      setRequestError(screenshotError ?? "");
      return;
    }
    setSubmitting(true);
    setRequestError("");
    const body = new FormData();
    body.set("contact", details.phone);
    body.set("screenshot", screenshot);
    const { ok, result } = await postForm(`/api/bookings/${booking.bookingCode}/payment-proof`, body);
    setSubmitting(false);
    if (!ok) {
      setRequestError(result.message ?? "We couldn't submit your screenshot. Please try again.");
      return;
    }
    goTo("pending");
  }

  if (step === "review" && details) return <div className="shell booking-layout">
    <div className="booking-intro"><button type="button" className="back-link back-button" onClick={() => goTo("details")} disabled={submitting}>← Edit details</button><p className="eyebrow">Review / Before payment</p><h1>Check your<br /><em>flight plan.</em></h1><p>Check your session and delivery details. Your Booking ID is created when you confirm, and you&apos;ll then {onlinePayments ? "pay online or by UPI" : "see the UPI payment details"}.</p><div className="booking-summary"><span>Selected session</span><strong>{bookedSession.name}</strong><span>Total payable</span><strong>{total}</strong></div></div>
    <div className="review-card">
      <div className="review-row"><span>Examination session</span><strong>{bookedSession.name}</strong></div>
      <div className="review-row"><span>Session rental</span><strong>{price} for the complete session</strong></div>
      <div className="review-row"><span>Security deposit</span><strong>{deposit}, refunded after the CX-3 is returned</strong></div>
      <div className="review-row"><span>Last exam date</span><strong>{formatDate(details.lastExamDate)}, keep the CX-3 until {formatDate(keepUntilDate(details.lastExamDate))}</strong></div>
      <div className="review-row"><span>Customer</span><strong>{details.fullName}</strong></div>
      <div className="review-row"><span>Phone</span><strong>{details.phone}</strong></div>
      <div className="review-row"><span>Email</span><strong>{details.email}</strong></div>
      <div className="review-row"><span>Delivery address</span><strong>{details.address}</strong></div>
      <div className="review-row"><span>Aadhaar</span><strong>{maskAadhaar(details.aadhaar)}</strong></div>
      <div className="review-row"><span>DGCA computer / registration number</span><strong>{details.dgcaNumber}</strong></div>
      <div className="review-row"><span>Passport-size photo</span><strong>{photo?.name}</strong></div>
      <div className="review-row"><span>Policies</span><strong>Terms &amp; Conditions and Refund Policy accepted</strong></div>
      <div className="review-total"><span>Total payable</span><strong>{total}</strong></div>
      {requestError && <p className="form-error" role="alert">{requestError}</p>}
      <button type="button" className="button button-primary submit-button" onClick={confirmBooking} disabled={submitting}>{submitting ? "Creating your booking…" : <>Confirm booking &amp; continue to payment <span>↗</span></>}</button>
      <p className="form-note">The rental covers the complete examination session and is non-refundable. The {deposit} deposit is refunded after the CX-3 is returned; nothing is refunded if it&apos;s lost.{onlinePayments && ` Paying online adds a ${onlineFee} payment gateway fee; UPI has no fee.`}</p>
    </div>
  </div>;

  if (step === "payment" && booking) return <div className="shell booking-layout">
    <div className="booking-intro"><p className="eyebrow">{onlinePayments ? "Payment" : "Payment / UPI"}</p><h1>Complete your<br /><em>payment.</em></h1><p>{onlinePayments ? "Your booking is created. Pay online for instant confirmation, or pay by UPI and upload your payment screenshot so we can verify it." : "Your booking is created. Pay using the UPI ID or QR code, then upload your payment screenshot so we can verify it."}</p><div className="booking-summary"><span>Booking ID (save this)</span><strong>{bookingId}</strong><span>Rental + deposit</span><strong>{price} + {deposit} = {total}</strong></div></div>
    <div className="upi-card">
      {onlinePayments && details && <>
        <RazorpayCheckout bookingCode={bookingId} amountInr={booking.amountInr + booking.depositInr} contact={details.phone} prefill={{ name: details.fullName, email: details.email, contact: `+91${details.phone}` }} onPaid={() => goTo("paid")} />
        <p className="payment-divider">or pay by UPI · no fee</p>
      </>}
      <UpiPaymentDetails amount={total} bookingId={bookingId} />
      <label className="upload-label">Payment screenshot<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setScreenshot(event.target.files?.[0] ?? null); setRequestError(""); }} /><small>JPG, PNG or WebP, up to 5 MB. Stored privately and only seen by our team.</small></label>
      {requestError && <p className="form-error upi-error" role="alert">{requestError}</p>}
      <div className="upi-actions"><button type="button" className="button button-primary submit-button" onClick={submitPaymentProof} disabled={submitting}>{submitting ? "Uploading…" : "Submit payment screenshot"}</button><a className="button button-ghost submit-button" href={paymentMessage} target="_blank" rel="noreferrer">Share screenshot on WhatsApp ↗</a></div>
    </div>
  </div>;

  if (step === "paid" && booking) return <div className="booking-success shell">
    <p className="eyebrow">Payment received</p><h1>You&apos;re<br /><em>booked.</em></h1>
    <div className="booking-summary"><span>Your Booking ID (save this)</span><strong>{bookingId}</strong><span>Booking status</span><strong>Booking confirmed</strong></div>
    <p>Your online payment is confirmed. We&apos;ll assign your CX-3 and share the courier details on the tracking page.</p>
    <div className="booking-success-actions"><Link className="button button-primary" href={`/track?booking=${bookingId}`}>Track your booking</Link><a className="button button-ghost" href={whatsappLink(whatsappMessages.bookingUpdate(bookingId))} target="_blank" rel="noreferrer">Message us on WhatsApp ↗</a></div>
  </div>;

  if (step === "pending" && booking) return <div className="booking-success shell">
    <p className="eyebrow">Payment submitted</p><h1>We&apos;ll verify<br /><em>your transfer.</em></h1>
    <div className="booking-summary"><span>Your Booking ID (save this)</span><strong>{bookingId}</strong><span>Payment status</span><strong>Pending verification</strong></div>
    <p>We&apos;ve received your payment screenshot. Once we verify it, your booking is confirmed and you can follow the CX-3 delivery from the tracking page.</p>
    <div className="booking-success-actions"><Link className="button button-primary" href={`/track?booking=${bookingId}`}>Track your booking</Link><a className="button button-ghost" href={whatsappLink(whatsappMessages.bookingUpdate(bookingId))} target="_blank" rel="noreferrer">Message us on WhatsApp ↗</a></div>
  </div>;

  return <div className="shell booking-layout">
    <div className="booking-intro"><Link className="back-link" href="/rent-cx3">← Back to sessions</Link><p className="eyebrow">Rent CX-3 / Booking</p><h1>Let&apos;s get you<br /><em>ready to fly.</em></h1><p>Tell us where to send your CX-3. We&apos;ll confirm your session and guide you through payment.</p><div className="booking-summary"><span>Selected session</span><strong>{bookedSession.name}</strong><span>Session rental</span><strong>{price}</strong><span>Refundable security deposit</span><strong>{deposit}</strong><span>Total payable</span><strong>{total}</strong></div></div>
    <form className="booking-form" onSubmit={submitDetails} onChange={clearError} noValidate>
      <label>Full name<input name="fullName" autoComplete="name" maxLength={100} defaultValue={details?.fullName} placeholder="As on your DGCA records" {...describe("fullName")} /><FieldError field="fullName" errors={errors} /></label>
      <div className="form-row"><label>Phone number<input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={16} defaultValue={details?.phone} placeholder="10-digit mobile number" {...describe("phone")} /><FieldError field="phone" errors={errors} /></label><label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} defaultValue={details?.email} placeholder="you@example.com" {...describe("email")} /><FieldError field="email" errors={errors} /></label></div>
      <label>Full delivery address<textarea name="address" rows={4} autoComplete="street-address" maxLength={500} defaultValue={details?.address} placeholder="House / street, city, state, PIN code" {...describe("address")} /><FieldError field="address" errors={errors} /></label>
      <label>Aadhaar number<input name="aadhaar" inputMode="numeric" autoComplete="off" maxLength={14} defaultValue={details?.aadhaar} placeholder="12-digit Aadhaar number" {...describe("aadhaar")} /><small>Required for verification. Stored securely and only visible to authorised Aviator&apos;s Regiment staff.</small><FieldError field="aadhaar" errors={errors} /></label>
      <label>DGCA computer / registration number<input name="dgcaNumber" maxLength={40} defaultValue={details?.dgcaNumber} placeholder="Your relevant DGCA number" {...describe("dgcaNumber")} /><FieldError field="dgcaNumber" errors={errors} /></label>
      <label>Date of your last exam in this session<input name="lastExamDate" type="date" min={examDates.min} max={examDates.max} defaultValue={details?.lastExamDate} {...describe("lastExamDate")} /><small>You keep the CX-3 until the day after this date. We then arrange the return pickup.</small><FieldError field="lastExamDate" errors={errors} /></label>
      <label className="upload-label">Passport-size photo<input name="passportPhoto" type="file" accept="image/png,image/jpeg,image/webp" {...describe("passportPhoto")} /><small>{photo ? `Selected: ${photo.name}. Choose a new file to replace it.` : "JPG, PNG or WebP, up to 5 MB. Stored privately."}</small><FieldError field="passportPhoto" errors={errors} /></label>
      <label className="checkbox-label"><input name="termsAccepted" type="checkbox" defaultChecked={details?.termsAccepted} {...describe("termsAccepted")} /><span>I agree to the <Link href="/terms" target="_blank">Terms &amp; Conditions</Link> and <Link href="/refund-policy" target="_blank">Refund Policy</Link>: the rental is non-refundable, and the {deposit} security deposit is refunded after the CX-3 is returned, but not if it&apos;s lost.</span></label>
      <FieldError field="termsAccepted" errors={errors} />
      {Object.keys(errors).length > 0 && <p className="form-error" role="alert">Please correct the highlighted details.</p>}
      <button className="button button-primary submit-button">Review booking <span>↗</span></button>
      <p className="form-note">The {deposit} security deposit is paid with the rental and refunded after the CX-3 is returned.</p>
    </form>
  </div>;
}
