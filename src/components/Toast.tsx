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
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-cyan-950/95 text-white dark:text-cyan-100 border border-slate-700/80 dark:border-cyan-500/40 text-xs font-semibold shadow-xl backdrop-blur-md transition-all animate-screen"
    >
      {message}
    </div>
  );
};
