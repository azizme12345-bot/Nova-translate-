import React, { useId } from 'react';

interface NovaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Exact Globe + Geometric Network Nodes + Bold Center "N" Logo
 * Matches the uploaded reference image (Navy #1E3A8A to Cyan #06B6D4 gradient)
 */
export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 52, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const globeGradId = `globeGrad_${uid}`;
  const nGradId = `nGrad_${uid}`;
  const shadowGradId = `shadowGrad_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 205"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform duration-200 hover:scale-105 ${className}`}
      aria-label="Nova Translate Logo"
    >
      <defs>
        {/* Diagonal Gradient: Bottom-Left Deep Navy/Indigo (#2B2467 / #1E3A8A) to Top-Right Bright Cyan (#2CCAD8 / #06B6D4) */}
        <linearGradient id={globeGradId} x1="15%" y1="85%" x2="85%" y2="15%">
          <stop offset="0%" stopColor="#2D2363" />
          <stop offset="32%" stopColor="#1E3A8A" />
          <stop offset="68%" stopColor="#1B82B5" />
          <stop offset="100%" stopColor="#2BC9D9" />
        </linearGradient>

        {/* Center "N" Gradient: Deep Navy Blue to Ocean Cyan-Blue */}
        <linearGradient id={nGradId} x1="15%" y1="85%" x2="85%" y2="15%">
          <stop offset="0%" stopColor="#2B2568" />
          <stop offset="45%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#2376B7" />
        </linearGradient>

        {/* Soft Floor Shadow Gradient under the Globe */}
        <radialGradient id={shadowGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#1E3A8A" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle 3D Drop Shadow Ellipse underneath Globe */}
      <ellipse cx="100" cy="192" rx="56" ry="6" fill={`url(#${shadowGradId})`} />

      {/* Main Globe Network Group (Centered at 100, 92 with Radius 78) */}
      <g stroke={`url(#${globeGradId})`} strokeLinecap="round" strokeLinejoin="round">
        {/* Outer Globe Ring */}
        <circle cx="100" cy="92" r="78" strokeWidth="6" fill="none" />

        {/* Outer Left & Right Meridian Arcs */}
        <path
          d="M 100 14 C 48 28, 30 60, 22 92 C 30 124, 48 156, 100 170"
          strokeWidth="3.6"
          fill="none"
        />
        <path
          d="M 100 14 C 152 28, 170 60, 178 92 C 170 124, 152 156, 100 170"
          strokeWidth="3.6"
          fill="none"
        />

        {/* Inner Left & Right Meridian Curves (Framing the central open space) */}
        <path
          d="M 100 14 C 76 26, 50 56, 42 92 C 50 128, 76 158, 100 170"
          strokeWidth="3.6"
          fill="none"
        />
        <path
          d="M 100 14 C 124 26, 150 56, 158 92 C 150 128, 124 158, 100 170"
          strokeWidth="3.6"
          fill="none"
        />

        {/* Top Pole Inner Meridian Spokes (Terminating at the open center window) */}
        <path d="M 100 14 Q 88 30 84 47" strokeWidth="3.5" fill="none" />
        <path d="M 100 14 Q 112 30 116 47" strokeWidth="3.5" fill="none" />

        {/* Bottom Pole Inner Meridian Spokes (Terminating at the open center window) */}
        <path d="M 100 170 Q 88 154 84 137" strokeWidth="3.5" fill="none" />
        <path d="M 100 170 Q 112 154 116 137" strokeWidth="3.5" fill="none" />

        {/* Upper Latitude Arc */}
        <path
          d="M 32 54 Q 64 36 100 36 Q 136 36 168 54"
          strokeWidth="3.5"
          fill="none"
        />

        {/* Lower Latitude Arc */}
        <path
          d="M 32 130 Q 64 148 100 148 Q 136 148 168 130"
          strokeWidth="3.5"
          fill="none"
        />

        {/* Left & Right Equatorial Mesh Connections */}
        <line x1="22" y1="92" x2="53" y2="92" strokeWidth="3.5" />
        <line x1="22" y1="92" x2="47" y2="66" strokeWidth="3.2" />
        <line x1="22" y1="92" x2="47" y2="118" strokeWidth="3.2" />

        <line x1="178" y1="92" x2="147" y2="92" strokeWidth="3.5" />
        <line x1="178" y1="92" x2="153" y2="66" strokeWidth="3.2" />
        <line x1="178" y1="92" x2="153" y2="118" strokeWidth="3.2" />

        {/* Short Inward Radial Stubs pointing toward the "N" (Exact match to reference photo) */}
        <line x1="47" y1="66" x2="57" y2="71" strokeWidth="3.5" />
        <line x1="47" y1="118" x2="57" y2="113" strokeWidth="3.5" />
        <line x1="153" y1="66" x2="143" y2="71" strokeWidth="3.5" />
        <line x1="153" y1="118" x2="143" y2="113" strokeWidth="3.5" />
        <line x1="72" y1="39" x2="76" y2="48" strokeWidth="3.5" />
        <line x1="128" y1="39" x2="124" y2="48" strokeWidth="3.5" />
        <line x1="72" y1="145" x2="76" y2="136" strokeWidth="3.5" />
        <line x1="128" y1="145" x2="124" y2="136" strokeWidth="3.5" />
      </g>

      {/* Network Intersection Nodes (Solid Gradient Circles) */}
      <g fill={`url(#${globeGradId})`}>
        {/* Upper Latitude Nodes */}
        <circle cx="53" cy="46" r="4.8" />
        <circle cx="72" cy="39" r="5.4" />
        <circle cx="86" cy="37" r="5.2" />
        <circle cx="114" cy="37" r="5.2" />
        <circle cx="128" cy="39" r="5.4" />
        <circle cx="147" cy="46" r="4.8" />

        {/* Left Side Nodes */}
        <circle cx="47" cy="66" r="5.4" />
        <circle cx="42" cy="92" r="5.6" />
        <circle cx="47" cy="118" r="5.4" />

        {/* Right Side Nodes */}
        <circle cx="153" cy="66" r="5.4" />
        <circle cx="158" cy="92" r="5.6" />
        <circle cx="153" cy="118" r="5.4" />

        {/* Lower Latitude Nodes */}
        <circle cx="53" cy="138" r="4.8" />
        <circle cx="72" cy="145" r="5.4" />
        <circle cx="86" cy="147" r="5.2" />
        <circle cx="114" cy="147" r="5.2" />
        <circle cx="128" cy="145" r="5.4" />
        <circle cx="147" cy="138" r="4.8" />
      </g>

      {/* Center Bold Geometric "N" */}
      <path
        d="M 68 128 L 68 56 L 85 56 L 115 101 L 115 56 L 132 56 L 132 128 L 115 128 L 85 83 L 85 128 Z"
        fill={`url(#${nGradId})`}
      />
    </svg>
  );
};
