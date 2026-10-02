import { describe, expect, it } from "vitest";
import { addDays, isValidLastExamDate, keepUntilDate, lastExamDateRange } from "@/src/modules/bookings/rental-period";

describe("rental period", () => {
  it("lets the customer keep the CX-3 until the day after their last exam", () => {
    expect(keepUntilDate("2026-10-10")).toBe("2026-10-11");
    expect(keepUntilDate("2026-10-31")).toBe("2026-11-01");
    expect(keepUntilDate("2026-12-31")).toBe("2027-01-01");
  });

  it("does calendar arithmetic without time-zone drift", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("accepts last exam dates from today up to a year ahead", () => {
    expect(lastExamDateRange("2026-10-02")).toEqual({ min: "2026-10-02", max: "2027-10-03" });
    expect(isValidLastExamDate("2026-10-02", "2026-10-02")).toBe(true);
    expect(isValidLastExamDate("2027-10-03", "2026-10-02")).toBe(true);
    expect(isValidLastExamDate("2027-10-04", "2026-10-02")).toBe(false);
    expect(isValidLastExamDate("2026-10-01", "2026-10-02")).toBe(false);
    expect(isValidLastExamDate("2026-02-29", "2026-01-01")).toBe(false);
    expect(isValidLastExamDate("", "2026-10-02")).toBe(false);
  });
});
