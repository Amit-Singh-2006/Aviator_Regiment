// Public, build-time configuration. Set these in .env.local (see .env.example).
export const siteConfig = {
  name: "Aviator's Regiment",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://aviatorsregiment.com").replace(/\/+$/, ""),
  // Digits only, including the country code (e.g. 919876543210). When unset,
  // WhatsApp links open a share sheet instead of messaging a stranger's number.
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  whatsappCommunityUrl: process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? "",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "",
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "",
  upiPayeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "Aviator's Regiment",
  // Path under /public or an absolute URL of the business UPI QR code image.
  upiQrImage: process.env.NEXT_PUBLIC_UPI_QR_IMAGE ?? "",
};
