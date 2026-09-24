export default function Ekg({ className = "", fast = false, color = "currentColor", width = 3 }) {
  return (
    <svg viewBox="0 0 600 80" className={className} fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 40 H150 l12-24 14 48 12-30 10 6 H300 l10-18 12 36 10-24 8 6 H440 l10-16 12 32 10-22 8 6 H600"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={fast ? "ekg-line-fast" : "ekg-line"}
      />
    </svg>
  );
}

export function Cross({ className = "" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M13 4h6v9h9v6h-9v9h-6v-9H4v-6h9z" fill="currentColor" />
    </svg>
  );
}
