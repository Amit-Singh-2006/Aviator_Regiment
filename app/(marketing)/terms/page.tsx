import Link from "next/link";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";
import { SECURITY_DEPOSIT_INR, TERMS_LAST_UPDATED } from "@/src/modules/bookings/terms";
import { formatInr } from "@/src/modules/exam-sessions/sessions";

const deposit = formatInr(SECURITY_DEPOSIT_INR);

export const metadata = pageMetadata({
  title: "Terms & Conditions",
  description: "Terms and conditions for CX-3 rental bookings with Aviator's Regiment: pricing, security deposit, rental period, payment, delivery, return pickup, loss and refunds.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal / Terms" title={<>Terms &amp;<br /><em>Conditions.</em></>} intro="These terms apply to CX-3 rental bookings made with Aviator's Regiment. Please read them before you book." updated={TERMS_LAST_UPDATED}>
      <h2>1. The rental</h2>
      <ul>
        <li>Each booking is for one CX-3 for a specific DGCA examination session, for example FC OLODE 03 or FC Regular 04.</li>
        <li>The rental price covers your examination session, up to the end of the rental period below. It is not charged per day.</li>
        <li>Prices are set separately for OLODE and Regular sessions and are shown on the <Link href="/rent-cx3">Rent CX-3</Link> page. The price shown when you book applies.</li>
        <li>A refundable security deposit of {deposit} is payable together with the rental. See our <Link href="/refund-policy">Refund Policy</Link>.</li>
        <li>Sessions are subject to availability. Sessions marked sold out or unavailable cannot be booked.</li>
      </ul>
      <h2>2. Rental period</h2>
      <ul>
        <li>You may keep the CX-3 only until the day after your last exam in the session. For example, if your last exam is on 10 October, you may keep it until 11 October.</li>
        <li>You tell us the date of your last exam when you book. When the rental period ends, we arrange the return pickup.</li>
      </ul>
      <h2>3. Booking and verification</h2>
      <ul>
        <li>To book, you provide your full name, phone number, email address, full delivery address, Aadhaar, a passport-size photo, your DGCA Computer Number (or relevant DGCA registration number), the examination session you are appearing for and the date of your last exam.</li>
        <li>You must provide accurate information. We may contact you to verify your details.</li>
        <li>Every booking receives a unique Booking ID. Please use it in all communication with us.</li>
      </ul>
      <h2>4. Payment</h2>
      <ul>
        <li>You pay the rental and the security deposit together.</li>
        <li>When you pay by UPI, share your payment screenshot with your Booking ID. UPI payments are verified manually.</li>
        <li>Where online payment through a payment gateway is offered, any applicable gateway or convenience fee is shown before you pay.</li>
        <li>Your booking is confirmed once your payment has been verified.</li>
      </ul>
      <h2>5. Delivery</h2>
      <ul>
        <li>We send the CX-3 to your delivery address by courier and share the courier name, AWB/tracking number and tracking link with you.</li>
        <li>You can follow your booking on the <Link href="/track">Track your booking</Link> page.</li>
      </ul>
      <h2>6. Return</h2>
      <ul>
        <li>We arrange the return pickup when your rental period ends, the day after your last exam. You do not need to arrange the return yourself.</li>
        <li>Please keep the CX-3 ready to hand over at the scheduled pickup.</li>
      </ul>
      <h2>7. Loss of the CX-3</h2>
      <p>If the CX-3 is lost while it is with you, you will not receive anything back: the security deposit is not refunded, and neither is the rental amount.</p>
      <h2>8. Refunds</h2>
      <p>The rental is non-refundable. The security deposit is refunded after we receive the CX-3 back, as set out in our <Link href="/refund-policy">Refund Policy</Link>.</p>
      <h2>9. Your documents and data</h2>
      <p>Your Aadhaar, photo and DGCA details are used to verify and fulfil your booking. They are stored securely and are only accessible to authorised Aviator&apos;s Regiment administrators. Our <Link href="/privacy-policy">Privacy Policy</Link> explains how we handle your data, and our <Link href="/shipping-policy">Shipping &amp; Delivery Policy</Link> covers delivery and the return pickup.</p>
      <h2>10. Contact</h2>
      <p>Questions about these terms? <a href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">Message us on WhatsApp</a> or see our <Link href="/contact">Contact page</Link>.</p>
    </LegalPage>
  );
}
