import React from 'react';
import { ActivePage } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { Bookmark, Home, Camera, History, Settings } from 'lucide-react';
import { AppLanguage, t } from '../services/i18n.ts';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  lang: AppLanguage;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage, lang }) => {
  return (
    <aside className="sidebar">
      <div className="brand cursor-pointer" onClick={() => onSelectPage('home')}>
        <BrandLogo size={42} />
        <span className="font-extrabold text-lg text-white tracking-tight">{t('novaTranslator', lang)}</span>
      </div>
      <nav className="nav">
        <button
          className={activePage === 'home' ? 'active' : ''}
          onClick={() => onSelectPage('home')}
          type="button"
        >
          <Home className="w-4 h-4 icon" />
          <span>{t('home', lang)}</span>
        </button>
        <button
          className={activePage === 'camera' ? 'active' : ''}
          onClick={() => onSelectPage('camera')}
          type="button"
        >
          <Camera className="w-4 h-4 icon" />
          <span>{t('camera', lang)}</span>
        </button>
        <button
          className={activePage === 'saved' ? 'active' : ''}
          onClick={() => onSelectPage('saved')}
          type="button"
        >
          <Bookmark className="w-4 h-4 icon" />
          <span>{t('saved', lang)}</span>
        </button>
        <button
          className={activePage === 'history' ? 'active' : ''}
          onClick={() => onSelectPage('history')}
          type="button"
        >
          <History className="w-4 h-4 icon" />
          <span>{t('history', lang)}</span>
        </button>
        <button
          className={activePage === 'settings' ? 'active' : ''}
          onClick={() => onSelectPage('settings')}
          type="button"
        >
          <Settings className="w-4 h-4 icon" />
          <span>{t('settings', lang)}</span>
        </button>
      </nav>
      <div className="sidebottom">{t('novaTranslator', lang)} · Pro</div>
    </aside>
  );
};
