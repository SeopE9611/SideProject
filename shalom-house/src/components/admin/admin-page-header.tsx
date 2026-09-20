import type { ReactNode } from "react";

type AdminPageHeaderProps = { title: string; description: string; supportingContent?: ReactNode; actions?: ReactNode };

export function AdminPageHeader({ title, description, supportingContent, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-title font-bold">{title}</h1>
        <p className="mt-2 text-body text-muted-foreground">{description}</p>
        {supportingContent ? <p className="mt-2 text-small text-muted-foreground">{supportingContent}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
