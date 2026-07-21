/**
 * The home screen's atmosphere — pure CSS, no image. A warm glow behind the balance plus a few faint
 * gold coins drifting, all very low-opacity and non-interactive so the number stays crisp. Sits behind
 * the content (the parent gives content a higher stacking context).
 */
export function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* warm glow, top-centered, behind the balance */}
      <div
        className="absolute left-1/2 top-[-14%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent)",
        }}
      />
      {/* a second, cooler-warm pool lower down for depth */}
      <div
        className="absolute left-[-10%] top-[38%] h-56 w-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-gold) 18%, transparent), transparent)",
        }}
      />

      {/* faint drifting coins */}
      <Coin className="left-6 top-[16%] h-9 w-9 animate-coin-float [animation-delay:0ms]" />
      <Coin className="right-7 top-[26%] h-6 w-6 animate-coin-float [animation-delay:1200ms]" />
      <Coin className="left-10 top-[46%] h-5 w-5 animate-coin-float [animation-delay:2200ms]" />
    </div>
  );
}

function Coin({ className }: { className?: string }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold text-gold/70 ${className ?? ""}`}
      style={{ background: "color-mix(in srgb, var(--color-gold) 14%, transparent)" }}
    >
      $
    </div>
  );
}
