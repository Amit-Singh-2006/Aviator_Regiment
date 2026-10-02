import Link from "next/link";
import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel, Pill, type Tone } from "@/src/components/admin/admin-ui";
import type { Enums } from "@/src/db/database.types";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { addUnit, updateUnit } from "@/src/modules/cx3/admin-actions";

export const metadata = { title: "CX-3 units" };

type UnitStatus = Enums<"cx3_unit_status">;

const unitStatus: Record<UnitStatus, { label: string; tone: Tone }> = {
  available: { label: "Available", tone: "good" },
  assigned: { label: "Assigned", tone: "info" },
  with_customer: { label: "With customer", tone: "warn" },
  maintenance: { label: "Maintenance", tone: "bad" },
  retired: { label: "Retired", tone: "neutral" },
};

export default async function UnitsPage() {
  const { supabase } = await requireAdmin();
  const { data: units } = await supabase
    .from("cx3_units")
    .select("id, unit_code, status, notes, cx3_assignments(released_at, bookings(booking_code, full_name))")
    .order("unit_code");
  const counts = (units ?? []).reduce<Partial<Record<UnitStatus, number>>>((total, unit) => ({ ...total, [unit.status]: (total[unit.status] ?? 0) + 1 }), {});

  return <>
    <AdminHeader eyebrow="Operations / Inventory" title="CX-3 units" />
    <div className="metric-grid">
      {(["available", "assigned", "with_customer", "maintenance"] as UnitStatus[]).map((status) => <div key={status}><span>{unitStatus[status].label}</span><strong>{counts[status] ?? 0}</strong></div>)}
    </div>
    <div className="admin-columns wide-left">
      <Panel title="All units">
        {units?.length ? <ul className="unit-list">{units.map((unit) => {
          const booking = unit.cx3_assignments.find((assignment) => !assignment.released_at)?.bookings;
          const onBooking = unit.status === "assigned" || unit.status === "with_customer";
          return <li key={unit.id}>
            <div className="unit-head">
              <b>{unit.unit_code}</b>
              <Pill tone={unitStatus[unit.status].tone}>{unitStatus[unit.status].label}</Pill>
              {booking ? <Link className="admin-link" href={`/admin/bookings/${booking.booking_code}`}>{booking.booking_code} · {booking.full_name}</Link> : null}
            </div>
            <ActionForm action={updateUnit} className="admin-form inline-form">
              <input type="hidden" name="id" value={unit.id} />
              {onBooking ? null : <label>Status<select name="status" defaultValue={unit.status}>
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select></label>}
              <label className="grow">Notes<input name="notes" maxLength={300} defaultValue={unit.notes ?? ""} placeholder="Condition, accessories, serial number…" /></label>
              <button className="admin-button" type="submit">Save</button>
            </ActionForm>
          </li>;
        })}</ul> : <EmptyState>No CX-3 units yet. Add your first unit to start assigning bookings.</EmptyState>}
      </Panel>
      <Panel title="Add a unit">
        <ActionForm action={addUnit} className="admin-form">
          <label>Unit ID<input name="unitCode" required maxLength={20} placeholder="e.g. CX3-01" /></label>
          <label>Notes<input name="notes" maxLength={300} placeholder="Optional" /></label>
          <button className="admin-button primary" type="submit">Add unit</button>
        </ActionForm>
        <p className="admin-muted">The unit ID is shown to the customer on the tracking page once the unit is assigned.</p>
      </Panel>
    </div>
  </>;
}
