import React from 'react';

interface NovaLogoProps {
  size?: number;
  className?: string;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 48, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-md transition-transform hover:scale-105 ${className}`}
    >
      <defs>
        {/* Exact Navy to Cyan Gradient */}
        <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="50%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id="nGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        {/* Drop shadow */}
        <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#logoShadow)">
        {/* Outer Globe Circle with gradient stroke */}
        <circle cx="60" cy="60" r="50" stroke="url(#globeGrad)" strokeWidth="4.5" fill="none" />

        {/* Meridian & Parallel Network Lines */}
        <ellipse cx="60" cy="60" rx="22" ry="50" stroke="url(#globeGrad)" strokeWidth="2.5" fill="none" opacity="0.85" />
        <ellipse cx="60" cy="60" rx="46" ry="22" stroke="url(#globeGrad)" strokeWidth="2.5" fill="none" opacity="0.85" />
        <line x1="10" y1="60" x2="110" y2="60" stroke="url(#globeGrad)" strokeWidth="2.5" opacity="0.85" />
        <line x1="60" y1="10" x2="60" y2="110" stroke="url(#globeGrad)" strokeWidth="2.5" opacity="0.85" />

        {/* Diagonal Network Connection Arcs */}
        <path d="M 22 28 Q 60 45 98 28" stroke="url(#globeGrad)" strokeWidth="2" fill="none" opacity="0.75" />
        <path d="M 22 92 Q 60 75 98 92" stroke="url(#globeGrad)" strokeWidth="2" fill="none" opacity="0.75" />

        {/* Network Connection Nodes (Small circles on grid intersections) */}
        <circle cx="60" cy="10" r="3.5" fill="#06B6D4" />
        <circle cx="60" cy="110" r="3.5" fill="#1E3A8A" />
        <circle cx="10" cy="60" r="3.5" fill="#1E3A8A" />
        <circle cx="110" cy="60" r="3.5" fill="#06B6D4" />
        <circle cx="38" cy="22" r="3" fill="#0F766E" />
        <circle cx="82" cy="22" r="3" fill="#06B6D4" />
        <circle cx="38" cy="98" r="3" fill="#1E3A8A" />
        <circle cx="82" cy="98" r="3" fill="#0F766E" />
        <circle cx="18" cy="38" r="3" fill="#1E3A8A" />
        <circle cx="102" cy="38" r="3" fill="#06B6D4" />
        <circle cx="18" cy="82" r="3" fill="#1E3A8A" />
        <circle cx="102" cy="82" r="3" fill="#06B6D4" />

        {/* Center Circular Background Pill for "N" */}
        <circle cx="60" cy="60" r="32" fill="#FFFFFF" fillOpacity="0.92" stroke="url(#globeGrad)" strokeWidth="2" />

        {/* Large Bold "N" Letter in Navy Blue (#1E3A8A) */}
        <text
          x="60"
          y="73"
          fontFamily="system-ui, -apple-system, 'Poppins', sans-serif"
          fontSize="42"
          fontWeight="900"
          fill="url(#nGrad)"
          textAnchor="middle"
          letterSpacing="-1"
        >
          N
        </text>
      </g>
    </svg>
  );
};
