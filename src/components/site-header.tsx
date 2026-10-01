"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/services", label: "Services" },
  { href: "/aviation-news", label: "News" },
  { href: "/careers", label: "Careers" },
  { href: "/coaching", label: "Coaching" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      setRevealed(true);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRevealed(true), reducedMotion ? 0 : 2900);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const closeMenu = () => setOpen(false);

  return (
    <header className={pathname === "/" ? `site-header home-header ${revealed ? "header-revealed" : ""}` : "site-header"}>
      <div className="header-inner">
        <Link className="brand" href="/" onClick={closeMenu}>
          <Image className="brand-logo" src="/images/logo.png" alt="" width={38} height={38} priority />
          <span className="brand-text"><b>Aviator&apos;s</b><small>Regiment</small></span>
        </Link>
        <div className="header-actions">
          <nav id="primary-navigation" className={open ? "nav nav-open" : "nav"} aria-label="Primary navigation">
            {navigation.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} onClick={closeMenu}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link className="header-cta" href="/rent-cx3" onClick={closeMenu}>Rent CX-3 <span aria-hidden="true">↗</span></Link>
        </div>
        <button
          type="button"
          className="menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>
    </header>
  );
}
