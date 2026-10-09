import React from 'react';

interface ToastProps {
  message: string | null;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      id="toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#111111]/95 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all"
    >
      {message}
    </div>
  );
};
