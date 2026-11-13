import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { ActivePage } from '../types.ts';

interface TopbarProps {
  activeView: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onToast: (msg: string) => void;
  onOpenApiKeyModal?: () => void;
  onOpenCallModal?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeView,
  onNavigate,
  onToast,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; page: ActivePage; icon: string }[] = [
    { label: 'Translate', page: 'translate', icon: '文A' },
    { label: 'Voice', page: 'voice-translation', icon: '🎙️' },
    { label: 'Camera OCR', page: 'image', icon: '📸' },
    { label: 'History', page: 'history', icon: '🕒' },
    { label: 'Languages', page: 'languages', icon: '🌐' },
    { label: 'About', page: 'about', icon: 'ℹ️' },
    { label: 'Terms', page: 'terms', icon: '📄' },
  ];

  const handleNavClick = (page: ActivePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="lafz-header">
      <div className="lafz-wrap lafz-nav">
        {/* Brand Header */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('translate');
          }}
          className="flex items-center gap-2.5 sm:gap-3 select-none no-underline group cursor-pointer shrink-0 min-w-0"
          title="LAFZ Translation Home"
        >
          <img
            src="/lafz-logo-icon.png"
            alt="LAFZ Translation Logo"
            className="h-9 sm:h-10 w-auto rounded-xl object-contain block shadow-xs transition group-hover:scale-105 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span
              className="font-extrabold text-lg sm:text-xl text-[#0f2a4a] leading-tight tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              LAFZ<span className="text-[#2f7de0]">.</span>
            </span>
            <span className="text-[11px] text-[#6b7a8f] font-medium leading-none hidden xl:block">
              Simple Language Translation
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden lg:flex lafz-navlinks">
          {navItems.map((item) => {
            const isActive =
              activeView === item.page ||
              (item.page === 'translate' && (activeView === 'home' || activeView === 'text-translation')) ||
              (item.page === 'voice-translation' && activeView === 'voice') ||
              (item.page === 'image' && activeView === 'camera');
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => handleNavClick(item.page)}
                className={isActive ? 'active' : ''}
              >
                <span className="mr-1.5 opacity-80">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton onToast={onToast} />

          {/* Mobile Menu Toggle */}
          <button
            id="menuToggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden border border-[#e3eaf3] bg-white hover:bg-[#eaf2fc] text-[#0f2a4a] rounded-xl w-10 h-10 flex items-center justify-center text-lg font-bold transition cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div id="mobileMenu" className="lg:hidden w-full max-w-full border-t border-[#e3eaf3] bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const isActive =
                activeView === item.page ||
                (item.page === 'translate' && (activeView === 'home' || activeView === 'text-translation')) ||
                (item.page === 'voice-translation' && activeView === 'voice') ||
                (item.page === 'image' && activeView === 'camera');
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  className={`min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-[#eaf2fc] text-[#1d5fb8] shadow-xs'
                      : 'bg-[#fafcfe] text-[#55657b] hover:bg-[#f1f5fa] hover:text-[#1d5fb8]'
                  }`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
