import React from 'react';
import { AppLanguage } from '../services/i18n.ts';

interface FooterProps {
  onNavigate: (page: any) => void;
  lang?: AppLanguage;
  onToggleLang?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-4 mt-auto text-xs text-gray-600">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="font-semibold text-gray-700">
          &copy; 2026 Nova Translator
        </div>
        <nav aria-label="Footer Navigation" className="flex items-center gap-5 font-semibold text-[#2e7d32]">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              onNavigate('translate');
            }}
            className="hover:underline"
          >
            Home
          </a>
          <a
            href="/about.html"
            className="hover:underline"
          >
            About
          </a>
          <a
            href="/privacy.html"
            className="hover:underline"
          >
            Privacy
          </a>
          <a
            href="/contact.html"
            className="hover:underline"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
};
