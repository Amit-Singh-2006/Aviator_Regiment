import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay signs checkout results (order_id|payment_id) and webhook bodies with
// HMAC-SHA256, using the key secret and the webhook secret respectively.
export function razorpaySignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function matchesRazorpaySignature(payload: string, signature: string, secret: string) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(razorpaySignature(payload, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
