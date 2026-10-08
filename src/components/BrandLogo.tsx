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
        <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
          NOVA <span className="text-[#0284c7] dark:text-[#38bdf8]">Translator</span>
        </span>
      )}
    </div>
  );
};
