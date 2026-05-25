import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/classes";

export type BadgeTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info" | "outline";

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
  info: "badge-info",
  outline: "badge-outline"
};

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span className={cx("badge badge-soft gap-1.5 font-semibold", toneClass[tone], className)} {...props}>
      {children}
    </span>
  );
}
