import { NextResponse } from "next/server";
import { onlinePaymentAmount } from "@/src/lib/razorpay/fee";
import { createRazorpayOrder, isRazorpayConfigured, RazorpayError, razorpayKeyId } from "@/src/lib/razorpay/server";
import { clientIp, hashIdentifier, isRateLimited, tooManyRequests } from "@/src/lib/rate-limit";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import type { BookingStatus } from "@/src/modules/bookings/tracking";
import { normalizeContact } from "@/src/modules/bookings/validation";

type CheckoutState = { status: BookingStatus; amountInr: number; orderId: string | null; orderAmountInr: number | null };

const notFound = () => NextResponse.json({ message: "We couldn't find a booking with those details." }, { status: 404 });
const failed = () => NextResponse.json({ message: "We couldn't start the online payment. Please try again, or pay by UPI." }, { status: 502 });

// Creates (or reuses) the Razorpay order for an unpaid booking. The customer
// identifies with the booking's phone number or email, as on the tracking page.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isBookingServiceConfigured() || !isRazorpayConfigured()) {
    return NextResponse.json({ message: "Online payment isn't available right now. Please pay by UPI." }, { status: 503 });
  }

  const bookingCode = normalizeBookingId((await params).code);
  if (!BOOKING_ID_PATTERN.test(bookingCode)) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const contact = normalizeContact(typeof input.contact === "string" ? input.contact : "");
  if (!contact) {
    return NextResponse.json({ message: "Enter the phone number or email used for this booking." }, { status: 422 });
  }

  const ip = hashIdentifier(clientIp(request.headers));
  if (await isRateLimited([
    { key: `razorpay-order:ip:${ip}`, limit: 20, windowSeconds: 600 },
    { key: `razorpay-order:booking:${bookingCode}`, limit: 10, windowSeconds: 600 },
  ])) {
    return tooManyRequests();
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("razorpay_checkout_state", { p_booking_code: bookingCode, p_contact: contact });
  if (error) {
    console.error("Razorpay checkout lookup failed", error.message);
    return failed();
  }
  if (!data) return notFound();

  const state = data as CheckoutState;
  if (state.status !== "payment_pending") {
    const message = state.status === "payment_review"
      ? "We're already checking the UPI payment screenshot for this booking."
      : "The payment for this booking is already complete.";
    return NextResponse.json({ message }, { status: 409 });
  }

  const { totalInr, feeInr } = onlinePaymentAmount(state.amountInr);
  let orderId = state.orderId && state.orderAmountInr === totalInr ? state.orderId : null;
  if (!orderId) {
    try {
      const order = await createRazorpayOrder({ amountInr: totalInr, receipt: bookingCode, notes: { booking_code: bookingCode } });
      orderId = order.id;
    } catch (orderError) {
      if (orderError instanceof RazorpayError && orderError.status === 401) {
        console.error("Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
      } else {
        console.error("Razorpay order creation failed", orderError instanceof Error ? orderError.message : orderError);
      }
      return failed();
    }

    const { error: recordError } = await supabase.rpc("record_razorpay_order", {
      p_booking_code: bookingCode,
      p_order_id: orderId,
      p_amount_inr: totalInr,
      p_fee_inr: feeInr,
    });
    if (recordError) {
      if (recordError.message.includes("payment_already_processed")) {
        return NextResponse.json({ message: "The payment for this booking is already complete." }, { status: 409 });
      }
      console.error("Razorpay order could not be saved", recordError.message);
      return failed();
    }
  }

  return NextResponse.json({ keyId: razorpayKeyId(), orderId, amount: totalInr * 100, currency: "INR", amountInr: totalInr, feeInr });
}
