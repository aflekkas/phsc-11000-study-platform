import type { ReactNode } from "react";
import { cx } from "../../lib/classes";

type StatTone = "teal" | "green" | "amber" | "blue" | "purple" | "red";

const toneClass: Record<StatTone, string> = {
  teal: "from-primary/15 text-primary",
  green: "from-success/15 text-success",
  amber: "from-warning/20 text-warning",
  blue: "from-info/15 text-info",
  purple: "from-accent/15 text-accent",
  red: "from-error/15 text-error"
};

export function StatTile({ icon, label, value, tone = "teal" }: { icon: ReactNode; label: string; value: ReactNode; tone?: StatTone }) {
  return (
    <div className="stat study-stat min-h-24 rounded-box border border-base-300/80 bg-base-100/85 p-4 shadow-sm">
      <div className={cx("stat-figure rounded-2xl bg-gradient-to-br to-transparent p-2.5", toneClass[tone])}>{icon}</div>
      <div className="stat-title text-sm font-bold text-base-content/60">{label}</div>
      <div className="stat-value text-2xl tabular-nums text-base-content">{value}</div>
    </div>
  );
}
