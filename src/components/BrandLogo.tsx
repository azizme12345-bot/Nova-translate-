import React from 'react';
import { NovaLogo } from './NovaLogo.tsx';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * BrandLogo component using the exact requested Globe + Network + 'N' logo design.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 42, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <NovaLogo size={size} className="shrink-0" />

      {showText && (
        <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
          Nova <span className="text-[#06B6D4]">Translate</span>
        </span>
      )}
    </div>
  );
};
