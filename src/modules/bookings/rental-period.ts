// Customers keep the CX-3 until the day after their last exam in the session
// (Terms, "Rental period"); the return pickup is arranged from that day.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_AHEAD = 366;

// Calendar arithmetic on YYYY-MM-DD dates, independent of the device's time zone.
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function keepUntilDate(lastExamDate: string) {
  return addDays(lastExamDate, 1);
}

// The dates a customer can give as their last exam: today (India time) up to a year ahead.
export function lastExamDateRange(today: string) {
  return { min: today, max: addDays(today, MAX_DAYS_AHEAD) };
}

export function isValidLastExamDate(value: string, today: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const { min, max } = lastExamDateRange(today);
  return value >= min && value <= max;
}
