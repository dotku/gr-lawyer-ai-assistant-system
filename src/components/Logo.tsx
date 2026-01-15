interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'full' | 'icon';
}

export function Logo({
  className = '',
  width = 240,
  height = 280,
  variant = 'full'
}: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Background */}
        <rect width="240" height="240" fill="#003366" rx="12" />

        {/* Balanced circles representing scales of justice */}
        <circle
          cx="120"
          cy="120"
          r="70"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="165"
          cy="95"
          r="20"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="75"
          cy="145"
          r="20"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="240" height="280" fill="#003366" rx="12" />

      {/* Balanced circles representing scales of justice */}
      <circle
        cx="120"
        cy="100"
        r="50"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="155"
        cy="80"
        r="15"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="85"
        cy="120"
        r="15"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />

      {/* Brand name - spaced lowercase letters like orbits */}
      <text
        x="120"
        y="200"
        fontFamily="sans-serif"
        fontSize="28"
        fontWeight="300"
        letterSpacing="12"
        fill="white"
        textAnchor="middle"
      >
        ordolex
      </text>
    </svg>
  );
}

export default Logo;
