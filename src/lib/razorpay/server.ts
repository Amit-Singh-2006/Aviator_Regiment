import "server-only";
import { matchesRazorpaySignature } from "@/src/lib/razorpay/signature";

// Server-side Razorpay access. The key ID is public (Checkout needs it); the key
// secret and webhook secret must never reach the browser.
const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export function isRazorpayConfigured() {
  return Boolean(keyId() && keySecret());
}

export function isRazorpayWebhookConfigured() {
  return Boolean(webhookSecret());
}

export function razorpayKeyId() {
  return keyId();
}

export class RazorpayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type RazorpayOrder = { id: string; amount: number; currency: string };

// Creates an order with the Orders API; Checkout can only charge the amount set here.
export async function createRazorpayOrder({ amountInr, receipt, notes }: { amountInr: number; receipt: string; notes: Record<string, string> }) {
  const amount = amountInr * 100;
  if (!Number.isInteger(amount) || amount < 100) {
    throw new RazorpayError("Razorpay orders need at least 100 paise.", 400);
  }
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt, notes }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RazorpayError(body?.error?.description ?? `Razorpay returned ${response.status}.`, response.status);
  }
  return body as RazorpayOrder;
}

// Checkout's success handler returns this signature; only a matching one proves payment.
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return matchesRazorpaySignature(`${orderId}|${paymentId}`, signature, keySecret());
}

export function isValidWebhookSignature(rawBody: string, signature: string) {
  return matchesRazorpaySignature(rawBody, signature, webhookSecret());
}
