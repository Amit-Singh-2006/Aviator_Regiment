import { NextResponse } from "next/server";
import { clientIp, hashIdentifier, isRateLimited, tooManyRequests } from "@/src/lib/rate-limit";
import { BOOKING_DOCUMENTS_BUCKET, createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { readImageUpload } from "@/src/modules/bookings/uploads";
import { normalizeContact } from "@/src/modules/bookings/validation";

const notFound = () => NextResponse.json({ message: "We couldn't find a booking with those details." }, { status: 404 });

// Stores the customer's UPI payment screenshot and sends the booking to payment review.
// Used from the booking flow and from the tracking page, so the customer can identify
// themselves with the booking's phone number or email.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isBookingServiceConfigured()) {
    return NextResponse.json({ message: "Bookings are not open yet. Please message us on WhatsApp." }, { status: 503 });
  }

  const bookingCode = normalizeBookingId((await params).code);
  if (!BOOKING_ID_PATTERN.test(bookingCode)) return notFound();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const contactValue = form.get("contact") ?? form.get("phone");
  const contact = normalizeContact(typeof contactValue === "string" ? contactValue : "");
  if (!contact) {
    return NextResponse.json({ message: "Enter the phone number or email used for this booking." }, { status: 422 });
  }

  const ip = hashIdentifier(clientIp(request.headers));
  if (await isRateLimited([
    { key: `proof:ip:${ip}`, limit: 10, windowSeconds: 600 },
    { key: `proof:booking:${bookingCode}`, limit: 6, windowSeconds: 3600 },
  ])) {
    return tooManyRequests();
  }

  const screenshot = await readImageUpload(form.get("screenshot"), "Upload your payment screenshot.");
  if ("error" in screenshot) {
    return NextResponse.json({ message: screenshot.error }, { status: 422 });
  }

  // Check the booking and contact before storing anything.
  const supabase = createServiceClient();
  const { data: booking, error: lookupError } = await supabase.rpc("track_booking", { p_booking_code: bookingCode, p_contact: contact });
  if (lookupError) {
    console.error("Payment proof lookup failed", lookupError.message);
    return NextResponse.json({ message: "We couldn't submit your screenshot. Please try again." }, { status: 500 });
  }
  if (!booking) return notFound();

  const screenshotPath = `payment-proofs/${bookingCode}/${Date.now()}.${screenshot.extension}`;
  const upload = await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).upload(screenshotPath, screenshot.bytes, { contentType: screenshot.contentType });
  if (upload.error) {
    console.error("Payment screenshot upload failed", upload.error.message);
    return NextResponse.json({ message: "We couldn't save your screenshot. Please try again." }, { status: 502 });
  }

  // submit_payment_proof's p_phone parameter accepts the booking's phone number or email.
  const { data, error } = await supabase.rpc("submit_payment_proof", {
    p_booking_code: bookingCode,
    p_phone: contact,
    p_screenshot_path: screenshotPath,
  });

  if (error) {
    await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).remove([screenshotPath]);
    if (error.message.includes("booking_not_found")) return notFound();
    if (error.message.includes("payment_already_processed")) {
      return NextResponse.json({ message: "The payment for this booking has already been verified." }, { status: 409 });
    }
    console.error("Payment proof submission failed", error.message);
    return NextResponse.json({ message: "We couldn't submit your screenshot. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ status: data });
}
