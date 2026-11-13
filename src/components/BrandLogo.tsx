import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, showText = false, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/lafz-logo-icon.png"
        alt="LAFZ Translation Logo"
        style={{ height: `${size}px`, width: 'auto' }}
        className="rounded-xl object-contain block"
      />
      {showText && (
        <span className="font-extrabold text-[20px] tracking-tight text-[#0f2a4a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          LAFZ<span className="text-[#2f7de0]">.</span>
        </span>
      )}
    </div>
  );
};
