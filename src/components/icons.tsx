/** Small line icons, sized by font (1em) so they inherit button text size. */
type IconProps = { className?: string };

export function IconTrendUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className ?? "h-[1.1em] w-[1.1em]"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l4-4 3 3 6-6" />
      <path d="M12 6h4v4" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className ?? "h-[1.1em] w-[1.1em]"} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function IconArrowDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className ?? "h-[1.1em] w-[1.1em]"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4v11M5 10l5 5 5-5" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className ?? "h-[1.1em] w-[1.1em]"} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
