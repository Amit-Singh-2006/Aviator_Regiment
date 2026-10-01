export type BookingInput = {
  sessionId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  aadhaar: string;
  dgcaNumber: string;
  termsAccepted: boolean;
};

export type BookingField = keyof BookingInput | "passportPhoto";
export type BookingErrors = Partial<Record<BookingField, string>>;

export type ValidationResult =
  | { success: true; data: BookingInput }
  | { success: false; errors: BookingErrors };

export const PASSPORT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PASSPORT_PHOTO_BYTES = 5 * 1024 * 1024;

// Accepts the common Indian formats: +91 98765 43210, 098765-43210, 9876543210.
export function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, "");
}

export function isValidPhone(value: string) {
  return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

export function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeAadhaar(value: string) {
  return value.replace(/[\s-]/g, "");
}

// Aadhaar numbers never start with 0 or 1 and end with a Verhoeff check digit.
export function isValidAadhaar(value: string) {
  const aadhaar = normalizeAadhaar(value);
  return /^[2-9]\d{11}$/.test(aadhaar) && passesVerhoeff(aadhaar);
}

export function maskAadhaar(value: string) {
  return `XXXX XXXX ${normalizeAadhaar(value).slice(-4)}`;
}

export function validateBookingInput(input: Partial<BookingInput>): ValidationResult {
  const errors: BookingErrors = {};
  const sessionId = input.sessionId?.trim() ?? "";
  const fullName = input.fullName?.trim().replace(/\s+/g, " ") ?? "";
  const phone = normalizePhone(input.phone ?? "");
  const email = input.email?.trim().toLowerCase() ?? "";
  const address = input.address?.trim() ?? "";
  const aadhaar = normalizeAadhaar(input.aadhaar ?? "");
  const dgcaNumber = input.dgcaNumber?.trim() ?? "";

  // Whether the session is open for booking is checked by the database.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(sessionId)) errors.sessionId = "Select a valid examination session.";
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Enter your full name.";
  if (!isValidPhone(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (address.length < 12 || address.length > 500) errors.address = "Enter your complete delivery address.";
  else if (!/\b[1-9]\d{2}\s?\d{3}\b/.test(address)) errors.address = "Include the 6-digit PIN code in your delivery address.";
  if (!isValidAadhaar(aadhaar)) errors.aadhaar = "Enter a valid 12-digit Aadhaar number.";
  if (dgcaNumber.length < 3 || dgcaNumber.length > 40) errors.dgcaNumber = "Enter your DGCA computer / registration number.";
  if (input.termsAccepted !== true) errors.termsAccepted = "Accept the Terms & Conditions and No-Refund Policy to continue.";

  if (Object.keys(errors).length > 0) return { success: false, errors };
  return {
    success: true,
    data: { sessionId, fullName, phone, email, address, aadhaar, dgcaNumber, termsAccepted: true },
  };
}

export function validateImageFile(file: { type: string; size: number } | null | undefined, missingMessage: string) {
  if (!file || file.size === 0) return missingMessage;
  if (!PASSPORT_PHOTO_TYPES.includes(file.type)) return "Upload the image as a JPG, PNG or WebP file.";
  if (file.size > MAX_PASSPORT_PHOTO_BYTES) return "The image must be 5 MB or smaller.";
  return null;
}

export function validatePassportPhoto(file: { type: string; size: number } | null | undefined) {
  return validateImageFile(file, "Upload a passport-size photo.");
}

const verhoeffMultiplication = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffPermutation = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function passesVerhoeff(digits: string) {
  let check = 0;
  [...digits].reverse().forEach((digit, index) => {
    check = verhoeffMultiplication[check][verhoeffPermutation[index % 8][Number(digit)]];
  });
  return check === 0;
}
