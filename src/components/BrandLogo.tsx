import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * Official BrandLogo component using the exact app logo:
 * Green 3D icon with 'A' and '文' rounded tiles & curved arrows.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 42, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/app-logo.jpg"
        alt="Nova Translator Logo"
        width={size}
        height={size}
        className="rounded-xl shadow-sm object-cover shrink-0 select-none transition-transform duration-200 hover:scale-105"
        style={{ width: `${size}px`, height: `${size}px` }}
        loading="eager"
      />

      {showText && (
        <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 flex items-center gap-1">
          NOVA <span className="text-[#2e7d32]">Translator</span>
        </span>
      )}
    </div>
  );
};

