import Link from "next/link";
import { AdminHeader, EmptyState, Panel } from "@/src/components/admin/admin-ui";
import { formatDateTime } from "@/src/lib/format";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { describeAction, describeDetails } from "@/src/modules/audit/labels";

export const metadata = { title: "Activity" };

function entityLink(entity: string, entityId: string | null) {
  if (!entityId) return null;
  if (entity === "booking") return `/admin/bookings/${entityId}`;
  if (entity === "news_article") return `/admin/news/${entityId}`;
  return null;
}

export default async function ActivityPage() {
  const { supabase } = await requireAdmin();
  const [{ data: entries }, { data: admins }] = await Promise.all([
    supabase.from("audit_log").select("id, actor_id, action, entity, entity_id, details, created_at").order("created_at", { ascending: false }).limit(150),
    supabase.from("admin_users").select("user_id, full_name"),
  ]);
  const adminNames = new Map((admins ?? []).map((admin) => [admin.user_id, admin.full_name ?? "Admin"]));

  return <>
    <AdminHeader eyebrow="Operations / Audit trail" title="Activity" />
    <Panel>
      {entries?.length ? <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th><th>Record</th></tr></thead>
          <tbody>{entries.map((entry) => {
            const href = entityLink(entry.entity, entry.entity_id);
            const label = entry.entity === "booking" ? entry.entity_id : entry.entity.replace(/_/g, " ");
            return <tr key={entry.id}>
              <td>{formatDateTime(entry.created_at)}</td>
              <td>{entry.actor_id ? adminNames.get(entry.actor_id) ?? "Admin" : "Customer / system"}</td>
              <td><b>{describeAction(entry.action)}</b></td>
              <td className="wrap">{describeDetails(entry.details) ?? "—"}</td>
              <td>{href ? <Link className="row-link" href={href}>{label}</Link> : label}</td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <EmptyState>No activity yet. Bookings, payments and admin changes are recorded here.</EmptyState>}
    </Panel>
  </>;
}
