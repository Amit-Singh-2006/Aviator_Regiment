export type BookingInput = {
  session: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  aadhaar: string;
  dgcaNumber: string;
  noRefundAccepted: boolean;
};

export type ValidationResult =
  | { success: true; data: BookingInput }
  | { success: false; errors: Record<string, string> };

export function validateBookingInput(input: Partial<BookingInput>): ValidationResult {
  const errors: Record<string, string> = {};
  const fullName = input.fullName?.trim() ?? "";
  const phone = input.phone?.replace(/\s/g, "") ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const aadhaar = input.aadhaar?.replace(/\s/g, "") ?? "";

  if (!["FC OLODE 03", "FC Regular 04"].includes(input.session?.trim() ?? "")) errors.session = "Select a valid examination session.";
  if (fullName.length < 2) errors.fullName = "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if ((input.address?.trim().length ?? 0) < 12) errors.address = "Enter your complete delivery address.";
  if (!/^\d{12}$/.test(aadhaar)) errors.aadhaar = "Enter a valid 12-digit Aadhaar number.";
  if ((input.dgcaNumber?.trim().length ?? 0) < 3) errors.dgcaNumber = "Enter your DGCA registration number.";
  if (input.noRefundAccepted !== true) errors.noRefundAccepted = "You must accept the no-refund policy.";

  if (Object.keys(errors).length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      session: input.session!.trim(),
      fullName,
      phone,
      email,
      address: input.address!.trim(),
      aadhaar,
      dgcaNumber: input.dgcaNumber!.trim(),
      noRefundAccepted: true,
    },
  };
}
