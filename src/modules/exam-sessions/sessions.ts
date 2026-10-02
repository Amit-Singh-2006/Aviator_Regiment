import type { Enums } from "@/src/db/database.types";

// Sessions, their availability and prices are managed in Supabase (exam_sessions,
// rental_prices). This module holds the client-safe types and display helpers.
export type ExamSessionType = Enums<"session_type">;
export type ExamSessionStatus = Enums<"session_status">;

export type ExamSession = {
  id: string;
  name: string;
  type: ExamSessionType;
  status: ExamSessionStatus;
  // Rental price for the complete examination session (not per day), in INR.
  priceInr: number;
  // Refundable security deposit, paid together with the rental.
  depositInr: number;
};

export const sessionStatusLabels: Record<ExamSessionStatus, string> = {
  available: "Available",
  sold_out: "Sold out",
  temporarily_unavailable: "Temporarily unavailable",
  hidden: "Not open yet",
};

export function isBookable(session: ExamSession) {
  return session.status === "available";
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
