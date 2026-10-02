import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * HD Vector SVG Logo reflecting the official AI Translator logo:
 * - Squircle container with deep teal gradient (#0d5c52 -> #083e38)
 * - Two facing profile silhouettes in warm cream (#fbf8eb)
 * - Multilingual translation flow paths with book, speech bubble, flags, and language characters
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 42, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/app-logo.jpg"
        alt="Nova Translate HD Logo"
        width={size}
        height={size}
        className="shrink-0 object-cover shadow-md transition-transform hover:scale-105"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.22)}px`,
        }}
        onError={(e) => {
          // Fallback if image path fails
          (e.target as HTMLImageElement).src = '/assets/app-logo.jpg';
        }}
      />

      {showText && (
        <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
          Nova <span className="text-[#2dd4bf]">Translate</span>
        </span>
      )}
    </div>
  );
};
