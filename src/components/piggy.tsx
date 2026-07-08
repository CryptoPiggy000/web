/** Ceramic piggy bank — dusty rose, flat, one color moment. */
export function Piggy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" className={className} role="img" aria-label="Piggy bank">
      {/* tail */}
      <path
        d="M38 92c-10-2-16 4-14 12 2 7 10 9 14 5"
        fill="none"
        stroke="#b1786b"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* legs */}
      <rect x="70" y="128" width="18" height="26" rx="8" fill="#b1786b" />
      <rect x="140" y="128" width="18" height="26" rx="8" fill="#b1786b" />
      {/* body */}
      <ellipse cx="112" cy="92" rx="76" ry="58" fill="#d29b8f" />
      {/* ear */}
      <path d="M76 44c-8-12-4-24 2-28 4 10 14 14 22 14-6 4-16 10-24 14z" fill="#b1786b" />
      {/* coin slot */}
      <rect x="94" y="34" width="40" height="8" rx="4" fill="#4d3f39" />
      {/* eye */}
      <circle cx="158" cy="76" r="5" fill="#4d3f39" />
      {/* snout */}
      <ellipse cx="188" cy="96" rx="16" ry="13" fill="#b1786b" />
      <circle cx="184" cy="94" r="2.6" fill="#4d3f39" />
      <circle cx="193" cy="94" r="2.6" fill="#4d3f39" />
    </svg>
  );
}
