"use client";

import Link from "next/link";
import { useEffect } from "react";
import { whatsappLink, whatsappMessages } from "@/src/lib/whatsapp";

// Shown inside the site header and footer when a public page fails to load
// (for example, if the database can't be reached).
export default function MarketingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <main className="content-hero">
    <div className="shell">
      <p className="eyebrow">Something went wrong</p>
      <h1>We hit some<br /><em>turbulence.</em></h1>
      <p>This page couldn&apos;t load just now. Please try again in a moment, or message us on WhatsApp and we&apos;ll help.</p>
      <div className="community-links">
        <button type="button" className="button button-primary" onClick={reset}>Try again</button>
        <a className="button button-ghost" href={whatsappLink(whatsappMessages.general)} target="_blank" rel="noreferrer">Message us on WhatsApp ↗</a>
        <Link className="button button-ghost" href="/">Back to home</Link>
      </div>
    </div>
  </main>;
}
