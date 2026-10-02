import type { Tone } from "@/src/components/admin/admin-ui";
import type { Enums } from "@/src/db/database.types";
import type { BookingStatus, PaymentStatus } from "@/src/modules/bookings/tracking";

export type ShipmentStatus = Enums<"shipment_status">;
export type ShipmentDirection = Enums<"shipment_direction">;

// Work queues in the order bookings move through them.
export const bookingQueues: { id: string; label: string; statuses: BookingStatus[] }[] = [
  { id: "all", label: "All", statuses: [] },
  { id: "verify", label: "Verify payment", statuses: ["payment_review"] },
  { id: "unpaid", label: "Awaiting payment", statuses: ["payment_pending"] },
  { id: "assign", label: "Assign CX-3", statuses: ["confirmed"] },
  { id: "ship", label: "Ready to ship", statuses: ["cx3_assigned"] },
  { id: "out", label: "With customer", statuses: ["dispatched", "in_transit", "out_for_delivery", "delivered"] },
  { id: "returns", label: "Returns", statuses: ["return_pickup_scheduled", "return_in_transit", "cx3_received"] },
  { id: "closed", label: "Closed", statuses: ["closed", "cancelled"] },
];

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  pending: "Not sent yet",
  pickup_scheduled: "Pickup scheduled",
  dispatched: "Dispatched",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  received: "Received back",
};

export const outboundStatuses: ShipmentStatus[] = ["pending", "dispatched", "in_transit", "out_for_delivery", "delivered"];
export const returnStatuses: ShipmentStatus[] = ["pending", "pickup_scheduled", "in_transit", "received"];
// Couriers Aviator's Regiment uses (Rapido and Uber for same-city deliveries).
export const couriers = ["Delhivery", "DTDC", "Rapido", "Uber"];

export function bookingTone(status: BookingStatus): Tone {
  if (status === "payment_review") return "warn";
  if (status === "cancelled") return "bad";
  if (status === "payment_pending" || status === "closed") return "neutral";
  if (status === "confirmed" || status === "cx3_assigned") return "info";
  return "good";
}

export function paymentTone(status: PaymentStatus): Tone {
  if (status === "verified") return "good";
  if (status === "rejected") return "bad";
  if (status === "pending_verification") return "warn";
  return "neutral";
}

// The payment to show for a booking: a verified one if any, otherwise the most
// recently updated (matches public.track_booking).
export function currentPayment<T extends { status: PaymentStatus; updated_at: string }>(payments: T[]) {
  return [...payments].sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified") || b.updated_at.localeCompare(a.updated_at))[0];
}

// WhatsApp chat with a customer (stored phones are 10-digit Indian mobiles).
export function customerWhatsappLink(phone: string, message: string) {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
}
