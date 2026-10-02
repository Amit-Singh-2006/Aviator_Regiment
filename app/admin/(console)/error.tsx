"use client";

import { useEffect } from "react";

// Shown inside the admin console when a page fails to load.
export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <section className="admin-panel">
    <p className="eyebrow">Something went wrong</p>
    <h1 className="admin-error-title">This page couldn&apos;t load.</h1>
    <p className="admin-muted">Check your connection and try again. If it keeps happening, the database may be unavailable; your data is safe.</p>
    <div className="button-row admin-error-actions"><button type="button" className="admin-button primary" onClick={reset}>Try again</button></div>
  </section>;
}
