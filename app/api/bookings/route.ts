import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BOOKING_DOCUMENTS_BUCKET, createServiceClient, isBookingServiceConfigured } from "@/src/lib/supabase/server";
import { TERMS_VERSION } from "@/src/modules/bookings/terms";
import { readImageUpload } from "@/src/modules/bookings/uploads";
import { validateBookingInput } from "@/src/modules/bookings/validation";
import type { BookingErrors } from "@/src/modules/bookings/validation";

// Creates a booking: validates the details, stores the passport photo privately,
// then lets the database assign the booking ID and price for an open session.
export async function POST(request: Request) {
  if (!isBookingServiceConfigured()) {
    return NextResponse.json({ message: "Bookings are not open yet. Please message us on WhatsApp." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const result = validateBookingInput({
    sessionId: text("sessionId"),
    fullName: text("fullName"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    aadhaar: text("aadhaar"),
    dgcaNumber: text("dgcaNumber"),
    termsAccepted: text("termsAccepted") === "true",
  });
  const photo = await readImageUpload(form.get("passportPhoto"), "Upload a passport-size photo.");

  const errors: BookingErrors = result.success ? {} : { ...result.errors };
  if ("error" in photo) errors.passportPhoto = photo.error;
  if (!result.success || "error" in photo) {
    return NextResponse.json({ message: "Please correct the highlighted booking details.", errors }, { status: 422 });
  }

  const supabase = createServiceClient();
  const photoPath = `passport-photos/${randomUUID()}.${photo.extension}`;
  const upload = await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).upload(photoPath, photo.bytes, { contentType: photo.contentType });
  if (upload.error) {
    console.error("Passport photo upload failed", upload.error.message);
    return NextResponse.json({ message: "We couldn't save your photo. Please try again." }, { status: 502 });
  }

  const { data, error } = await supabase.rpc("create_booking", {
    p_session_id: result.data.sessionId,
    p_full_name: result.data.fullName,
    p_phone: result.data.phone,
    p_email: result.data.email,
    p_delivery_address: result.data.address,
    p_aadhaar_number: result.data.aadhaar,
    p_dgca_number: result.data.dgcaNumber,
    p_photo_path: photoPath,
    p_terms_version: TERMS_VERSION,
  }).single();

  if (error || !data) {
    await supabase.storage.from(BOOKING_DOCUMENTS_BUCKET).remove([photoPath]);
    if (error?.message.includes("session_not_bookable")) {
      return NextResponse.json({ message: "This session is no longer open for booking. Please choose another session." }, { status: 409 });
    }
    console.error("Booking creation failed", error?.message);
    return NextResponse.json({ message: "We couldn't create your booking. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ bookingCode: data.booking_code, amountInr: data.amount_inr, sessionName: data.session_name }, { status: 201 });
}
