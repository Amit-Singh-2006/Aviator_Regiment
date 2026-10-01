import Link from "next/link";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="content-hero">
        <div className="shell">
          <p className="eyebrow">404 / Off course</p>
          <h1>This page is<br /><em>off the chart.</em></h1>
          <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="community-links">
            <Link className="button button-primary" href="/">Back to home</Link>
            <Link className="button button-ghost" href="/rent-cx3">Rent CX-3</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
