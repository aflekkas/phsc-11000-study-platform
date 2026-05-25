import { cx } from "../../lib/classes";

interface ProgressBarProps {
  className?: string;
  label: string;
  value: number;
}

export function ProgressBar({ className, label, value }: ProgressBarProps) {
  const bounded = Math.min(100, Math.max(0, value));
  return <progress className={cx("progress progress-primary h-3 w-full", className)} value={bounded} max={100} aria-label={label} />;
}
