import React, { useEffect } from 'react';
import { ActivePage } from '../types.ts';
import { AppLanguage, t } from '../services/i18n.ts';

interface SitemapSectionProps {
  onBack: () => void;
  onNavigate: (page: ActivePage) => void;
  lang?: AppLanguage;
}

export const SitemapSection: React.FC<SitemapSectionProps> = ({ onBack, onNavigate, lang = 'en' }) => {
  useEffect(() => {
    document.title = 'Sitemap & Tools Directory — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Explore all tools, features, and web pages available on LAFZ Translation. Complete sitemap and directory for users and search engine indexing.'
      );
    }
  }, []);

  const tools = [
    {
      titleEn: 'Text Translation Tool',
      icon: '✍️',
      path: '/text-translation',
      pageKey: 'text-translation' as ActivePage,
      descEn:
        'Fast and accurate bidirectional text translator supporting English, Urdu, Arabic, Spanish, French, German, and 100+ languages. Includes instant language swap, character count, and 1-click clipboard copy.',
      tag: 'Core Tool',
    },
    {
      titleEn: 'Voice Translator & Speech-to-Text',
      icon: '🎙️',
      path: '/voice',
      pageKey: 'voice-translation' as ActivePage,
      descEn:
        'Instant speech recognition. Speak through your microphone in English or Urdu and get immediate translation with spoken playback.',
      tag: 'Voice',
    },
    {
      titleEn: 'Camera OCR & Photo Scanner',
      icon: '📷',
      path: '/camera',
      pageKey: 'image' as ActivePage,
      descEn:
        'Optical character recognition (OCR) translator. Scan restaurant menus, street signboards, packaging, and documents using your device camera or uploaded photos.',
      tag: 'Vision OCR',
    },
    {
      titleEn: 'Supported Languages Directory',
      icon: '🌐',
      path: '/languages',
      pageKey: 'languages' as ActivePage,
      descEn:
        'Browse supported international languages, including native scripts, language codes, and right-to-left (RTL) writing directions.',
      tag: 'Languages',
    },
    {
      titleEn: 'Translation History & Favorites',
      icon: '📜',
      path: '/history',
      pageKey: 'history' as ActivePage,
      descEn:
        'Review your past translations stored in your browser, save frequent phrases to favorites, and reuse them without typing again.',
      tag: 'History',
    },
    {
      titleEn: 'About, Privacy, Terms & Contact',
      icon: 'ℹ️',
      path: '/about',
      pageKey: 'about' as ActivePage,
      descEn:
        'Read about LAFZ Translation, how privacy and browser storage work, our Terms of Use, and how to send feedback or bug reports.',
      tag: 'Info',
    },
  ];

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6 min-w-0">
      <div className="lafz-content-card flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="text-xs sm:text-sm font-bold text-[#1d5fb8] hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            ← {t('home', lang)}
          </button>
          <span className="text-xs bg-[#eaf2fc] text-[#1d5fb8] px-2.5 py-0.5 rounded-full font-bold">
            Sitemap &amp; Directory
          </span>
        </div>

        {/* Intro Banner */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-[#e3eaf3]">
          <img
            src="/lafz-logo-icon.png"
            alt="LAFZ Translation Official Logo"
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl shadow-sm object-contain block shrink-0"
            loading="eager"
          />
          <div className="min-w-0">
            <h1
              className="text-2xl font-extrabold text-[#0f2a4a] mb-1"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              LAFZ Translation: Sitemap &amp; Complete Tools Index
            </h1>
            <p className="text-base text-[#6b7a8f] leading-relaxed">
              This directory outlines every tool, page, and informational resource available in LAFZ Translation.
            </p>
          </div>
        </header>

        {/* XML Sitemap Direct Link Box */}
        <section className="bg-[#fafcfe] border border-[#e3eaf3] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#1d5fb8] font-bold text-sm">XML Sitemap for Search Engines</span>
            </div>
            <p className="text-xs text-[#6b7a8f] mt-1 break-all">
              Direct XML endpoint:{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-[#e3eaf3] font-mono text-[11px] text-[#1d5fb8]">
                https://nova-translate-orpin.vercel.app/sitemap.xml
              </code>
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#1d5fb8] hover:bg-[#174e98] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs shrink-0 cursor-pointer no-underline"
          >
            Open sitemap.xml ↗
          </a>
        </section>

        {/* Tools Grid */}
        <section className="space-y-4">
          <div>
            <h2
              className="text-lg font-bold text-[#0f2a4a]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Available Tools &amp; What You Can Do
            </h2>
            <p className="text-sm text-[#6b7a8f]">
              Click any tool or page below to open it directly:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#fafcfe] hover:bg-[#f1f7ff] border border-[#e3eaf3] hover:border-[#2f7de0] rounded-2xl transition flex flex-col justify-between group min-w-0"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl p-1.5 bg-white rounded-lg border border-[#e3eaf3] shrink-0">
                        {tool.icon}
                      </span>
                      <h3 className="font-bold text-sm text-[#0f2a4a] group-hover:text-[#1d5fb8] transition truncate">
                        {tool.titleEn}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d5fb8] bg-[#eaf2fc] px-2 py-0.5 rounded-md shrink-0">
                      {tool.tag}
                    </span>
                  </div>

                  <p className="text-xs text-[#6b7a8f] leading-relaxed mb-1.5">
                    {tool.descEn}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#e3eaf3] flex items-center justify-between text-xs">
                  <span className="text-[#8996a5] font-mono text-[11px]">{tool.path}</span>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', tool.path);
                      onNavigate(tool.pageKey);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-[#1d5fb8] hover:underline transition cursor-pointer"
                  >
                    <span>Open Tool</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Structured Web Page Index Table */}
        <section className="space-y-3 pt-2">
          <h2
            className="text-base font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Complete Page Index
          </h2>
          <div className="overflow-x-auto border border-[#e3eaf3] rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f1f5fa] text-[#0f2a4a] font-bold border-b border-[#e3eaf3]">
                  <th className="p-3">Page Name</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Primary Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3eaf3] text-[#55657b]">
                <tr>
                  <td className="p-3 font-semibold text-[#0f2a4a]">Home Translator</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/ (#home)</td>
                  <td className="p-3">Core translation workspace and step-by-step usage guide</td>
                </tr>
                <tr className="bg-[#fafcfe]">
                  <td className="p-3 font-semibold text-[#0f2a4a]">Camera OCR Translation</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/camera (#image)</td>
                  <td className="p-3">Image text extraction and photo scan translation</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#0f2a4a]">Voice Translation</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/voice (#voice)</td>
                  <td className="p-3">Microphone speech input and spoken output guide</td>
                </tr>
                <tr className="bg-[#fafcfe]">
                  <td className="p-3 font-semibold text-[#0f2a4a]">About LAFZ Translation</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/about (#about)</td>
                  <td className="p-3">Mission, simplicity overview, audience, and responsive design</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#0f2a4a]">Privacy Policy</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/privacy (#privacy)</td>
                  <td className="p-3">Server processing, browser localStorage, voice, and clearing history</td>
                </tr>
                <tr className="bg-[#fafcfe]">
                  <td className="p-3 font-semibold text-[#0f2a4a]">Terms of Use</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/terms (#terms)</td>
                  <td className="p-3">Acceptable use, disclaimers, service availability, and ownership</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#0f2a4a]">Contact Us</td>
                  <td className="p-3 font-mono text-[#1d5fb8]">/contact (#contact)</td>
                  <td className="p-3">Email contact details and bug report guidelines</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="pt-2 flex justify-between items-center border-t border-[#e3eaf3]">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="lafz-primary-btn text-xs px-4 py-2.5 cursor-pointer"
          >
            ← Back to Home
          </button>

          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#1d5fb8] font-bold hover:underline"
          >
            View XML Sitemap
          </a>
        </div>
      </div>
    </div>
  );
};
