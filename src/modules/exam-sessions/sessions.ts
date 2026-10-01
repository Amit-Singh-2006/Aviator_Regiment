export type ExamSessionType = "OLODE" | "REGULAR";

// The availability options the admin panel controls for every session.
export type ExamSessionStatus = "available" | "sold-out" | "temporarily-unavailable" | "hidden";

export type ExamSession = {
  id: string;
  name: string;
  type: ExamSessionType;
  status: ExamSessionStatus;
};

// Rental price for the complete examination session (not per day), in INR.
export const sessionPrices: Record<ExamSessionType, number> = {
  OLODE: 2000,
  REGULAR: 2500,
};

// Managed here until exam sessions move to the database and admin panel.
export const examSessions: ExamSession[] = [
  { id: "fc-olode-03", name: "FC OLODE 03", type: "OLODE", status: "available" },
  { id: "fc-regular-04", name: "FC Regular 04", type: "REGULAR", status: "available" },
];

export const sessionStatusLabels: Record<ExamSessionStatus, string> = {
  available: "Available",
  "sold-out": "Sold out",
  "temporarily-unavailable": "Temporarily unavailable",
  hidden: "Not open yet",
};

export function getVisibleSessions() {
  return examSessions.filter((session) => session.status !== "hidden");
}

// Hidden sessions are treated as unknown so they cannot be booked or revealed.
export function findExamSession(id: string) {
  return getVisibleSessions().find((session) => session.id === id);
}

export function isBookable(session: ExamSession) {
  return session.status === "available";
}

export function getSessionPrice(session: ExamSession) {
  return sessionPrices[session.type];
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
