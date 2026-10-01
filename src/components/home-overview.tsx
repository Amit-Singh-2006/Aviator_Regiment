import Link from "next/link";

const overviewSections = [
  {
    id: "aviation-services",
    number: "03",
    eyebrow: "Aviation Services",
    title: "Practical support for every stage of your flight path.",
    text: "From DGCA computer number assistance to medical and NIOS guidance, get clear help without the runaround.",
    href: "/services",
    link: "Explore services",
  },
  {
    id: "aviation-news",
    number: "04",
    eyebrow: "Aviation News",
    title: "Stay close to what is changing in aviation.",
    text: "DGCA updates, exam news, industry movement and stories worth knowing — gathered with source-first context.",
    href: "/aviation-news",
    link: "Read aviation news",
  },
  {
    id: "aviation-careers",
    number: "05",
    eyebrow: "Aviation Careers",
    title: "A clearer view of the careers above the clouds.",
    text: "Explore the routes into commercial flying, instruction, defence, cabin crew, engineering and more.",
    href: "/careers",
    link: "View career paths",
  },
  {
    id: "coaching",
    number: "06",
    eyebrow: "Coaching",
    title: "Build the confidence behind the certificate.",
    text: "Focused coaching and guidance for aspiring pilots who want a structured next step.",
    href: "/coaching",
    link: "Discover coaching",
  },
  {
    id: "community",
    number: "07",
    eyebrow: "Community",
    title: "You do not have to navigate aviation alone.",
    text: "Connect with people learning, training and building their place in the aviation community.",
    href: "/community",
    link: "Join the community",
  },
  {
    id: "about",
    number: "08",
    eyebrow: "About Aviator's Regiment",
    title: "A grounded team for ambitious flight paths.",
    text: "We bring practical aviation support, useful information and a long-term view of your journey.",
    href: "/about",
    link: "About us",
  },
];

function OverviewSection({
  id,
  number,
  eyebrow,
  title,
  text,
  href,
  link,
  alternate = false,
}: (typeof overviewSections)[number] & { alternate?: boolean }) {
  return (
    <section className={`home-overview-section${alternate ? " home-overview-section-alt" : ""}`} id={id}>
      <div className="shell home-overview-section-inner">
        <span className="home-overview-number">{number}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="home-overview-detail">
          <p>{text}</p>
          <Link className="home-overview-link" href={href}>
            {link} <span>↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeOverview() {
  return (
    <>
      <section className="home-rent-preview" id="rent-cx3">
        <div className="shell home-rent-preview-inner">
          <div>
            <p className="eyebrow">02 / Rent CX-3</p>
            <h2>One complete session.<br /><em>Clear, reliable access.</em></h2>
          </div>
          <div className="home-overview-detail">
            <p>Choose your DGCA exam session and leave the aircraft logistics to us. No security deposit, no per-day pricing.</p>
            <Link className="home-overview-link" href="/rent-cx3">
              See sessions <span>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {overviewSections.map((section, index) => (
        <OverviewSection key={section.id} {...section} alternate={index % 2 === 1} />
      ))}

      <footer className="home-footer">
        <div className="shell home-footer-inner">
          <div>
            <p className="eyebrow">Aviator&apos;s Regiment</p>
            <h2>Your flight path starts here.</h2>
          </div>
          <div className="home-footer-links">
            <Link href="/rent-cx3">Rent CX-3</Link>
            <Link href="/services">Services</Link>
            <Link href="/aviation-news">News</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/about">About</Link>
          </div>
          <p className="home-footer-meta">© {new Date().getFullYear()} Aviator&apos;s Regiment</p>
        </div>
      </footer>
    </>
  );
}
