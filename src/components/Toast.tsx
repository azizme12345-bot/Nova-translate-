import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="lafz-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
};
