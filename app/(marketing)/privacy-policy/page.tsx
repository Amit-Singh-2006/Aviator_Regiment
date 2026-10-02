import Link from "next/link";
import { ContactDetails } from "@/src/components/contact-details";
import { LegalPage } from "@/src/components/legal-page";
import { pageMetadata } from "@/src/lib/seo";
import { siteConfig } from "@/src/lib/site-config";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Aviator's Regiment collects, uses, shares and protects your personal data when you book a CX-3 or contact us.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage eyebrow="Legal / Privacy" title={<>Privacy<br /><em>Policy.</em></>} intro="How Aviator's Regiment collects, uses and protects your personal data when you use this website, book a CX-3 or contact us." updated="2 October 2026">
      <h2>1. Who we are</h2>
      <p>Aviator&apos;s Regiment (&quot;we&quot;, &quot;us&quot;){siteConfig.businessAddress ? `, ${siteConfig.businessAddress},` : ""} is responsible for the personal data described in this policy. Our contact details are at the end of this page.</p>
      <h2>2. What we collect</h2>
      <ul>
        <li><b>When you book a CX-3:</b> your full name, phone number, email address, delivery address, Aadhaar number, a passport-size photo, your DGCA Computer Number (or registration number) and the examination session you are appearing for.</li>
        <li><b>When you pay:</b> for UPI, the payment screenshot you upload. For online payments, Razorpay processes your card, bank or UPI details; we receive only the payment reference, amount and status, never your card number, bank login or UPI PIN.</li>
        <li><b>When you contact us:</b> the messages and details you send by WhatsApp, phone or email.</li>
        <li><b>When you use the website:</b> our hosting provider processes technical data such as your IP address and browser type to deliver and secure the site. To stop misuse of the booking and tracking forms, we keep a one-way scrambled (hashed) form of your IP address for a few days, never the address itself.</li>
      </ul>
      <h2>3. How we use it</h2>
      <ul>
        <li>To verify your identity and booking details.</li>
        <li>To deliver the CX-3 to you and arrange its return pickup.</li>
        <li>To process and verify your payment.</li>
        <li>To contact you about your booking by phone, WhatsApp or email.</li>
        <li>To prevent fraud and misuse, and to meet our legal, tax and accounting obligations.</li>
      </ul>
      <p>We don&apos;t sell your personal data or use it for advertising.</p>
      <h2>4. Your Aadhaar and documents</h2>
      <p>Your Aadhaar number and photo are used only to verify your booking. They are kept in private storage that only authorised Aviator&apos;s Regiment administrators can access. The full Aadhaar number is hidden by default, and every time an administrator views it, the view is recorded.</p>
      <h2>5. Who we share it with</h2>
      <ul>
        <li><b>Courier and delivery partners</b> (such as Delhivery, DTDC, Rapido or Uber): your name, phone number and address, to deliver and collect the CX-3.</li>
        <li><b>Razorpay</b>, if you pay online, to process your payment.</li>
        <li><b>Service providers</b> that run our website, database, automations and email (for example Vercel, Supabase and Google), only so they can provide those services to us.</li>
        <li><b>Authorities</b>, where the law requires it.</li>
      </ul>
      <h2>6. Cookies</h2>
      <p>The public website doesn&apos;t use advertising or analytics cookies. The administrators&apos; sign-in uses cookies to keep them signed in. If you pay online, Razorpay&apos;s checkout may use its own cookies; see Razorpay&apos;s privacy policy.</p>
      <h2>7. How long we keep it</h2>
      <p>We keep booking records for as long as we need them to complete your rental, answer questions or resolve disputes, and meet legal, tax and accounting requirements. After that, we delete or anonymise them.</p>
      <h2>8. How we protect it</h2>
      <p>Your data travels over encrypted connections (HTTPS) and is stored in a database with access controls. Uploaded documents are kept in private storage and opened only through short-lived links by authorised administrators.</p>
      <h2>9. Your choices</h2>
      <p>You can ask us for a copy of your personal data, ask us to correct or delete it, or withdraw your consent. If you withdraw consent while a booking is in progress, we may not be able to complete it. We will keep data where the law requires us to. To make a request, contact us using the details below.</p>
      <h2>10. Changes to this policy</h2>
      <p>We may update this policy from time to time. The date at the top of this page shows when it last changed.</p>
      <h2>11. Contact</h2>
      <p>Questions about your data or this policy? Reach us on any of these, or see our <Link href="/contact">Contact page</Link>.</p>
      <ContactDetails />
    </LegalPage>
  );
}
