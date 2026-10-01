import React from 'react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface TopbarProps {
  onToggleTheme: () => void;
  onHelp: () => void;
  onToast: (msg: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleTheme, onHelp, onToast }) => {
  return (
    <header className="topbar">
      <div className="mobilebrand">
        <div className="logo">A</div>
        Nova Translate
      </div>
      <div></div>
      <div className="top-actions">
        <PWAInstallButton onToast={onToast} />
        <button className="iconbtn" id="theme" onClick={onToggleTheme} title="Toggle Theme" type="button">
          ☼
        </button>
        <button className="iconbtn" id="help" onClick={onHelp} title="About / Help" type="button">
          ?
        </button>
      </div>
    </header>
  );
};
