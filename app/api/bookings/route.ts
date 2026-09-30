import { NextResponse } from "next/server";
import { validateBookingInput } from "@/src/modules/bookings/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request payload." }, { status: 400 });
  }

  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const result = validateBookingInput({
    session: typeof input.session === "string" ? input.session : "",
    fullName: typeof input.fullName === "string" ? input.fullName : "",
    phone: typeof input.phone === "string" ? input.phone : "",
    email: typeof input.email === "string" ? input.email : "",
    address: typeof input.address === "string" ? input.address : "",
    aadhaar: typeof input.aadhaar === "string" ? input.aadhaar : "",
    dgcaNumber: typeof input.dgcaNumber === "string" ? input.dgcaNumber : "",
    noRefundAccepted: input.noRefundAccepted === "true" || input.noRefundAccepted === true,
  });

  if (!result.success) {
    return NextResponse.json({ message: "Please correct the highlighted booking details.", errors: result.errors }, { status: 422 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: "Booking service is not configured yet. Add DATABASE_URL before accepting live bookings." },
      { status: 503 },
    );
  }

  return NextResponse.json({ message: "Booking persistence is ready for the database adapter." }, { status: 501 });
}
