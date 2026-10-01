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
  const text = (value: unknown) => typeof value === "string" ? value : "";
  const result = validateBookingInput({
    sessionId: text(input.sessionId),
    fullName: text(input.fullName),
    phone: text(input.phone),
    email: text(input.email),
    address: text(input.address),
    aadhaar: text(input.aadhaar),
    dgcaNumber: text(input.dgcaNumber),
    termsAccepted: input.termsAccepted === "true" || input.termsAccepted === true,
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
