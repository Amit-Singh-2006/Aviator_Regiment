import type { Enums } from "@/src/db/database.types";

export type BookingStatus = Enums<"booking_status">;
export type PaymentStatus = Enums<"payment_status">;

// Shape returned by public.track_booking — customer-safe fields only.
export type TrackedShipment = {
  direction: Enums<"shipment_direction">;
  status: Enums<"shipment_status">;
  courier: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
  dispatchDate: string | null;
  pickupDate: string | null;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
};

export type TrackedBooking = {
  bookingCode: string;
  status: BookingStatus;
  sessionName: string;
  amountInr: number;
  createdAt: string;
  paymentStatus: PaymentStatus | null;
  // The admin's reason, only when the latest payment was rejected.
  paymentNote: string | null;
  cx3Unit: string | null;
  shipments: TrackedShipment[];
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  payment_pending: "Awaiting payment",
  payment_review: "Payment under review",
  confirmed: "Booking confirmed",
  cx3_assigned: "CX-3 assigned",
  dispatched: "Dispatched",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  return_pickup_scheduled: "Return pickup scheduled",
  return_in_transit: "Return in transit",
  cx3_received: "CX-3 received",
  closed: "Booking closed",
  cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting payment",
  pending_verification: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
};

// The order a booking moves through, from payment to closing.
const statusOrder: BookingStatus[] = [
  "payment_pending",
  "payment_review",
  "confirmed",
  "cx3_assigned",
  "dispatched",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "return_pickup_scheduled",
  "return_in_transit",
  "cx3_received",
  "closed",
];

export const deliveryMilestones: BookingStatus[] = ["confirmed", "cx3_assigned", "dispatched", "in_transit", "out_for_delivery", "delivered"];
export const returnMilestones: BookingStatus[] = ["return_pickup_scheduled", "return_in_transit", "cx3_received", "closed"];

export function hasReached(current: BookingStatus, milestone: BookingStatus) {
  return current !== "cancelled" && statusOrder.indexOf(current) >= statusOrder.indexOf(milestone);
}
