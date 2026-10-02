import Link from "next/link";
import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel, Pill } from "@/src/components/admin/admin-ui";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { saveCareerRole } from "@/src/modules/careers/admin-actions";

export const metadata = { title: "Careers" };

export default async function CareersAdminPage() {
  const { supabase } = await requireAdmin();
  const { data: roles } = await supabase
    .from("career_roles")
    .select("id, slug, name, published, sort_order, career_companies(count)")
    .order("sort_order")
    .order("name");

  return <>
    <AdminHeader eyebrow="Content / Careers" title="Careers" />
    <p className="next-step"><b>How it works</b>Each career lists companies. On the website, visitors pick a career, then a company, and go straight to that company&apos;s official careers page. Company links change over time, so check them now and then.</p>
    <div className="admin-columns wide-left">
      <Panel title="Careers">
        {roles?.length ? <ul className="task-list">{roles.map((role) => <li key={role.id}>
          <Link href={`/admin/careers/${role.id}`}>
            <b>{role.name} {role.published ? null : <Pill tone="neutral">Hidden</Pill>}</b>
            <span>{role.career_companies[0]?.count ?? 0} companies · /careers/{role.slug}</span>
          </Link>
        </li>)}</ul> : <EmptyState>No careers yet. Add the first one.</EmptyState>}
      </Panel>
      <Panel title="Add a career">
        <ActionForm action={saveCareerRole} className="admin-form">
          <label>Name<input name="name" required maxLength={80} placeholder="e.g. Flight Dispatcher" /></label>
          <label>Summary<textarea name="summary" rows={3} maxLength={300} /><small>One or two sentences shown at the top of the career page.</small></label>
          <label>WhatsApp enquiry<input name="enquiry" required maxLength={120} placeholder="becoming a flight dispatcher" /><small>Completes “Hi Aviator&apos;s Regiment, I would like guidance on …”.</small></label>
          <label>Order<input name="sortOrder" type="number" min={0} max={999} step={1} defaultValue={(roles?.length ?? 0) + 1} /></label>
          <label className="checkbox"><input type="checkbox" name="published" defaultChecked />Show on the website</label>
          <button className="admin-button primary" type="submit">Add career</button>
        </ActionForm>
      </Panel>
    </div>
  </>;
}
