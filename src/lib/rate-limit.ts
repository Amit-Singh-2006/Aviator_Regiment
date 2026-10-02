import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";

export type RateLimitRule = { key: string; limit: number; windowSeconds: number };

// The visitor's IP as reported by the hosting proxy (first hop of x-forwarded-for).
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

// Keyed hash, so rate-limit rows never store raw IP addresses, phone numbers or emails.
export function hashIdentifier(value: string) {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "aviators-regiment").update(value.toLowerCase()).digest("hex").slice(0, 32);
}

// Fixed-window limits counted in Postgres (public.consume_rate_limit), so they hold
// across serverless instances. If the check itself fails, the request is allowed:
// a database hiccup shouldn't lock customers out.
export async function isRateLimited(rules: RateLimitRule[]) {
  if (!isBookingServiceConfigured()) return false;
  const supabase = createServiceClient();
  for (const rule of rules) {
    const { data, error } = await supabase.rpc("consume_rate_limit", { p_key: rule.key, p_limit: rule.limit, p_window_seconds: rule.windowSeconds });
    if (error) {
      console.error("Rate limit check failed", error.message);
      continue;
    }
    if (data === false) return true;
  }
  return false;
}

export function tooManyRequests() {
  return NextResponse.json({ message: "Too many attempts. Please wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": "600" } });
}
