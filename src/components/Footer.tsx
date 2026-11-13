import React from 'react';
import { ActivePage } from '../types.ts';
import { AppLanguage } from '../services/i18n.ts';

interface FooterProps {
  activeView?: ActivePage;
  onNavigate: (page: ActivePage) => void;
  lang?: AppLanguage;
  onToggleLang?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ activeView, onNavigate }) => {
  const linkClass = (isActive: boolean) =>
    `hover:underline ${isActive ? 'underline text-[#0f2a4a]' : ''}`;

  return (
    <footer className="w-full max-w-full border-t border-[#e3eaf3] bg-white/70 py-6 text-xs text-[#8996a5] mt-auto">
      <div className="lafz-wrap flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left min-w-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/lafz-logo-icon.png"
            alt="LAFZ Translation Logo"
            className="h-7 w-auto rounded-md object-contain block"
          />
          <span className="font-extrabold text-sm text-[#0f2a4a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            LAFZ Translation
          </span>
        </div>

        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-5 font-semibold text-[#1d5fb8]">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('translate');
            }}
            className={linkClass(activeView === 'translate' || activeView === 'home')}
          >
            Home
          </a>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('about');
            }}
            className={linkClass(activeView === 'about')}
          >
            About
          </a>
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('privacy');
            }}
            className={linkClass(activeView === 'privacy')}
          >
            Privacy
          </a>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('terms');
            }}
            className={linkClass(activeView === 'terms')}
          >
            Terms
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('contact');
            }}
            className={linkClass(activeView === 'contact')}
          >
            Contact
          </a>
        </nav>

        <div>
          &copy; {new Date().getFullYear()} LAFZ Translation. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
