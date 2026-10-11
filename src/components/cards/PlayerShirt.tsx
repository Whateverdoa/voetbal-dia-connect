/** Realistic shirt extracted from the approved weekly artwork; number stays live. */
export function PlayerShirt({ number }: { number?: number | null }) {
  return (
    <svg viewBox="0 0 1239 1269" className="h-full w-full drop-shadow-md" aria-hidden="true" data-player-shirt>
      <image href="/team-portal/dia-yellow-shirt-v1-480.webp" width="1239" height="1269" />
      {number != null ? <text x="620" y="840" textAnchor="middle" fontSize="390" fontFamily="Arial, sans-serif" fontWeight="900" fill="#17191b">{number}</text> : null}
    </svg>
  );
}
