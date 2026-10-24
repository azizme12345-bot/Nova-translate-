import React from 'react';
import { AppLanguage, t } from '../services/i18n.ts';

interface FooterProps {
  onNavigate: (page: any) => void;
  lang: AppLanguage;
  onToggleLang: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, lang, onToggleLang }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-auto text-xs text-gray-600">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <img
            src="/app-logo.png"
            alt="Nova Translator Logo"
            width={24}
            height={24}
            className="w-6 h-6 rounded-md object-cover border border-emerald-600/20 shrink-0"
          />
          <span>{t('novaTranslator', lang)}</span>
        </div>
        
        <nav className="flex flex-wrap items-center justify-center gap-4 text-gray-600 font-medium">
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/'); onNavigate('translate'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('home', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/text-translation'); onNavigate('text-translation'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('textTranslation', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/voice-translation'); onNavigate('voice-translation'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('voiceTranslation', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/camera-translation'); onNavigate('image'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('cameraOcr', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/languages'); onNavigate('languages'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('languages', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/about'); onNavigate('about'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('aboutUs', lang)}
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/sitemap'); onNavigate('sitemap'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            {t('sitemap', lang)}
          </button>
          <button
            type="button"
            onClick={onToggleLang}
            className="bg-emerald-700 text-white font-bold px-2 py-0.5 rounded shadow-xs hover:bg-emerald-800 transition cursor-pointer"
          >
            {lang === 'en' ? 'اردو' : 'English'}
          </button>
        </nav>

        <div className="text-gray-400 text-center sm:text-right">
          &copy; 2026 {t('novaTranslator', lang)}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
