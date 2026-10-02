import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/src/db/database.types";

// Admin sessions live in cookies and every query runs as the signed-in user, so
// row level security decides what each request can read or change.
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't write cookies; middleware.ts refreshes the session instead.
        }
      },
    },
  });
}

export type AuthClient = Awaited<ReturnType<typeof createAuthClient>>;

type AdminSession =
  | { status: "signed_out" }
  | { status: "not_admin" }
  | { status: "admin"; userId: string; email: string; name: string; supabase: AuthClient };

// The signed-in admin for this request. Admin rights come from public.admin_users,
// which only admins can read.
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { status: "signed_out" };

  const { data: admin } = await supabase.from("admin_users").select("full_name").eq("user_id", claims.sub).maybeSingle();
  if (!admin) return { status: "not_admin" };

  const email = typeof claims.email === "string" ? claims.email : "";
  return { status: "admin", userId: claims.sub, email, name: admin.full_name || email || "Admin", supabase };
});

export async function requireAdmin() {
  const session = await getAdminSession();
  if (session.status !== "admin") redirect(session.status === "not_admin" ? "/admin/login?error=not-admin" : "/admin/login");
  return session;
}
