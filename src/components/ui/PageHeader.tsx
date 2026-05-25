import type { ReactNode } from "react";

export function PageHeader({ actions, eyebrow, title }: { actions?: ReactNode; eyebrow: string; title: ReactNode }) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}
