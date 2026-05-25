import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/classes";

type ButtonTone = "primary" | "secondary" | "accent" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "circle" | "square";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: ReactNode;
}

const toneClass: Record<ButtonTone, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  ghost: "btn-ghost",
  soft: "btn-outline border-base-300 bg-base-100/75",
  danger: "btn-error btn-outline"
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  circle: "btn-circle",
  square: "btn-square"
};

export function Button({ children, className, icon, size = "md", tone = "soft", type = "button", ...props }: ButtonProps) {
  return (
    <button className={cx("btn study-btn", toneClass[tone], sizeClass[size], className)} type={type} {...props}>
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonProps {
  label: string;
}

export function IconButton({ children, label, size = "circle", ...props }: IconButtonProps) {
  return (
    <Button aria-label={label} size={size} title={props.title ?? label} {...props}>
      {children}
    </Button>
  );
}
