import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/classes";

type BadgeTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info"
};

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span className={cx("badge gap-1.5 font-bold", toneClass[tone], className)} {...props}>
      {children}
    </span>
  );
}
