// Dates are shown in Indian time wherever the server or browser runs.
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

// Phone numbers stored as digits with the country code; Indian mobiles are shown
// as +91 79803 46727.
export function formatPhone(digits: string) {
  const indian = /^91(\d{5})(\d{5})$/.exec(digits);
  return indian ? `+91 ${indian[1]} ${indian[2]}` : digits ? `+${digits}` : "";
}

// Today's date in India as YYYY-MM-DD, for date inputs.
export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
