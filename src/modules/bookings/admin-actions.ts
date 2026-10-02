"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/src/components/admin/action-form";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { adminErrorMessage } from "@/src/lib/supabase/errors";
import { outboundStatuses, returnStatuses, type ShipmentStatus } from "@/src/modules/bookings/admin";
import { BOOKING_ID_PATTERN } from "@/src/modules/bookings/booking-id";
import { bookingStatusLabels, type BookingStatus } from "@/src/modules/bookings/tracking";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// The generated types mark SQL function arguments as required strings, but
// PostgREST passes null through, which the functions treat as "not set".
function optional(value: string) {
  return (value || null) as string;
}

function readBookingCode(formData: FormData) {
  const code = text(formData, "bookingCode");
  return BOOKING_ID_PATTERN.test(code) ? code : null;
}

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function reviewPayment(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const code = readBookingCode(formData);
  if (!code) return { error: "Invalid booking." };
  const approve = formData.get("decision") === "verify";
  const reason = text(formData, "reason").slice(0, 300);
  if (!approve && !reason) return { error: "Add a reason so you can tell the customer what to fix." };

  const { error } = await supabase.rpc("admin_review_payment", { p_booking_code: code, p_approve: approve, p_reason: optional(reason) });
  if (error) return { error: adminErrorMessage(error) };
  refresh();
  return { ok: approve ? "Payment verified. The booking is confirmed." : "Payment rejected. The booking is back to awaiting payment." };
}

export async function assignUnit(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const code = readBookingCode(formData);
  const unitId = text(formData, "unitId");
  if (!code) return { error: "Invalid booking." };
  if (!UUID_PATTERN.test(unitId)) return { error: "Choose a CX-3 unit." };

  const { error } = await supabase.rpc("admin_assign_unit", { p_booking_code: code, p_unit_id: unitId });
  if (error) return { error: adminErrorMessage(error) };
  refresh();
  return { ok: "CX-3 assigned." };
}

export async function saveShipment(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const code = readBookingCode(formData);
  if (!code) return { error: "Invalid booking." };
  const direction = formData.get("direction") === "return" ? "return" : "outbound";
  const status = text(formData, "status") as ShipmentStatus;
  const allowed = direction === "return" ? returnStatuses : outboundStatuses;
  if (!allowed.includes(status)) return { error: "Choose a shipment status." };

  const trackingUrl = text(formData, "trackingUrl");
  if (trackingUrl && !/^https?:\/\/\S+$/.test(trackingUrl)) return { error: "The tracking link must start with https://." };
  const dates = ["dispatchDate", "pickupDate", "expectedDeliveryDate", "receivedDate"].map((name) => text(formData, name));
  if (dates.some((date) => date && !DATE_PATTERN.test(date))) return { error: "One of the dates is invalid. Pick it again from the calendar." };
  const [dispatchDate, pickupDate, expectedDeliveryDate, receivedDate] = dates;
  const courier = text(formData, "courier").slice(0, 80);
  const awbNumber = text(formData, "awbNumber").slice(0, 80);
  if (status !== "pending" && (!courier || !awbNumber)) return { error: "Add the courier and AWB number so the customer can track it." };

  const { error } = await supabase.rpc("admin_save_shipment", {
    p_booking_code: code,
    p_direction: direction,
    p_status: status,
    p_courier: optional(courier),
    p_awb_number: optional(awbNumber),
    p_tracking_url: optional(trackingUrl),
    p_dispatch_date: optional(dispatchDate),
    p_pickup_date: optional(pickupDate),
    p_expected_delivery_date: optional(expectedDeliveryDate),
    p_received_date: optional(receivedDate),
  });
  if (error) return { error: adminErrorMessage(error) };
  refresh();
  return { ok: direction === "return" ? "Return details saved." : "Delivery details saved." };
}

export async function setBookingStatus(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const code = readBookingCode(formData);
  const status = text(formData, "status") as BookingStatus;
  if (!code) return { error: "Invalid booking." };
  if (!(status in bookingStatusLabels)) return { error: "Choose a status." };

  const { error } = await supabase.rpc("admin_set_booking_status", { p_booking_code: code, p_status: status });
  if (error) return { error: adminErrorMessage(error) };
  refresh();
  return { ok: `Status set to “${bookingStatusLabels[status]}”.` };
}

export async function saveAdminNotes(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const code = readBookingCode(formData);
  if (!code) return { error: "Invalid booking." };
  const notes = text(formData, "notes").slice(0, 2000);

  const { error } = await supabase.from("bookings").update({ admin_notes: notes || null }).eq("booking_code", code);
  if (error) return { error: adminErrorMessage(error) };
  refresh();
  return { ok: "Notes saved." };
}
