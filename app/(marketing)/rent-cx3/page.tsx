import Link from "next/link";
import { WhatsAppCta } from "@/src/components/whatsapp-cta";
import { pageMetadata } from "@/src/lib/seo";
import { whatsappMessages } from "@/src/lib/whatsapp";
import { SECURITY_DEPOSIT_INR } from "@/src/modules/bookings/terms";
import { getVisibleSessions } from "@/src/modules/exam-sessions/queries";
import { formatInr, isBookable, sessionStatusLabels } from "@/src/modules/exam-sessions/sessions";

// Availability is set by admins, so the page always reads the latest sessions.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Rent CX-3 for DGCA Exams",
  description: "Rent a CX-3 for your DGCA examination session, OLODE or Regular, priced per session with a refundable security deposit. Courier delivery and return pickup arranged.",
  path: "/rent-cx3",
});

export default async function RentCx3Page() {
  const sessions = await getVisibleSessions();

  return <main>
    <section className="rent-hero"><div className="shell"><p className="eyebrow">Rent CX-3 / DGCA sessions</p><h1>Focus on the exam.<br /><em>We&apos;ll handle the rest.</em></h1><p>Reliable CX-3 access for the complete examination session — not per day, not per hour.</p></div></section>
    <section className="section sessions-section"><div className="shell"><div className="section-heading"><div><p className="eyebrow">Choose your session</p><h2>One session.<br />Clear pricing.</h2></div><p>Select the DGCA examination session you&apos;re appearing for. Your rental covers the complete applicable session period.</p></div>
      {sessions.length > 0
        ? <div className="session-grid">{sessions.map((session) => <article className="session-card" key={session.id}><div className="session-card-top"><span className="session-type">{session.type}</span><span className="availability" data-status={session.status}><i />{sessionStatusLabels[session.status]}</span></div><h3>{session.name}</h3><p>Complete applicable session period</p><div className="price">{formatInr(session.priceInr)}<small> / session</small></div><p className="session-deposit">+ {formatInr(session.depositInr)} refundable security deposit</p>{isBookable(session) ? <Link className="button button-primary" href={`/rent-cx3/booking?session=${session.id}`}>Book this session <span>↗</span></Link> : <span className="button button-disabled" aria-disabled="true">{sessionStatusLabels[session.status]}</span>}</article>)}</div>
        : <div className="session-empty"><p>No examination sessions are open for booking right now. We&apos;ll share new sessions as soon as they open.</p><WhatsAppCta message={whatsappMessages.sessionUpdates} label="Get notified on WhatsApp" /></div>}
    </div></section>
    <section className="dark-section rent-note"><div className="shell rent-note-inner"><div><p className="eyebrow">Before you book</p><h2>No hidden variables.<br />A refundable deposit.</h2></div><div><p>Have your full delivery address, Aadhaar number, DGCA computer number, passport-size photo and last exam date ready. You pay the rental and a refundable {formatInr(SECURITY_DEPOSIT_INR)} security deposit, and accept our Terms &amp; Conditions and Refund Policy before payment. We courier the CX-3 to you, you keep it until the day after your last exam, and then we arrange the return pickup.</p><div className="rent-note-links"><Link href="/terms">Terms &amp; Conditions →</Link><Link href="/refund-policy">Refund Policy →</Link><Link href="/track">Track your booking →</Link></div></div></div></section>
    <section className="section rent-owner"><div className="shell rent-note-inner"><div><p className="eyebrow">Own a CX-3?</p><h2>Rent your CX-3<br /><em>with us.</em></h2></div><div><p>Have a CX-3 you&apos;re not using between exams? Message us on WhatsApp and our team will take you through owner onboarding.</p><WhatsAppCta message={whatsappMessages.rentOutCx3} label="Rent Your CX-3" /></div></div></section>
  </main>;
}
