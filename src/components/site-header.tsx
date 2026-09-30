"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
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
