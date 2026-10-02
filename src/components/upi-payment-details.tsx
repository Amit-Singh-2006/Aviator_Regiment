"use client";

import { useState } from "react";
import { siteConfig } from "@/src/lib/site-config";

// Amount, QR code and copyable UPI ID, shared by the booking flow and the tracking page.
export function UpiPaymentDetails({ amount, bookingId }: { amount: string; bookingId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(siteConfig.upiId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <>
    <div className="upi-amount"><span>Pay exactly</span><strong>{amount}</strong></div>
    {siteConfig.upiQrImage
      // A plain img keeps this page light; QR codes must not be recompressed anyway.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img className="upi-qr" src={siteConfig.upiQrImage} alt={`UPI QR code for ${siteConfig.upiPayeeName}`} width={190} height={190} />
      : <div className="qr-placeholder" aria-label="UPI QR code placeholder"><span>UPI</span><small>QR PLACEHOLDER</small></div>}
    {siteConfig.upiId
      ? <><p className="upi-label">UPI ID · {siteConfig.upiPayeeName}</p><button type="button" className="upi-id" onClick={copyUpiId}>{siteConfig.upiId} <span aria-live="polite">{copied ? "Copied" : "Copy"}</span></button></>
      : <p className="upi-note">Our UPI ID will be shared with you on WhatsApp along with your Booking ID.</p>}
    <p className="upi-note">Add <b>{bookingId}</b> as the payment note so we can match your transfer quickly.</p>
  </>;
}
