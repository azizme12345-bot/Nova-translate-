import React from 'react';

interface NovaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Official Nova Translator Logo
 * Green 3D icon with 'A' and '文' rounded tiles & curved arrows
 */
export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 52, className = '' }) => {
  return (
    <img
      src="/app-logo.jpg"
      alt="Nova Translate Official Logo"
      width={size}
      height={size}
      className={`rounded-xl shadow-sm object-cover shrink-0 select-none transition-transform duration-200 hover:scale-105 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      loading="eager"
    />
  );
};

