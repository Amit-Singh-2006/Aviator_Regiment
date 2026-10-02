import type { Metadata } from "next";
import "./admin.css";

// Admin pages depend on the signed-in user, so they are never prerendered
// (this also keeps builds without Supabase settings, such as CI, working).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Operations console", template: "%s | Operations console" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
