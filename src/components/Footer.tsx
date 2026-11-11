import React from 'react';
import { AppLanguage, t } from '../services/i18n.ts';

interface FooterProps {
  onNavigate: (page: any) => void;
  lang: AppLanguage;
  onToggleLang: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, lang, onToggleLang }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-8 px-4 mt-auto text-xs text-gray-600">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-2.5 font-bold text-gray-800 text-sm">
            <img
              src="/app-logo.png"
              alt="Nova Translator Logo"
              width={26}
              height={26}
              className="w-6.5 h-6.5 rounded-md object-cover border border-emerald-600/20 shrink-0"
            />
            <span className="tracking-tight">{t('novaTranslator', lang)}</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              AI English &amp; Urdu
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">
              {lang === 'en' ? 'Language / زبان:' : 'زبان / Language:'}
            </span>
            <button
              type="button"
              onClick={onToggleLang}
              className="bg-emerald-700 text-white font-bold px-3 py-1 rounded-md shadow-xs hover:bg-emerald-800 transition cursor-pointer text-xs"
              title="Switch language between English and Urdu"
            >
              {lang === 'en' ? 'اردو ورژن' : 'English Version'}
            </button>
          </div>
        </div>

        {/* 8 Canonical Internal Links for Googlebot & Users */}
        <nav
          aria-label="Internal Page Directory"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left font-medium"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              onNavigate('translate');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Nova Translator Home - Instant English to Urdu Translation"
          >
            🏠 {t('home', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/ (Home)</span>
          </a>

          <a
            href="/sitemap"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/sitemap');
              onNavigate('sitemap');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Sitemap & Complete Tools Directory"
          >
            🗺️ {t('sitemap', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/sitemap</span>
          </a>

          <a
            href="/text-translation"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/text-translation');
              onNavigate('text-translation');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Text Translation Guide and Features"
          >
            ✍️ {t('textTranslation', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/text-translation</span>
          </a>

          <a
            href="/voice"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/voice');
              onNavigate('voice-translation');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Voice Translator & Live Speech-to-Text"
          >
            🎙️ {t('voiceTranslation', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/voice</span>
          </a>

          <a
            href="/camera"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/camera');
              onNavigate('image');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Camera OCR & Photo Scanner Translator"
          >
            📷 {t('cameraOcr', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/camera</span>
          </a>

          <a
            href="/languages"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/languages');
              onNavigate('languages');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="100+ Supported International Languages Catalog"
          >
            🌐 {t('languages', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/languages</span>
          </a>

          <a
            href="/history"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/history');
              onNavigate('history');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="Translation History & Saved Phrases Log"
          >
            🕒 {t('history', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/history</span>
          </a>

          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/about');
              onNavigate('about');
            }}
            className="p-2 rounded-lg hover:bg-gray-50 hover:text-[#2e7d32] transition border border-transparent hover:border-gray-200"
            title="About Nova Translator - Mission and Technology"
          >
            ℹ️ {t('aboutUs', lang)}
            <span className="block text-[11px] text-gray-400 font-normal">/about</span>
          </a>
        </nav>

        <div className="flex flex-col sm:flex-row items-center justify-between text-gray-400 text-xs gap-2 pt-2 border-t border-gray-100">
          <div>
            &copy; 2026 Nova Translator. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                onNavigate('translate');
              }}
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              Home
            </a>
            <span>•</span>
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/about');
                onNavigate('about');
              }}
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              About
            </a>
            <span>•</span>
            <a
              href="/sitemap"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/sitemap');
                onNavigate('sitemap');
              }}
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              Sitemap
            </a>
            <span>•</span>
            <a
              href="/privacy.html"
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="/contact.html"
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              Contact
            </a>
            <span>•</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              XML Sitemap
            </a>
            <span>•</span>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2e7d32] hover:underline font-semibold"
            >
              robots.txt
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
