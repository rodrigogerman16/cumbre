const COVER_VARIANTS = [
  { sky: ['#F6C89A', '#E88A4E'], far: '#5C6B57', near: '#2E3B2C' },
  { sky: ['#BFD9EA', '#8FB9CE'], far: '#6B7A6A', near: '#2E3B2C' },
  { sky: ['#D8C6E0', '#9B85AC'], far: '#57506A', near: '#2A2438' },
  { sky: ['#F3DCC9', '#E0A671'], far: '#6B5A4A', near: '#3B2E26' },
];

// Cuando la ruta todavía no tiene una foto de portada aprobada, generamos un
// paisaje de montañas simple y determinístico a partir del índice — así el
// feed no se ve vacío mientras la moderación aprueba la primera foto.
export function RouteCoverArt({ seed }: { seed: number }) {
  const variant = COVER_VARIANTS[seed % COVER_VARIANTS.length];
  const gradientId = `sky-${seed}`;

  return (
    <svg viewBox="0 0 400 220" width="100%" height={180} preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={variant.sky[0]} />
          <stop offset="100%" stopColor={variant.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#${gradientId})`} />
      <polygon points="0,160 90,70 150,130 220,50 290,140 400,90 400,220 0,220" fill={variant.far} opacity={0.55} />
      <polygon points="0,190 120,110 200,160 320,90 400,150 400,220 0,220" fill={variant.near} />
    </svg>
  );
}
