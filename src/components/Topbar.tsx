import React from 'react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { BrandLogo } from './BrandLogo.tsx';
import { AppLanguage, t } from '../services/i18n.ts';

interface TopbarProps {
  lang: AppLanguage;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onHelp: () => void;
  onOpenSettings?: () => void;
  onToast: (msg: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ lang, onToggleLang, onToggleTheme, onHelp, onOpenSettings, onToast }) => {
  return (
    <header className="topbar">
      <div className="mobilebrand flex items-center gap-2">
        <BrandLogo size={36} showText={true} />
      </div>
      <div></div>
      <div className="top-actions flex items-center gap-2">
        <button
          className="smallbtn font-bold px-2.5 py-1 text-xs cursor-pointer bg-emerald-700 text-white border-emerald-600 rounded-lg hover:bg-emerald-800 transition"
          onClick={onToggleLang}
          title="Switch Language (English / اردو)"
          type="button"
        >
          {lang === 'en' ? 'اردو' : 'English'}
        </button>
        <PWAInstallButton onToast={onToast} />
        {onOpenSettings && (
          <button
            className="iconbtn"
            id="topbarSettings"
            onClick={onOpenSettings}
            title={t('settings', lang)}
            type="button"
            aria-label="Open Settings"
          >
            ⚙
          </button>
        )}
        <button className="iconbtn" id="theme" onClick={onToggleTheme} title="Toggle Theme" type="button" aria-label="Toggle Theme">
          ☼
        </button>
        <button className="iconbtn" id="help" onClick={onHelp} title={t('aboutUs', lang)} type="button" aria-label="About and Help">
          ?
        </button>
      </div>
    </header>
  );
};
