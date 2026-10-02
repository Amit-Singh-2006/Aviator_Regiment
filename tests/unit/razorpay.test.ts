import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { onlinePaymentAmount } from "@/src/lib/razorpay/fee";
import { matchesRazorpaySignature, razorpaySignature } from "@/src/lib/razorpay/signature";
import { normalizeContact } from "@/src/modules/bookings/validation";

describe("onlinePaymentAmount", () => {
  it("adds the gateway fee so the full amount is received", () => {
    expect(onlinePaymentAmount(2000)).toEqual({ totalInr: 2049, feeInr: 49 });
    // Rental plus the ₹5,000 security deposit, paid together.
    expect(onlinePaymentAmount(2000 + 5000)).toEqual({ totalInr: 7170, feeInr: 170 });
    expect(onlinePaymentAmount(2500 + 5000)).toEqual({ totalInr: 7682, feeInr: 182 });
  });

  it("covers Razorpay's 2% + 18% GST on the charged amount", () => {
    for (const rental of [100, 1999, 2000, 2500, 4999]) {
      const { totalInr } = onlinePaymentAmount(rental);
      expect(totalInr - totalInr * 0.02 * 1.18).toBeGreaterThanOrEqual(rental);
    }
  });
});

describe("Razorpay signatures", () => {
  const secret = "test_secret";
  const payload = "order_Ab12Cd34Ef56Gh|pay_Zy98Xw76Vu54Ts";

  it("matches Razorpay's HMAC-SHA256 hex signature", () => {
    expect(razorpaySignature(payload, secret)).toBe(createHmac("sha256", secret).update(payload).digest("hex"));
    expect(matchesRazorpaySignature(payload, razorpaySignature(payload, secret), secret)).toBe(true);
  });

  it("rejects tampered payloads, other secrets and empty values", () => {
    const signature = razorpaySignature(payload, secret);
    expect(matchesRazorpaySignature(`${payload}x`, signature, secret)).toBe(false);
    expect(matchesRazorpaySignature(payload, signature, "other_secret")).toBe(false);
    expect(matchesRazorpaySignature(payload, signature.slice(0, 10), secret)).toBe(false);
    expect(matchesRazorpaySignature(payload, "", secret)).toBe(false);
    expect(matchesRazorpaySignature(payload, signature, "")).toBe(false);
  });
});

describe("normalizeContact", () => {
  it("returns the stored form of a phone number or email", () => {
    expect(normalizeContact(" +91 98765 43210 ")).toBe("9876543210");
    expect(normalizeContact("Aarav@Example.com")).toBe("aarav@example.com");
    expect(normalizeContact("not a contact")).toBe("");
  });
});
