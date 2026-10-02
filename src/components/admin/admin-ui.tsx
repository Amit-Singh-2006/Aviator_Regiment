import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "neutral" | "warn" | "good" | "bad" | "info";

export function AdminHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return <header className="admin-top">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
    {children ? <div className="admin-top-actions">{children}</div> : null}
  </header>;
}

export function Panel({ title, children, actions, className }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <section className={className ? `admin-panel ${className}` : "admin-panel"}>
    {title || actions ? <div className="panel-heading">{title ? <h2>{title}</h2> : <span />}{actions}</div> : null}
    {children}
  </section>;
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className="admin-pill" data-tone={tone}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="admin-empty">{children}</p>;
}

export function Tabs({ items, active }: { items: { id: string; label: string; href: string; count?: number }[]; active: string }) {
  return <nav className="admin-tabs" aria-label="Filter">
    {items.map((item) => <Link key={item.id} href={item.href} className={item.id === active ? "active" : undefined} aria-current={item.id === active ? "page" : undefined}>
      {item.label}{item.count ? <span>{item.count}</span> : null}
    </Link>)}
  </nav>;
}
