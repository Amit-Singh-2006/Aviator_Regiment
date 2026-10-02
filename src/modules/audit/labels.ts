import { shipmentStatusLabels, type ShipmentStatus } from "@/src/modules/bookings/admin";
import { bookingStatusLabels, type BookingStatus } from "@/src/modules/bookings/tracking";

// Human-readable descriptions of public.audit_log entries.
const actionLabels: Record<string, string> = {
  "booking.created": "Booking created by the customer",
  "payment.proof_submitted": "Payment screenshot uploaded",
  "payment.verified": "Payment verified",
  "payment.rejected": "Payment rejected",
  "cx3.assigned": "CX-3 assigned",
  "cx3.added": "CX-3 unit added",
  "cx3.status_set": "CX-3 unit status changed",
  "booking.status_set": "Booking status changed",
  "session.created": "Exam session added",
  "session.updated": "Exam session updated",
  "prices.updated": "Rental prices changed",
  "news.approve": "Article approved",
  "news.publish": "Article published",
  "news.unpublish": "Article unpublished",
  "news.reject": "Article rejected",
  "news.restore": "Article moved back to drafts",
  "news_source.added": "News source added",
  "news_source.updated": "News source updated",
  "news_source.removed": "News source removed",
  "news.review": "Article sent for review",
  "news.delete": "Article deleted",
  "session.deleted": "Exam session deleted",
  "booking.aadhaar_viewed": "Full Aadhaar number viewed",
  "career_role.created": "Career added",
  "career_role.updated": "Career updated",
  "career_role.deleted": "Career deleted",
  "career_company.added": "Company added to a career",
  "career_company.updated": "Company link updated",
  "career_company.removed": "Company removed from a career",
};

export function describeAction(action: string) {
  const [kind, direction, status] = action.split(".");
  if (kind === "shipment" && status in shipmentStatusLabels) {
    return `${direction === "return" ? "Return" : "Delivery"}: ${shipmentStatusLabels[status as ShipmentStatus].toLowerCase()}`;
  }
  return actionLabels[action] ?? action;
}

export function describeDetails(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const value = details as Record<string, unknown>;
  const text = (key: string) => (typeof value[key] === "string" || typeof value[key] === "number" ? String(value[key]) : "");
  if (text("reason")) return `Reason: ${text("reason")}`;
  if (text("unit_code")) return `Unit ${text("unit_code")}`;
  if (text("courier") || text("awb_number")) return [text("courier"), text("awb_number")].filter(Boolean).join(" · ");
  if (text("from") && text("to")) {
    const label = (status: string) => bookingStatusLabels[status as BookingStatus] ?? status.replace(/_/g, " ");
    return `${label(text("from"))} → ${label(text("to"))}`;
  }
  if (text("title")) return text("title");
  if (text("name")) return text("name");
  if (text("OLODE") && text("REGULAR")) return `OLODE ₹${text("OLODE")} · Regular ₹${text("REGULAR")}`;
  return null;
}
