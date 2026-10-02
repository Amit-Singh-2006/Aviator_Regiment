import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/src/components/admin/action-form";
import { AdminHeader, EmptyState, Panel, Pill } from "@/src/components/admin/admin-ui";
import { requireAdmin } from "@/src/lib/supabase/auth";
import { deleteCareerCompany, deleteCareerRole, saveCareerCompany, saveCareerRole } from "@/src/modules/careers/admin-actions";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit career" };

type Company = { id: string; name: string; careers_url: string; note: string | null; sort_order: number; published: boolean };

function CompanyFields({ roleId, company, nextOrder }: { roleId: string; company?: Company; nextOrder?: number }) {
  return <>
    {company ? <input type="hidden" name="id" value={company.id} /> : null}
    <input type="hidden" name="roleId" value={roleId} />
    <label>Company<input name="name" required maxLength={80} defaultValue={company?.name} placeholder="e.g. IndiGo" /></label>
    <label className="grow">Careers page link<input name="careersUrl" type="url" required defaultValue={company?.careers_url} placeholder="https://" /></label>
    <label>Note<input name="note" maxLength={120} defaultValue={company?.note ?? ""} placeholder="Optional, e.g. Cadet programme" /></label>
    <label className="narrow">Order<input name="sortOrder" type="number" min={0} max={999} step={1} defaultValue={company?.sort_order ?? nextOrder ?? 0} /></label>
    <label className="checkbox"><input type="checkbox" name="published" defaultChecked={company?.published ?? true} />Shown</label>
  </>;
}

export default async function CareerEditorPage({ params }: { params: Params }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: role } = await supabase
    .from("career_roles")
    .select("id, slug, name, summary, guide, enquiry, sort_order, published, career_companies(id, name, careers_url, note, sort_order, published)")
    .eq("id", id)
    .maybeSingle();
  if (!role) notFound();
  const companies = [...role.career_companies].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const nextOrder = companies.reduce((max, company) => Math.max(max, company.sort_order), 0) + 1;

  return <>
    <Link className="admin-back" href="/admin/careers">← All careers</Link>
    <AdminHeader eyebrow="Content / Careers" title={role.name}>
      {role.published ? <Link className="admin-button" href={`/careers/${role.slug}`} target="_blank">View on website ↗</Link> : <Pill tone="neutral">Hidden</Pill>}
    </AdminHeader>

    <Panel title="Companies">
      <p className="admin-muted">Each company opens its official careers page for this role. Use the page for this role (for example the pilots or cabin crew section) when the company has one.</p>
      {companies.length ? <ul className="source-list">{companies.map((company) => <li key={company.id}>
        <ActionForm action={saveCareerCompany} className="admin-form source-row">
          <CompanyFields roleId={role.id} company={company} />
          <button className="admin-button" type="submit">Save</button>
        </ActionForm>
        <div className="source-meta">
          <a className="admin-link" href={company.careers_url} target="_blank" rel="noopener noreferrer">Open link ↗</a>
          <ActionForm action={deleteCareerCompany}>
            <input type="hidden" name="id" value={company.id} />
            <input type="hidden" name="roleId" value={role.id} />
            <button className="admin-link danger" type="submit" data-confirm={`Remove ${company.name} from ${role.name}?`}>Remove</button>
          </ActionForm>
        </div>
      </li>)}</ul> : <EmptyState>No companies yet. Add the first one below.</EmptyState>}
    </Panel>

    <Panel title="Add a company">
      <ActionForm action={saveCareerCompany} className="admin-form source-row">
        <CompanyFields roleId={role.id} nextOrder={nextOrder} />
        <button className="admin-button primary" type="submit">Add company</button>
      </ActionForm>
    </Panel>

    <Panel title="Career details">
      <ActionForm action={saveCareerRole} className="admin-form">
        <input type="hidden" name="id" value={role.id} />
        <div className="form-grid">
          <label>Name<input name="name" required maxLength={80} defaultValue={role.name} /></label>
          <label>URL slug<span className="input-prefix"><span>/careers/</span><input name="slug" maxLength={80} defaultValue={role.slug} /></span></label>
          <label>WhatsApp enquiry<input name="enquiry" required maxLength={120} defaultValue={role.enquiry} /><small>Completes “I would like guidance on …”.</small></label>
          <label>Order<input name="sortOrder" type="number" min={0} max={999} step={1} defaultValue={role.sort_order} /></label>
        </div>
        <label>Summary<textarea name="summary" rows={3} maxLength={300} defaultValue={role.summary} /></label>
        <label>Career guide (optional)<textarea name="guide" rows={10} defaultValue={role.guide ?? ""} className="mono" placeholder={"## Eligibility\n- …\n\n## Training pathway\n…"} /><small>Shown below the companies. Markdown: ## Heading · **bold** · - list item · [link text](https://…)</small></label>
        <label className="checkbox"><input type="checkbox" name="published" defaultChecked={role.published} />Show this career on the website</label>
        <button className="admin-button primary" type="submit">Save career</button>
      </ActionForm>
      <ActionForm action={deleteCareerRole} className="danger-zone">
        <input type="hidden" name="id" value={role.id} />
        <button className="admin-button danger" type="submit" data-confirm={`Delete ${role.name} and all its company links? This can't be undone.`}>Delete career</button>
      </ActionForm>
    </Panel>
  </>;
}
