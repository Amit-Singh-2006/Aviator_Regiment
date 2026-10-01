import { NextResponse } from "next/server";
import { createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { isValidEmail, isValidPhone, normalizePhone } from "@/src/modules/bookings/validation";

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
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";

  if (!BOOKING_ID_PATTERN.test(bookingCode)) return notFound();
  const normalizedContact = isValidPhone(contact) ? normalizePhone(contact) : isValidEmail(contact) ? contact.toLowerCase() : "";
  if (!normalizedContact) return notFound();

  const { data, error } = await createServiceClient().rpc("track_booking", { p_booking_code: bookingCode, p_contact: normalizedContact });
  if (error) {
    console.error("Booking tracking failed", error.message);
    return NextResponse.json({ message: "Tracking is temporarily unavailable. Please try again." }, { status: 500 });
  }
  if (!data) return notFound();

  return NextResponse.json(data);
}
