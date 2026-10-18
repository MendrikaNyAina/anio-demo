// Petit calendrier dessiné, dans le trait des stickers de JournalTitle.
const INK = '#2F2B6E'

export function PlanningIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="block">
      <rect x="5" y="9" width="38" height="34" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
      <path d="M5 17a8 8 0 0 1 8-8h22a8 8 0 0 1 8 8v3H5z" fill="#F9C6DD" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="14" y="4" width="4" height="10" rx="2" fill={INK} />
      <rect x="30" y="4" width="4" height="10" rx="2" fill={INK} />
      <circle cx="15" cy="28" r="2.2" fill="#A3A8EE" />
      <circle cx="24" cy="28" r="2.2" fill="#A3A8EE" />
      <circle cx="33" cy="28" r="2.2" fill="#A3A8EE" />
      <circle cx="15" cy="36" r="2.2" fill="#A3A8EE" />
      <path
        d="M24 32.5l1.3 2.9 3.2.3-2.4 2.1.7 3.1-2.8-1.6-2.8 1.6.7-3.1-2.4-2.1 3.2-.3z"
        fill="#FFE08A"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}
