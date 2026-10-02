// Turns database errors from admin actions into messages an operator can act on.
const knownErrors: Record<string, string> = {
  not_authorized: "Your account doesn't have admin access.",
  booking_not_found: "That booking no longer exists.",
  booking_not_ready: "Verify the payment before assigning a CX-3.",
  booking_closed: "This booking is closed or cancelled, so it can't be changed.",
  unit_unavailable: "That CX-3 unit isn't available any more. Pick another unit.",
  invalid_shipment_status: "That status doesn't apply to this shipment.",
};

export function adminErrorMessage(error: { message: string; code?: string }) {
  if (knownErrors[error.message]) return knownErrors[error.message];
  if (error.code === "23505") return "That already exists. Use a different value.";
  if (error.code === "23514") return "Some details are in the wrong format. Links must start with https://.";
  if (error.code === "23503") return "This is still linked to other records, so it can't be removed.";
  console.error("Admin action failed", error);
  return "Something went wrong. Please try again.";
}
