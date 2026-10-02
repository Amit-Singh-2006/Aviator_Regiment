"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";

export type ActionResult = { ok?: string; error?: string } | void;

// Runs a server action and shows its result next to the form. Fields keep what
// the admin typed when an action fails. A button with data-confirm asks first.
export function ActionForm({ action, children, className }: { action: (formData: FormData) => Promise<ActionResult>; children: ReactNode; className?: string }) {
  const [result, setResult] = useState<ActionResult>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const question = submitter?.dataset.confirm;
    if (question && !window.confirm(question)) return;
    const formData = new FormData(event.currentTarget, submitter);
    // Browsers without FormData's submitter argument leave out the clicked button's value.
    if (submitter instanceof HTMLButtonElement && submitter.name && !formData.has(submitter.name)) formData.append(submitter.name, submitter.value);
    setResult(undefined);
    startTransition(async () => setResult(await action(formData)));
  }

  return <form className={className} onSubmit={handleSubmit} aria-busy={pending}>
    <fieldset className="action-fieldset" disabled={pending}>{children}</fieldset>
    {result?.error ? <p className="action-message error" role="alert">{result.error}</p> : null}
    {result?.ok ? <p className="action-message ok" role="status">{result.ok}</p> : null}
  </form>;
}
