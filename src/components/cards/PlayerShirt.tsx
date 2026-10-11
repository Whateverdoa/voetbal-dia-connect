/** Neutral DIA shirt used only when no permitted, usable portrait is available. */
export function PlayerShirt({ number }: { number?: number | null }) {
  return (
    <svg viewBox="0 0 160 170" className="h-full w-full drop-shadow-md" aria-hidden="true" data-player-shirt>
      <path d="M52 12 24 25 5 60l27 17 10-17v98h76V60l10 17 27-17-19-35-28-13Z" fill="#f5d51b" stroke="#c49e15" strokeWidth="3" strokeLinejoin="round" />
      <path d="m5 60 27 17 6-10-27-17Zm150 0-27 17-6-10 27-17Z" fill="#17191b" />
      <path d="M52 12q28 28 56 0l-9-5q-19 14-38 0Z" fill="#17191b" />
      <path d="M44 45v108m72-108v108" stroke="#fff28b" strokeWidth="2" opacity=".6" />
      {number != null ? <text x="80" y="112" textAnchor="middle" fontSize="52" fontFamily="Arial, sans-serif" fontWeight="900" fill="#17191b">{number}</text> : null}
    </svg>
  );
}
