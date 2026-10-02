"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/sessions", label: "Sessions & prices" },
  { href: "/admin/units", label: "CX-3 units" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/news/sources", label: "News sources" },
  { href: "/admin/careers", label: "Careers" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  // The longest matching link is active, so /admin/news/sources doesn't also light up News.
  const active = links.filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];

  return <nav aria-label="Admin">
    {links.map((link) => <Link key={link.href} href={link.href} className={link === active ? "active" : undefined} aria-current={link === active ? "page" : undefined}>
      {link.label}
      {badges[link.href] ? <span className="nav-badge" aria-label={`${badges[link.href]} waiting`}>{badges[link.href]}</span> : null}
    </Link>)}
  </nav>;
}
