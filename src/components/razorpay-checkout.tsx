"use client";

import { useState } from "react";
import { onlinePaymentAmount } from "@/src/lib/razorpay/fee";
import { formatInr } from "@/src/modules/exam-sessions/sessions";

type CheckoutSuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutFailure = { error?: { description?: string } };
type CheckoutInstance = { open(): void; on(event: "payment.failed", handler: (response: CheckoutFailure) => void): void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => CheckoutInstance;
  }
}

let checkoutScript: Promise<boolean> | null = null;

// Loads Razorpay Checkout only when a customer chooses to pay online.
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  checkoutScript ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      checkoutScript = null;
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
}

async function postJson(url: string, body: unknown) {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    return { ok: response.ok, result };
  } catch {
    return { ok: false, result: { message: "Network error. Check your connection and try again." } };
  }
}

type Props = {
  bookingCode: string;
  rentalInr: number;
  // The booking's phone number or email, which the server checks before creating an order.
  contact: string;
  prefill: { name?: string; email?: string; contact?: string };
  onPaid: () => void | Promise<void>;
};

// Pays an unpaid booking through Razorpay Checkout (UPI apps, cards, net banking,
// wallets). The booking is confirmed by the server once Razorpay's signature checks out.
export function RazorpayCheckout({ bookingCode, rentalInr, contact, prefill, onPaid }: Props) {
  const [state, setState] = useState<"idle" | "opening" | "open" | "verifying">("idle");
  const [message, setMessage] = useState("");
  const { totalInr, feeInr } = onlinePaymentAmount(rentalInr);

  async function verify(response: CheckoutSuccess) {
    setState("verifying");
    const { ok, result } = await postJson(`/api/bookings/${bookingCode}/razorpay/verify`, response);
    if (!ok) {
      setMessage(result.message ?? "We couldn't confirm your payment. If money was deducted, it will be confirmed automatically; check the tracking page in a few minutes.");
      setState("idle");
      return;
    }
    await onPaid();
  }

  async function pay() {
    if (state !== "idle") return;
    setState("opening");
    setMessage("");
    const [loaded, order] = await Promise.all([loadCheckout(), postJson(`/api/bookings/${bookingCode}/razorpay/order`, { contact })]);
    if (!order.ok) {
      setMessage(order.result.message ?? "We couldn't start the online payment. Please try again, or pay by UPI.");
      setState("idle");
      return;
    }
    if (!loaded || !window.Razorpay) {
      setMessage("The secure payment window couldn't load. Check your connection, or pay by UPI below.");
      setState("idle");
      return;
    }

    const checkout = new window.Razorpay({
      key: order.result.keyId,
      order_id: order.result.orderId,
      amount: order.result.amount,
      currency: order.result.currency,
      name: "Aviator's Regiment",
      description: `CX-3 rental · ${bookingCode}`,
      image: `${window.location.origin}/images/logo.png`,
      prefill,
      notes: { booking_code: bookingCode },
      theme: { color: "#0a1b3d" },
      handler: (response: CheckoutSuccess) => void verify(response),
      modal: {
        confirm_close: true,
        ondismiss: () => {
          setState((current) => (current === "open" ? "idle" : current));
          setMessage((current) => current || "Payment cancelled. You can try again, or pay by UPI below.");
        },
      },
    });
    checkout.on("payment.failed", (response) => {
      setMessage(`Payment failed${response.error?.description ? `: ${response.error.description}` : "."} You can try again.`);
    });
    setState("open");
    checkout.open();
  }

  const label = {
    idle: <>Pay {formatInr(totalInr)} online <span>↗</span></>,
    opening: "Opening secure checkout…",
    open: "Complete the payment in the Razorpay window",
    verifying: "Confirming your payment…",
  }[state];

  return <div className="online-payment">
    <p className="eyebrow">Pay online · instant confirmation</p>
    <p className="online-payment-methods">UPI apps, cards, net banking and wallets, through Razorpay&apos;s secure checkout.</p>
    <div className="upi-amount"><span>Online total<small>Includes {formatInr(feeInr)} payment gateway fee</small></span><strong>{formatInr(totalInr)}</strong></div>
    {message && <p className="form-error upi-error" role="alert">{message}</p>}
    <button type="button" className="button button-primary submit-button" onClick={pay} disabled={state !== "idle"}>{label}</button>
  </div>;
}
