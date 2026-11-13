import React from 'react';

interface NovaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Official LAFZ Translation Logo
 */
export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 40, className = '' }) => {
  return (
    <img
      src="/lafz-logo-icon.png"
      alt="LAFZ Translation Logo"
      style={{ height: `${size}px`, width: 'auto' }}
      className={`rounded-xl object-contain block ${className}`}
    />
  );
};
