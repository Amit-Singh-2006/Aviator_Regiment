import { NextResponse } from "next/server";
import { clientIp, hashIdentifier, isRateLimited, tooManyRequests } from "@/src/lib/rate-limit";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { normalizeContact } from "@/src/modules/bookings/validation";

// The same message for every mismatch, so the endpoint never confirms which
// booking IDs exist.
const notFound = () =>
  NextResponse.json({ message: "We couldn't find a booking with those details. Check your Booking ID and the phone number or email used for booking." }, { status: 404 });

export async function POST(request: Request) {
  if (!isBookingServiceConfigured()) {
    return NextResponse.json({ message: "Tracking is not available yet. Please message us on WhatsApp." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const bookingCode = normalizeBookingId(typeof input.bookingId === "string" ? input.bookingId : "");

  if (!BOOKING_ID_PATTERN.test(bookingCode)) return notFound();
  const normalizedContact = normalizeContact(typeof input.contact === "string" ? input.contact : "");
  if (!normalizedContact) return notFound();

  // Limits guessing: per visitor, and per booking ID however many visitors try.
  if (await isRateLimited([
    { key: `track:ip:${hashIdentifier(clientIp(request.headers))}`, limit: 30, windowSeconds: 600 },
    { key: `track:booking:${bookingCode}`, limit: 15, windowSeconds: 600 },
  ])) {
    return tooManyRequests();
  }

  const { data, error } = await createServiceClient().rpc("track_booking", { p_booking_code: bookingCode, p_contact: normalizedContact });
  if (error) {
    console.error("Booking tracking failed", error.message);
    return NextResponse.json({ message: "Tracking is temporarily unavailable. Please try again." }, { status: 500 });
  }
  if (!data) return notFound();

  return NextResponse.json(data);
}
