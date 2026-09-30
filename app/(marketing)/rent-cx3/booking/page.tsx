import Link from "next/link";
import { Suspense } from "react";
import { BookingForm } from "@/src/components/booking-form";

export default function BookingPage() {
  return <main className="booking-page"><Suspense fallback={<div className="shell booking-success"><p className="eyebrow">Loading booking</p><h1>Preparing your<br /><em>flight path.</em></h1></div>}><BookingForm /></Suspense></main>;
}
