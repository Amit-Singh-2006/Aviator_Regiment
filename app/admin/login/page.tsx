import Image from "next/image";
import { redirect } from "next/navigation";
import { ActionForm } from "@/src/components/admin/action-form";
import { getAdminSession } from "@/src/lib/supabase/auth";
import { signIn, signOut } from "@/src/modules/users/auth-actions";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getAdminSession();
  if (session.status === "admin") redirect("/admin");
  const { error } = await searchParams;

  return <main className="admin-login">
    <div className="admin-login-card">
      <Image className="admin-logo" src="/images/logo.png" alt="" width={56} height={56} priority />
      <p className="eyebrow">Aviator&apos;s Regiment</p>
      <h1>Operations console</h1>
      <p className="admin-muted">Sign in with your admin account.</p>
      {error === "not-admin" || session.status === "not_admin" ? <p className="action-message error" role="alert">That account doesn&apos;t have admin access. Sign in with an admin account.</p> : null}
      <ActionForm action={signIn} className="admin-form">
        <label>Email<input type="email" name="email" autoComplete="username" required /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
        <button className="admin-button primary" type="submit">Sign in</button>
      </ActionForm>
      {session.status === "not_admin" ? <form action={signOut} className="admin-login-signout"><button type="submit" className="admin-link">Sign out of the other account</button></form> : null}
    </div>
  </main>;
}
