import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/src/components/admin/admin-nav";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { signOut } from "@/src/modules/users/auth-actions";

export default async function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  const [paymentsToVerify, draftsToReview] = await Promise.all([
    admin.supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "payment_review"),
    admin.supabase.from("news_articles").select("id", { count: "exact", head: true }).in("status", ["draft", "review"]),
  ]);
  const initials = admin.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="admin-page">
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand">
        <Image className="admin-logo" src="/images/logo.png" alt="" width={36} height={36} />
        <b>Aviator&apos;s Regiment<br /><span>Operations</span></b>
      </Link>
      <AdminNav badges={{ "/admin/bookings": paymentsToVerify.count ?? 0, "/admin/news": draftsToReview.count ?? 0 }} />
      <div className="admin-user">
        <span aria-hidden="true">{initials}</span>
        <div><b>{admin.name}</b><small>{admin.email}</small></div>
        <form action={signOut}><button type="submit" className="admin-signout">Sign out</button></form>
      </div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
