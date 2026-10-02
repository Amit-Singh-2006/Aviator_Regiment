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

const isDev = process.env.NODE_ENV !== "production";

// Next.js adds inline scripts, so scripts and styles allow 'unsafe-inline'; development
// also needs eval and a websocket for hot reload. Images may come from any HTTPS host
// (news images, signed links to private documents in the admin panel). Razorpay
// Checkout loads its script, opens its payment window in a frame and reports to its API.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://cdn.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""} https://*.razorpay.com`,
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // News images are uploaded through a server action (up to 5 MB plus form fields).
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://api.razorpay.com\"), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
