// Turns database errors from admin actions into messages an operator can act on.
const knownErrors: Record<string, string> = {
  not_authorized: "Your account doesn't have admin access.",
  booking_not_found: "That booking no longer exists.",
  booking_not_ready: "Verify the payment before assigning a CX-3.",
  booking_closed: "This booking is closed or cancelled, so it can't be changed.",
  unit_unavailable: "That CX-3 unit isn't available any more. Pick another unit.",
  invalid_shipment_status: "That status doesn't apply to this shipment.",
  assign_unit_first: "Assign a CX-3 unit first.",
  cannot_cancel_after_dispatch: "The CX-3 has already been sent, so this booking can't be cancelled. Record the return, then close the booking.",
  cannot_close_yet: "Close the booking once the CX-3 has been received back.",
  return_in_progress: "The return has started, so the delivery stays delivered. You can still correct the courier details.",
  not_delivered_yet: "Record the return after the CX-3 has been delivered.",
  return_already_received: "The CX-3 has already been received back.",
  deposit_not_held: "There's no deposit held on this booking to refund.",
  deposit_refund_too_early: "Refund the deposit once the CX-3 is received back, or after the booking is cancelled.",
  cx3_not_out: "Only a CX-3 that has been sent to the customer can be recorded as lost.",
};

export function adminErrorMessage(error: { message: string; code?: string }) {
  if (knownErrors[error.message]) return knownErrors[error.message];
  if (error.code === "23505") return "That already exists. Use a different value.";
  if (error.code === "23514") return "Some details are in the wrong format. Links must start with https://.";
  if (error.code === "23503") return "This is still linked to other records, so it can't be removed.";
  console.error("Admin action failed", error);
  return "Something went wrong. Please try again.";
}
