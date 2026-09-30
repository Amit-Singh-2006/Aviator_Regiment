import Link from "next/link";

const pillars = [
  ["01", "Clearer direction", "The right information, support and tools for every stage of your aviation journey."],
  ["02", "Built around you", "From exam preparation to CX-3 rental, practical help without the noise."],
  ["03", "Ready for altitude", "A community and ecosystem designed to move with your ambitions."],
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-grid" />
        <div className="shell hero-content">
          <div className="hero-copy">
            <p className="eyebrow">Aviation, made human</p>
            <h1>Your flight path <em>starts here.</em></h1>
            <p className="hero-lede">Aviator&apos;s Regiment brings the guidance, access and momentum ambitious aviators need to take off.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/rent-cx3">Rent CX-3 <span>↗</span></Link>
              <Link className="text-link" href="#why-us">Explore the regiment <span>↓</span></Link>
            </div>
          </div>
          <div className="hero-art" aria-label="Abstract aircraft wing illustration">
            <div className="radar radar-one" /><div className="radar radar-two" />
            <div className="flight-line" /><div className="aircraft">✦</div>
            <span className="coordinate">28°36′N / 77°12′E</span>
            <span className="altitude">ALT 038,000 FT</span>
          </div>
        </div>
        <div className="hero-foot shell"><span>Scroll to explore</span><span className="scroll-line" /><span>EST. 2024 / INDIA</span></div>
      </section>

      <section className="section intro-section" id="why-us">
        <div className="shell">
          <div className="section-heading">
            <div><p className="eyebrow">Why Aviator&apos;s Regiment</p><h2>Not just a destination. A departure point.</h2></div>
            <p>Whether you are taking your first step or your next big one, we are here to make the journey feel possible.</p>
          </div>
          <div className="pillar-grid">{pillars.map(([number, title, text]) => <article className="pillar" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="dark-section service-feature">
        <div className="shell service-grid">
          <div><p className="eyebrow">Featured service / 01</p><h2>Get closer<br />to the cockpit.</h2><p className="service-copy">Rent a CX-3 for your complete DGCA examination session. One session. One reliable device. Zero unnecessary complications.</p><Link className="button button-light" href="/rent-cx3">Explore Rent CX-3 <span>↗</span></Link></div>
          <div className="device-card"><div className="device-top"><span>CX—3</span><span>AR / RENTAL</span></div><div className="device-screen"><span className="screen-label">FLIGHT COMPUTER</span><strong>READY</strong><div className="screen-orbit" /></div><div className="device-bottom"><span>Precision instrument</span><span>01 / 04</span></div></div>
        </div>
      </section>

      <section className="section final-cta"><div className="shell final-cta-inner"><p className="eyebrow">Your next chapter</p><h2>Make the move<br /><em>that moves you.</em></h2><Link className="button button-primary" href="/services">See how we can help <span>↗</span></Link></div></section>
    </main>
  );
}
