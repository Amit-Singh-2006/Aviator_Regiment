import { Suspense } from "react";
import { TrackBooking, TrackBookingFromLink } from "@/src/components/track-booking";
import { pageMetadata } from "@/src/lib/seo";

export const metadata = pageMetadata({
  title: "Track your booking",
  description: "Track your Aviator's Regiment CX-3 booking with your Booking ID and the phone number or email used for booking.",
  path: "/track",
  noIndex: true,
});

export default function TrackPage() {
  // The fallback is the full form, so the page is usable before search params load.
  return <Suspense fallback={<TrackBooking />}><TrackBookingFromLink /></Suspense>;
}
