import Link from "next/link";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";
import { SECURITY_DEPOSIT_INR, TERMS_LAST_UPDATED } from "@/src/modules/bookings/terms";
import { formatInr } from "@/src/modules/exam-sessions/sessions";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

const deposit = formatInr(SECURITY_DEPOSIT_INR);

export const metadata = pageMetadata({
  title: "Refund Policy",
  description: `CX-3 rental payments with Aviator's Regiment are non-refundable. The ${deposit} security deposit is refunded once the CX-3 is returned, but not if it is lost.`,
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage eyebrow="Legal / Refunds" title={<>Refund<br /><em>Policy.</em></>} intro={`The CX-3 rental is non-refundable. The ${deposit} security deposit is refunded once the CX-3 is back with us. Please read this policy before you pay.`} updated={TERMS_LAST_UPDATED}>
      <h2>1. The rental is non-refundable</h2>
      <p>Payments for CX-3 rentals are not refundable. If you pay online, the payment gateway fee is not refundable either.</p>
      <h2>2. Security deposit</h2>
      <p>Every booking includes a refundable security deposit of {deposit}, paid together with the rental.</p>
      <ul>
        <li>We refund the deposit after we receive the CX-3 back from you.</li>
        <li>If your booking is cancelled before the CX-3 is dispatched, we refund the deposit.</li>
        <li>The deposit is refunded to the account you paid from.</li>
      </ul>
      <h2>3. If the CX-3 is lost</h2>
      <p>If the CX-3 is lost while it is with you, you will not receive anything back: neither the security deposit nor the rental amount.</p>
      <h2>4. Your acceptance</h2>
      <p>Before you pay, you must tick a checkbox confirming that you agree to our <Link href="/terms">Terms &amp; Conditions</Link> and this Refund Policy. Your acceptance is recorded against your Booking ID.</p>
      <h2>5. Before you book</h2>
      <p>Please check that you have selected the correct DGCA examination session and that your delivery details and last exam date are complete and accurate before you pay.</p>
      <h2>6. Questions</h2>
      <p>If you have a question about a payment or your deposit, <a href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">message us on WhatsApp</a> with your Booking ID.</p>
    </LegalPage>
  );
}
