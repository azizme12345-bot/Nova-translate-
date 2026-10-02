import React from 'react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface TopbarProps {
  onToggleTheme: () => void;
  onHelp: () => void;
  onOpenSettings?: () => void;
  onToast: (msg: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleTheme, onHelp, onOpenSettings, onToast }) => {
  return (
    <header className="topbar">
      <div className="mobilebrand">
        <div className="logo">A</div>
        Nova Translate
      </div>
      <div></div>
      <div className="top-actions">
        <PWAInstallButton onToast={onToast} />
        {onOpenSettings && (
          <button
            className="iconbtn"
            id="topbarSettings"
            onClick={onOpenSettings}
            title="Open Settings"
            type="button"
            aria-label="Open Settings"
          >
            ⚙
          </button>
        )}
        <button className="iconbtn" id="theme" onClick={onToggleTheme} title="Toggle Theme" type="button" aria-label="Toggle Theme">
          ☼
        </button>
        <button className="iconbtn" id="help" onClick={onHelp} title="About / Help" type="button" aria-label="About and Help">
          ?
        </button>
      </div>
    </header>
  );
};
