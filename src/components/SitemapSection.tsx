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
    document.title = 'Sitemap & Tools Directory — Nova Translator';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Explore all tools, features, and web pages available on Nova Translator. Complete sitemap and directory for users and search engine indexing.'
      );
    }
  }, []);

  const tools = [
    {
      titleEn: 'Text Translation Tool',
      titleUr: 'ٹیکسٹ ٹرانسلیشن ٹول',
      icon: '✍️',
      path: '/text-translation',
      pageKey: 'text-translation' as ActivePage,
      descEn:
        'Fast and accurate bidirectional text translator supporting English, Urdu, Arabic, Spanish, French, German, and 100+ languages. Includes instant language swap, character count, and 1-click clipboard copy.',
      descUr:
        'انگریزی، اردو، عربی، ہسپانوی اور 100 سے زائد زبانوں میں تیز رفتار اور درست متنی ترجمہ۔ زبانوں کے تبادلے (Swap) اور کلپ بورڈ کاپی کی سہولت کے ساتھ۔',
      tag: 'Core Tool',
    },
    {
      titleEn: 'Voice Translator & Speech-to-Text',
      titleUr: 'صوتی ترجمہ اور اسپیچ ٹو ٹیکسٹ',
      icon: '🎙️',
      path: '/voice',
      pageKey: 'voice-translation' as ActivePage,
      descEn:
        'Instant real-time speech recognition. Speak through your microphone in English or Urdu and get immediate spoken translation with natural male and female voice playback.',
      descUr:
        'مائیکروفون کے ذریعے بول کر فوری صوتی ترجمہ حاصل کریں۔ آواز سن کر ٹیکسٹ میں تبدیل کرنے اور مردانہ و زنانہ آواز میں سننے کی سہولت۔',
      tag: 'Voice AI',
    },
    {
      titleEn: 'Camera OCR & Photo Scanner',
      titleUr: 'کیمرہ اسکینر اور تصویری ترجمہ',
      icon: '📷',
      path: '/camera',
      pageKey: 'camera' as ActivePage,
      descEn:
        'Visual optical character recognition (OCR) translator. Scan restaurant menus, street signboards, packaging, and documents using your device camera or uploaded photos.',
      descUr:
        'کیمرے یا تصویر کے ذریعے کسی بھی بورڈ، مینو یا دستاویز کا فوری ترجمہ۔ موبائل کیمرے سے تصویر کھینچیں اور متن کا ترجمہ دیکھیں۔',
      tag: 'Vision OCR',
    },
    {
      titleEn: 'Supported Languages Directory',
      titleUr: 'معاونت شدہ زبانوں کی ڈائریکٹری',
      icon: '🌐',
      path: '/languages',
      pageKey: 'languages' as ActivePage,
      descEn:
        'Browse our extensive catalog of 100+ supported international languages, including native scripts, language codes, and right-to-left (RTL) writing directions.',
      descUr:
        'دنیا بھر کی 100 سے زائد بین الاقوامی زبانوں کی مکمل فہرست بشمول رسم الخط اور زبان کے کوڈز۔',
      tag: 'Dictionary',
    },
    {
      titleEn: 'Translation History & Favorites',
      titleUr: 'ہسٹری اور محفوظ شدہ ترجمے',
      icon: '📜',
      path: '/history',
      pageKey: 'history' as ActivePage,
      descEn:
        'Easily review your past translations, save frequent phrases to favorites for instant access, and reuse them without typing again.',
      descUr:
        'اپنے سابقہ ترجموں کو ہسٹری میں دیکھیں، اہم جملوں کو فیورٹ میں محفوظ کریں اور بغیر دوبارہ ٹائپ کیے استعمال کریں۔',
      tag: 'History',
    },
    {
      titleEn: 'About Nova Translator & AI Architecture',
      titleUr: 'نوا ٹرانسلیٹر کے بارے میں تفصیلات',
      icon: 'ℹ️',
      path: '/about',
      pageKey: 'about' as ActivePage,
      descEn:
        'Learn about our high-speed translation platform, Google Gemini multimodal technology, zero-lag client-side cache, and privacy architecture.',
      descUr:
        'ہمارے تیز رفتار پلیٹ فارم، جدید ٹیکنالوجی، اور پرائیویسی پر مبنی آرکیٹیکچر کے بارے میں تفصیلی معلومات۔',
      tag: 'About',
    },
  ];

  return (
    <div className="flex flex-col flex-1 bg-[#f0f0f0] rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Header Bar */}
      <div className="bg-[#2e7d32] text-white px-4 py-3 flex justify-between items-center shadow-md select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            ← {t('home', lang)}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wide text-sm sm:text-base">
              {lang === 'ur' ? 'سائٹ میپ اور ٹولز ڈائریکٹری' : 'Sitemap & Tools Directory'}
            </span>
          </div>
        </div>
        <span className="text-xs bg-emerald-800/80 px-2.5 py-0.5 rounded-full font-medium">
          SEO Index
        </span>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        {/* Intro Banner */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <img
            src="/app-logo.png"
            alt="Nova Translator Official Logo"
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl shadow-sm object-cover border border-emerald-600/20 shrink-0"
            loading="eager"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
              {lang === 'ur' ? 'نوا ٹرانسلیٹر: مکمل سائٹ میپ اور ٹولز' : 'Nova Translator: Sitemap & Complete Tools Index'}
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {lang === 'ur'
                ? 'یہ ویب پیج گوگل سرچ انجن اور صارفین کے لیے تیار کیا گیا ہے تاکہ معلوم ہو سکے کہ اس ویب سائٹ میں کون سے ٹولز ہیں اور وہ کس طرح کام کرتے ہیں۔'
                : 'This comprehensive sitemap and directory outlines every tool, page, and feature available in Nova Translator for users and Google Search Engine indexing.'}
            </p>
          </div>
        </header>

        {/* XML Sitemap Direct Link Box */}
        <section className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold text-sm">📄 XML Sitemap for Search Engines</span>
              <span className="bg-emerald-200 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-xs text-emerald-900/80 mt-1">
              Direct XML endpoint for Google Search Console, Bing Webmaster, and crawlers:
              <code className="ml-1 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px] text-emerald-800">
                https://nova-translate-orpin.vercel.app/sitemap.xml
              </code>
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#2e7d32] hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs shrink-0 cursor-pointer"
          >
            Open sitemap.xml ↗
          </a>
        </section>

        {/* Tools Grid */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {lang === 'ur' ? 'دستیاب ٹولز اور ان کے افعال' : 'Available Tools & What You Can Do'}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'ur'
                ? 'ہر ٹول کو براہ راست کھولنے کے لیے لنک پر کلک کریں:'
                : 'Click any tool below to launch and start translating immediately:'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool, idx) => (
              <div
                key={idx}
                className="p-4 bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 hover:border-emerald-300 rounded-xl transition flex flex-col justify-between shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1.5 bg-white rounded-lg border border-gray-200 shadow-2xs">
                        {tool.icon}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-emerald-800 transition">
                        {lang === 'ur' ? tool.titleUr : tool.titleEn}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {tool.tag}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed mb-1.5">
                    {tool.descEn}
                  </p>
                  <p
                    className="text-xs text-emerald-900/90 leading-relaxed font-urdu text-right border-t border-gray-200/60 pt-1.5"
                    dir="rtl"
                  >
                    {tool.descUr}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono text-[11px]">{tool.path}</span>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', tool.path);
                      onNavigate(tool.pageKey);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer group-hover:translate-x-0.5 duration-150"
                  >
                    <span>{lang === 'ur' ? 'ٹول کھولیں' : 'Open Tool'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Structured Web Page Index Table for Googlebot */}
        <section className="space-y-3 pt-2">
          <h2 className="text-base font-bold text-gray-900">
            {lang === 'ur' ? 'گوگل انڈیکسنگ پیجز کی فہرست' : 'Complete Page Index & Crawl Architecture'}
          </h2>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <th className="p-3">Page Name</th>
                  <th className="p-3">Canonical URL</th>
                  <th className="p-3">Primary Purpose</th>
                  <th className="p-3">Index Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Home Translator</td>
                  <td className="p-3 font-mono text-emerald-700">/</td>
                  <td className="p-3">Core English ↔ Urdu translation engine with text, voice & camera</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="p-3 font-semibold text-gray-900">HTML Sitemap Directory</td>
                  <td className="p-3 font-mono text-emerald-700">/sitemap</td>
                  <td className="p-3">Full tools directory and navigational index for search crawlers</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Camera OCR Translation</td>
                  <td className="p-3 font-mono text-emerald-700">/camera</td>
                  <td className="p-3">Image text recognition and live photo scan translation</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="p-3 font-semibold text-gray-900">Voice Translation</td>
                  <td className="p-3 font-mono text-emerald-700">/voice</td>
                  <td className="p-3">Microphone speech-to-text with spoken voice synthesis</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Text Translation</td>
                  <td className="p-3 font-mono text-emerald-700">/text-translation</td>
                  <td className="p-3">Extended dedicated text translation interface</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="p-3 font-semibold text-gray-900">Supported Languages</td>
                  <td className="p-3 font-mono text-emerald-700">/languages</td>
                  <td className="p-3">Directory of 100+ global languages with native names</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-900">Translation History</td>
                  <td className="p-3 font-mono text-emerald-700">/history</td>
                  <td className="p-3">Manage and review previous user translations</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="p-3 font-semibold text-gray-900">About Nova Translator</td>
                  <td className="p-3 font-mono text-emerald-700">/about</td>
                  <td className="p-3">Product details, AI engine specs, and privacy policy</td>
                  <td className="p-3 font-bold text-emerald-600">Index, Follow</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Back Button */}
        <div className="pt-4 flex justify-between items-center border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="bg-[#2e7d32] hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
          >
            ← {lang === 'ur' ? 'ہوم پیج پر واپس جائیں' : 'Back to Home'}
          </button>

          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
          >
            {lang === 'ur' ? 'ایکس ایم ایل سائٹ میپ دیکھیں (sitemap.xml)' : 'View XML Sitemap (sitemap.xml)'}
          </a>
        </div>
      </div>
    </div>
  );
};
