import { NextResponse } from "next/server";
import { isRazorpayWebhookConfigured, isValidWebhookSignature } from "@/src/lib/razorpay/server";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";

type WebhookEvent = {
  event?: string;
  payload?: { payment?: { entity?: { id?: unknown; order_id?: unknown } } };
};

// Razorpay calls this for payment events (Dashboard → Webhooks, secret in
// RAZORPAY_WEBHOOK_SECRET). It confirms bookings even when the customer closes the
// page before the checkout callback reaches us. Razorpay retries non-2xx responses,
// and confirming an already-verified payment changes nothing.
export async function POST(request: Request) {
  if (!isBookingServiceConfigured() || !isRazorpayWebhookConfigured()) {
    return NextResponse.json({ message: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!isValidWebhookSignature(rawBody, request.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const paid = event.event === "payment.captured" || event.event === "order.paid";
  if (paid && typeof payment?.id === "string" && typeof payment.order_id === "string") {
    const { data, error } = await createServiceClient().rpc("confirm_razorpay_payment", {
      p_order_id: payment.order_id,
      p_payment_id: payment.id,
      p_source: `webhook:${event.event}`,
    });
    if (error) {
      console.error("Razorpay webhook confirmation failed", error.message);
      return NextResponse.json({ message: "Try again later." }, { status: 500 });
    }
    if (!data) console.warn("Razorpay webhook for an order this site didn't create", payment.order_id);
  }

  return NextResponse.json({ received: true });
}
