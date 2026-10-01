// Booking IDs use AR + year + month (India time) + a 4-digit suffix,
// e.g. AR2026091842.
export const BOOKING_ID_PATTERN = /^AR\d{10}$/;

export function generateBookingId(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  // A random suffix is only acceptable while bookings are not persisted. Once
  // the database is connected, generate IDs server-side behind a unique index.
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `AR${year}${month}${suffix}`;
}

export function normalizeBookingId(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}
