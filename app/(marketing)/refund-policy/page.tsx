import Link from "next/link";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";
import { TERMS_LAST_UPDATED } from "@/src/modules/bookings/terms";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

export const metadata = pageMetadata({
  title: "No-Refund Policy",
  description: "CX-3 rental bookings with Aviator's Regiment are non-refundable. Read the No-Refund Policy before you pay.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage eyebrow="Legal / Refunds" title={<>No-Refund<br /><em>Policy.</em></>} intro="CX-3 rental bookings with Aviator's Regiment are non-refundable. Please read this policy before you pay." updated={TERMS_LAST_UPDATED}>
      <h2>1. No refunds</h2>
      <p>Payments for CX-3 rental bookings are not refundable.</p>
      <h2>2. No security deposit</h2>
      <p>We do not charge a security deposit, so there is no deposit to return.</p>
      <h2>3. Your acceptance</h2>
      <p>Before you pay, you must tick a checkbox confirming that you agree to our <Link href="/terms">Terms &amp; Conditions</Link> and that you understand and accept this No-Refund Policy. Your acceptance is recorded against your Booking ID.</p>
      <h2>4. Before you book</h2>
      <p>Please check that you have selected the correct DGCA examination session and that your delivery details are complete and accurate before you pay.</p>
      <h2>5. Questions</h2>
      <p>If you have a question about a payment, <a href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">message us on WhatsApp</a> with your Booking ID.</p>
    </LegalPage>
  );
}
