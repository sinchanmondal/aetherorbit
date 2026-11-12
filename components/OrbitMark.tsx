/** AetherOrbit glyph: a planet with an inclined orbit and a satellite. */
export default function OrbitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="6.5" fill="url(#orbitmark-planet)" />
      <ellipse cx="16" cy="16" rx="14" ry="5.2" transform="rotate(-24 16 16)" stroke="#5CE1E6" strokeOpacity="0.75" strokeWidth="1.2" />
      <circle cx="27.6" cy="10.4" r="1.9" fill="#5CE1E6" />
      <defs>
        <radialGradient id="orbitmark-planet" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#B9AFFF" />
          <stop offset="1" stopColor="#5B4FC0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
