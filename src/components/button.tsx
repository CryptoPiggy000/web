import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "lg" | "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-deep hover:shadow-md active:scale-[0.98]",
  secondary:
    "border border-line bg-card text-ink hover:bg-paper hover:border-muted active:scale-[0.98]",
  ghost: "text-muted hover:text-ink hover:bg-card active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  lg: "px-6 py-4 text-base rounded-2xl gap-2.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
};

/** Shared button for the whole app. Variants + sizes + optional leading icon. */
export function Button({
  variant = "primary",
  size = "md",
  full = false,
  icon,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40 ${
        VARIANTS[variant]
      } ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
