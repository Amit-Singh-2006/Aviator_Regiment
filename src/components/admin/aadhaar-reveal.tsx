"use client";

import { useState, useTransition } from "react";
import { revealAadhaar } from "@/src/modules/bookings/admin-actions";

// Shows the masked Aadhaar; the full number is fetched only when an admin asks,
// and each view is recorded in the activity log.
export function AadhaarReveal({ bookingCode, masked }: { bookingCode: string; masked: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function show() {
    setError("");
    startTransition(async () => {
      const result = await revealAadhaar(bookingCode);
      if (result.aadhaar) setValue(result.aadhaar);
      else setError(result.error ?? "Couldn't load the number. Please try again.");
    });
  }

  return <span className="aadhaar-reveal">
    <span>{value ?? masked}</span>
    {value
      ? <button type="button" className="admin-link" onClick={() => setValue(null)}>Hide</button>
      : <button type="button" className="admin-link" onClick={show} disabled={pending}>{pending ? "Loading…" : "Show full number"}</button>}
    {error ? <small className="aadhaar-error" role="alert">{error}</small> : null}
  </span>;
}
