import type { NextConfig } from "next";

// Bookings, WhatsApp enquiries and UPI payment details depend on these values.
const missingEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
  "NEXT_PUBLIC_UPI_ID",
].filter((name) => !process.env[name]);
if (process.env.NODE_ENV === "production" && missingEnv.length > 0 && !process.env.AR_ENV_WARNING_SHOWN) {
  // Build workers inherit this flag, so the warning prints once per build.
  process.env.AR_ENV_WARNING_SHOWN = "1";
  console.warn(`⚠ Missing ${missingEnv.join(", ")}: bookings, WhatsApp links or UPI payment details will not work fully. See .env.example.`);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
