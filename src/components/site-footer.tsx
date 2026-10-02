import Image from "next/image";
import Link from "next/link";
import { CommunityLinks } from "@/src/components/community-links";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

const exploreLinks = [
  { href: "/rent-cx3", label: "Rent CX-3" },
  { href: "/services", label: "Aviation Services" },
  { href: "/aviation-news", label: "Aviation News" },
  { href: "/careers", label: "Careers" },
  { href: "/coaching", label: "Coaching" },
  { href: "/community", label: "Community" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/about", label: "About" },
];

const supportLinks = [
  { href: "/track", label: "Track your booking" },
  { href: "/contact", label: "Contact us" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "No-Refund Policy" },
  { href: "/shipping-policy", label: "Shipping & Delivery" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer-inner">
        <div>
          <Image className="site-footer-logo" src="/images/logo.png" alt="" width={88} height={88} />
          <p className="eyebrow">Aviator&apos;s Regiment</p>
          <h2>Your flight path starts here.</h2>
          <CommunityLinks className="site-footer-community" />
        </div>
        <div className="site-footer-links">
          <nav className="site-footer-column" aria-label="Footer">
            <h3>Explore</h3>
            {exploreLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </nav>
          <div className="site-footer-column">
            <h3>Support</h3>
            {supportLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            <a href={whatsappLink(whatsappMessages.rentOutCx3)} target="_blank" rel="noreferrer">Rent out your CX-3 ↗</a>
          </div>
        </div>
        <p className="site-footer-meta">© {new Date().getFullYear()} Aviator&apos;s Regiment</p>
      </div>
    </footer>
  );
}
