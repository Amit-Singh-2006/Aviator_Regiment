import Link from "next/link";
import { ContactDetails } from "@/src/components/contact-details";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata({
  title: "Shipping & Delivery Policy",
  description: "How Aviator's Regiment delivers your CX-3 by courier, how you can track it, and how the return pickup works after your DGCA examination session.",
  path: "/shipping-policy",
});

export default function ShippingPolicyPage() {
  return (
    <LegalPage eyebrow="Legal / Shipping" title={<>Shipping &amp;<br /><em>Delivery.</em></>} intro="How we deliver your CX-3 and collect it after your examination session." updated="2 October 2026">
      <h2>1. Where we deliver</h2>
      <p>We deliver within India, to the delivery address you give when you book.</p>
      <h2>2. How we ship</h2>
      <p>We send your CX-3 with a courier or delivery partner such as Delhivery, DTDC, Rapido or Uber, depending on your location.</p>
      <h2>3. When we dispatch</h2>
      <p>We dispatch your CX-3 once your payment is verified and a unit has been assigned to your booking. Online payments are verified instantly; UPI payments are verified after we check your payment screenshot. When your CX-3 ships, we share the expected delivery date.</p>
      <h2>4. Tracking your delivery</h2>
      <p>Once your CX-3 is dispatched, the <Link href="/track">tracking page</Link> shows the courier, the AWB or tracking number, a tracking link and the expected delivery date. Use your Booking ID and the phone number or email you booked with.</p>
      <h2>5. Delivery charges</h2>
      <p>We don&apos;t charge separately for delivery or for the return pickup.</p>
      <h2>6. Receiving your CX-3</h2>
      <p>Please make sure someone is available at the delivery address and that your phone is reachable. If the package looks damaged when it arrives, take photos and contact us right away.</p>
      <h2>7. Return pickup</h2>
      <p>You can keep the CX-3 until the day after your last exam in the session. We arrange the return pickup from then, so you don&apos;t need to book it yourself: for example, if your last exam is on 10 October, we collect the CX-3 from 11 October. Please keep it ready to hand over at the scheduled pickup. The tracking page shows the return status.</p>
      <h2>8. Delays</h2>
      <p>Courier timelines can be affected by weather, holidays or local restrictions. If your delivery is late, contact us and we will follow up with the courier.</p>
      <h2>9. Cancellations and refunds</h2>
      <p>The CX-3 rental is non-refundable. The security deposit is refunded after the CX-3 is returned, but not if it is lost. Please read our <Link href="/refund-policy">Refund Policy</Link> before you pay.</p>
      <h2>10. Contact</h2>
      <p>Questions about a delivery or pickup? Include your Booking ID and reach us on any of these:</p>
      <ContactDetails />
    </LegalPage>
  );
}
