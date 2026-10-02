"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/src/components/admin/action-form";
import { clientIp, hashIdentifier, isRateLimited } from "@/src/lib/rate-limit";
import { createAuthClient } from "@/src/lib/supabase/auth";

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  // Slows down password guessing, per visitor and per account.
  if (await isRateLimited([
    { key: `login:ip:${hashIdentifier(clientIp(await headers()))}`, limit: 10, windowSeconds: 600 },
    { key: `login:email:${hashIdentifier(email)}`, limit: 8, windowSeconds: 600 },
  ])) {
    return { error: "Too many sign-in attempts. Wait 10 minutes and try again." };
  }

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: error?.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password don't match an admin account." };
  }

  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
