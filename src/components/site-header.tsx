"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

  return (
    <header className={pathname === "/" ? `site-header home-header ${revealed ? "header-revealed" : ""}` : "site-header"}>
      <div className="header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">AR</span>
          <span>Aviator&apos;s<br /><b>Regiment</b></span>
        </Link>
        <nav className={open ? "nav nav-open" : "nav"} aria-label="Primary navigation">
          <Link href="/rent-cx3">Rent CX-3</Link>
          <Link href="/services">Services</Link>
          <Link href="/aviation-news">News</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link className="header-cta" href="/rent-cx3">Start your flight path <span>↗</span></Link>
        <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          {open ? "×" : "☰"}
        </button>
      </div>
    </header>
  );
}
