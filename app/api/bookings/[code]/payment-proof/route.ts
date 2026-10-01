import { NextResponse } from "next/server";
import { BOOKING_DOCUMENTS_BUCKET, createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { readImageUpload } from "@/src/modules/bookings/uploads";
import { isValidPhone, normalizePhone } from "@/src/modules/bookings/validation";

// Stores the customer's UPI payment screenshot and sends the booking to payment review.
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isBookingServiceConfigured()) {
    return NextResponse.json({ message: "Bookings are not open yet. Please message us on WhatsApp." }, { status: 503 });
  }

  const bookingCode = normalizeBookingId((await params).code);
  if (!BOOKING_ID_PATTERN.test(bookingCode)) {
    return NextResponse.json({ message: "We couldn't find that booking." }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const phoneValue = form.get("phone");
  const phone = typeof phoneValue === "string" ? normalizePhone(phoneValue) : "";
  if (!isValidPhone(phone)) {
    return NextResponse.json({ message: "Enter the phone number used for this booking." }, { status: 422 });
  }
  const screenshot = await readImageUpload(form.get("screenshot"), "Upload your payment screenshot.");
  if ("error" in screenshot) {
    return NextResponse.json({ message: screenshot.error }, { status: 422 });
  }

  const supabase = createServiceClient();
  const screenshotPath = `payment-proofs/${bookingCode}/${Date.now()}.${screenshot.extension}`;
  const upload = await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).upload(screenshotPath, screenshot.bytes, { contentType: screenshot.contentType });
  if (upload.error) {
    console.error("Payment screenshot upload failed", upload.error.message);
    return NextResponse.json({ message: "We couldn't save your screenshot. Please try again." }, { status: 502 });
  }

  const { data, error } = await supabase.rpc("submit_payment_proof", {
    p_booking_code: bookingCode,
    p_phone: phone,
    p_screenshot_path: screenshotPath,
  });

  if (error) {
    await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).remove([screenshotPath]);
    if (error.message.includes("booking_not_found")) {
      return NextResponse.json({ message: "We couldn't find that booking." }, { status: 404 });
    }
    if (error.message.includes("payment_already_processed")) {
      return NextResponse.json({ message: "The payment for this booking has already been verified." }, { status: 409 });
    }
    console.error("Payment proof submission failed", error.message);
    return NextResponse.json({ message: "We couldn't submit your screenshot. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ status: data });
}
