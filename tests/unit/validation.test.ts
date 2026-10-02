import { describe, expect, it } from "vitest";
import { BOOKING_ID_PATTERN, normalizeBookingId } from "@/src/modules/bookings/booking-id";
import { isValidAadhaar, isValidEmail, isValidPhone, maskAadhaar, normalizePhone, validateBookingInput, validateImageFile } from "@/src/modules/bookings/validation";

const validInput = {
  sessionId: "fc-olode-03",
  fullName: "  Aarav   Mehta ",
  phone: "+91 98765 43210",
  email: "Aarav@Example.com",
  address: "12 MG Road, Indiranagar, Bengaluru 560038",
  aadhaar: "9999 4105 7058",
  dgcaNumber: "DGCA-12345",
  termsAccepted: true,
};

describe("phone numbers", () => {
  it("accepts common Indian formats", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("098765-43210")).toBe("9876543210");
    expect(isValidPhone("9876543210")).toBe(true);
  });

  it("rejects numbers that aren't Indian mobiles", () => {
    expect(isValidPhone("5876543210")).toBe(false);
    expect(isValidPhone("98765")).toBe(false);
  });
});

describe("Aadhaar", () => {
  it("checks the Verhoeff check digit", () => {
    expect(isValidAadhaar("9999 4105 7058")).toBe(true);
    expect(isValidAadhaar("9999 4105 7059")).toBe(false);
  });

  it("rejects numbers starting with 0 or 1", () => {
    expect(isValidAadhaar("1234 5678 9012")).toBe(false);
  });

  it("masks all but the last four digits", () => {
    expect(maskAadhaar("999941057058")).toBe("XXXX XXXX 7058");
  });
});

describe("booking details", () => {
  it("normalises valid details", () => {
    const result = validateBookingInput(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ fullName: "Aarav Mehta", phone: "9876543210", email: "aarav@example.com", aadhaar: "999941057058" });
    }
  });

  it("requires a PIN code in the address", () => {
    const result = validateBookingInput({ ...validInput, address: "12 MG Road, Indiranagar, Bengaluru" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.address).toMatch(/PIN/);
  });

  it("requires the terms to be accepted and a valid session", () => {
    const result = validateBookingInput({ ...validInput, termsAccepted: false, sessionId: "FC OLODE 03" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.termsAccepted).toBeTruthy();
      expect(result.errors.sessionId).toBeTruthy();
    }
  });

  it("checks emails", () => {
    expect(isValidEmail("someone@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("limits uploads to small JPG, PNG or WebP images", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 }, "missing")).toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1000 }, "missing")).toMatch(/JPG, PNG or WebP/);
    expect(validateImageFile({ type: "image/jpeg", size: 6 * 1024 * 1024 }, "missing")).toMatch(/5 MB/);
    expect(validateImageFile(null, "missing")).toBe("missing");
  });
});

describe("booking IDs", () => {
  it("match AR + YYYYMM + 4 digits", () => {
    expect(BOOKING_ID_PATTERN.test("AR2026101234")).toBe(true);
    expect(BOOKING_ID_PATTERN.test("AR20261012")).toBe(false);
  });

  it("are normalised from customer input", () => {
    expect(normalizeBookingId(" ar2026 101234 ")).toBe("AR2026101234");
  });
});
