import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/db/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

export const BOOKING_DOCUMENTS_BUCKET = "booking-documents";

// Public reads (open sessions and prices) use the publishable key, limited by RLS.
export function createPublicClient() {
  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  }
  return createClient<Database>(url, publishableKey, options);
}

export function isBookingServiceConfigured() {
  return Boolean(url && secretKey);
}

// Customer data is written with the secret key, which must never reach the browser.
export function createServiceClient() {
  if (!url || !secretKey) {
    throw new Error("Supabase secret key is missing. Set SUPABASE_SECRET_KEY (see .env.example).");
  }
  return createClient<Database>(url, secretKey, options);
}
