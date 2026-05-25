import type { ReactNode } from "react";
import { cx } from "../../lib/classes";

type StatTone = "teal" | "green" | "amber" | "blue" | "purple" | "red";

const toneClass: Record<StatTone, string> = {
  teal: "text-primary bg-primary/10",
  green: "text-success bg-success/10",
  amber: "text-warning bg-warning/15",
  blue: "text-info bg-info/10",
  purple: "text-accent bg-accent/10",
  red: "text-error bg-error/10"
};

export function StatTile({ icon, label, value, tone = "teal" }: { icon: ReactNode; label: string; value: ReactNode; tone?: StatTone }) {
  return (
    <div className="stat study-stat min-h-24 p-4">
      <div className={cx("stat-figure rounded-field p-2.5", toneClass[tone])}>{icon}</div>
      <div className="stat-title text-sm font-bold text-base-content/60">{label}</div>
      <div className="stat-value text-2xl tabular-nums text-base-content">{value}</div>
    </div>
  );
}
