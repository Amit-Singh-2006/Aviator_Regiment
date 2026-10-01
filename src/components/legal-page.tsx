import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, intro, updated, children }: { eyebrow: string; title: ReactNode; intro: string; updated: string; children: ReactNode }) {
  return (
    <main>
      <section className="content-hero">
        <div className="shell">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <p className="legal-updated">Last updated: {updated}</p>
        </div>
      </section>
      <section className="section">
        <article className="shell legal-content">{children}</article>
      </section>
    </main>
  );
}
