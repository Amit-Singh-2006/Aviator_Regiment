import Link from "next/link";
import { ContactDetails } from "@/src/components/contact-details";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

export const metadata = pageMetadata({
  title: "Contact us",
  description: "Contact Aviator's Regiment about CX-3 rentals, bookings, payments and aviation services by phone, WhatsApp or email.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalPage eyebrow="Support / Contact" title={<>Contact<br /><em>us.</em></>} intro="Questions about a CX-3 rental, a booking, a payment or our aviation services? We're happy to help.">
      <h2>Aviator&apos;s Regiment</h2>
      <ContactDetails />
      <h2>About a booking</h2>
      <p>Include your Booking ID (for example AR2026091842) so we can find your booking quickly. You can also follow it yourself on the <Link href="/track">tracking page</Link>.</p>
      <h2>Quickest reply</h2>
      <p>WhatsApp is usually the fastest way to reach us. <a href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">Message us on WhatsApp</a>.</p>
    </LegalPage>
  );
}
