import { cx } from "../../lib/classes";

interface ProgressBarProps {
  className?: string;
  label: string;
  value: number;
}

export function ProgressBar({ className, label, value }: ProgressBarProps) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div className={cx("study-progress", className)} aria-label={label}>
      <progress className="progress progress-primary h-3 w-full" value={bounded} max={100} />
      <span style={{ width: `${bounded}%` }} />
    </div>
  );
}
