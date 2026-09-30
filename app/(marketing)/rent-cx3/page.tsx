import Link from "next/link";

const sessions = [
  { type: "OLODE", name: "FC OLODE 03", price: "₹2,000", note: "Complete applicable session period", status: "Available" },
  { type: "REGULAR", name: "FC Regular 04", price: "₹2,500", note: "Complete applicable session period", status: "Available" },
];

export const metadata = { title: "Rent CX-3", description: "Rent a CX-3 for your complete DGCA examination session." };

export default function RentCx3Page() {
  return <main>
    <section className="rent-hero"><div className="shell"><p className="eyebrow">Rent CX-3 / DGCA sessions</p><h1>Focus on the exam.<br /><em>We&apos;ll handle the rest.</em></h1><p>Reliable CX-3 access for the complete examination session — not per day, not per hour.</p></div></section>
    <section className="section sessions-section"><div className="shell"><div className="section-heading"><div><p className="eyebrow">Choose your session</p><h2>One session.<br />Clear pricing.</h2></div><p>Select the DGCA examination session you&apos;re appearing for. Your rental covers the complete applicable session period.</p></div><div className="session-grid">{sessions.map((session) => <article className="session-card" key={session.name}><div className="session-card-top"><span className="session-type">{session.type}</span><span className="availability"><i />{session.status}</span></div><h3>{session.name}</h3><p>{session.note}</p><div className="price">{session.price}<small> / session</small></div><Link className="button button-primary" href={`/rent-cx3/booking?session=${encodeURIComponent(session.name)}`}>Book this session <span>↗</span></Link></article>)}</div></div></section>
    <section className="dark-section rent-note"><div className="shell rent-note-inner"><div><p className="eyebrow">Before you book</p><h2>No hidden variables.<br />No security deposit.</h2></div><p>Have your full delivery address, DGCA registration number and passport-size photo ready. A no-refund policy acceptance is required before payment.</p></div></section>
  </main>;
}
