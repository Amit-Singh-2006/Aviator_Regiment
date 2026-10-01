import type { NextConfig } from "next";

// WhatsApp enquiries and UPI payment details depend on these public values.
const missingEnv = ["NEXT_PUBLIC_WHATSAPP_NUMBER", "NEXT_PUBLIC_UPI_ID"].filter((name) => !process.env[name]);
if (process.env.NODE_ENV === "production" && missingEnv.length > 0 && !process.env.AR_ENV_WARNING_SHOWN) {
  // Build workers inherit this flag, so the warning prints once per build.
  process.env.AR_ENV_WARNING_SHOWN = "1";
  console.warn(`⚠ Missing ${missingEnv.join(", ")}: WhatsApp links and UPI payment details are incomplete. See .env.example.`);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
