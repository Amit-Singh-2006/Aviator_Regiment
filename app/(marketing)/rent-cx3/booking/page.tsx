import { Suspense } from "react";
import { BookingForm } from "@/src/components/booking-form";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata({
  title: "Book your CX-3",
  description: "Book a CX-3 for your DGCA examination session with Aviator's Regiment.",
  path: "/rent-cx3/booking",
  noIndex: true,
});

export default function BookingPage() {
  return <main className="booking-page"><Suspense fallback={<div className="shell booking-success"><p className="eyebrow">Loading booking</p><h1>Preparing your<br /><em>flight path.</em></h1></div>}><BookingForm /></Suspense></main>;
}
