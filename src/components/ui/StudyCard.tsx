import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/classes";

interface StudyCardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  children: ReactNode;
  compact?: boolean;
  interactive?: boolean;
}

export function StudyCard({ as: Component = "section", children, className, compact = false, interactive = false, ...props }: StudyCardProps) {
  return (
    <Component
      className={cx(
        "card border border-base-300 bg-base-100 text-base-content",
        interactive && "transition hover:border-primary",
        className
      )}
      {...props}
    >
      <div className={cx("card-body", compact ? "gap-3 p-4" : "gap-4 p-5 md:p-6")}>{children}</div>
    </Component>
  );
}
