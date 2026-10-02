import { NextResponse } from "next/server";
import { isRazorpayConfigured, isValidCheckoutSignature } from "@/src/lib/razorpay/server";
import { clientIp, hashIdentifier, isRateLimited, tooManyRequests } from "@/src/lib/rate-limit";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import type { BookingStatus } from "@/src/modules/bookings/tracking";

const field = (input: Record<string, unknown>, name: string, pattern: RegExp) => {
  const value = input[name];
  return typeof value === "string" && pattern.test(value) ? value : "";
};

// Confirms a booking after Razorpay Checkout reports success. The signature
// (HMAC of order_id|payment_id with the key secret) proves Razorpay took the payment;
// without a match nothing is marked paid. The webhook confirms the same payment
// independently, so a lost response here doesn't lose the booking.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isBookingServiceConfigured() || !isRazorpayConfigured()) {
    return NextResponse.json({ message: "Online payment isn't available right now." }, { status: 503 });
  }

  const bookingCode = normalizeBookingId((await params).code);
  if (!BOOKING_ID_PATTERN.test(bookingCode)) {
    return NextResponse.json({ message: "We couldn't find this booking." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const orderId = field(input, "razorpay_order_id", /^order_[A-Za-z0-9]{8,40}$/);
  const paymentId = field(input, "razorpay_payment_id", /^pay_[A-Za-z0-9]{8,40}$/);
  const signature = field(input, "razorpay_signature", /^[a-f0-9]{64}$/);
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ message: "The payment details are missing or incomplete." }, { status: 400 });
  }

  if (await isRateLimited([{ key: `razorpay-verify:ip:${hashIdentifier(clientIp(request.headers))}`, limit: 20, windowSeconds: 600 }])) {
    return tooManyRequests();
  }

  if (!isValidCheckoutSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ message: "We couldn't verify this payment. If money was deducted, message us on WhatsApp with your Booking ID." }, { status: 400 });
  }

  const { data, error } = await createServiceClient().rpc("confirm_razorpay_payment", {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_source: "checkout",
  });
  if (error) {
    console.error("Razorpay payment confirmation failed", error.message);
    return NextResponse.json({ message: "Your payment went through, but we couldn't update your booking yet. It will be confirmed automatically shortly." }, { status: 500 });
  }

  const result = data as { bookingCode: string; status: BookingStatus } | null;
  if (!result || result.bookingCode !== bookingCode) {
    return NextResponse.json({ message: "This payment doesn't belong to this booking." }, { status: 400 });
  }
  return NextResponse.json({ status: result.status });
}
