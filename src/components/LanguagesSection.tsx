import React from 'react';
import { LanguageOption } from '../services/apiClient.ts';

interface LanguagesSectionProps {
  languages: LanguageOption[];
  onBack: () => void;
  onNavigate: (page: any) => void;
  onToast: (msg: string) => void;
}

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({ languages, onBack, onNavigate }) => {
  return (
    <div className="flex flex-col flex-1 bg-[#f0f0f0] rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Header */}
      <div className="bg-[#2e7d32] text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { window.history.pushState({}, '', '/'); onBack(); }}
            className="text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            ← Home
          </button>
          <span className="font-bold tracking-wide text-sm sm:text-base">
            Supported Languages — Nova Translator
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        <header>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Supported Languages & Dialects</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Nova Translator supports over 100+ global languages with high-fidelity AI translation models. Below are our core supported languages with native scripts, RTL/LTR layout support, and voice synthesis.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <div key={lang.code} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-2 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-gray-800">{lang.label}</span>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                  {lang.code}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Native Name: <span className="font-medium text-gray-900">{lang.nativeName}</span>
              </div>
              <div className="text-xs text-gray-500">
                Text & Voice Translation: <span className="text-emerald-700 font-semibold">Fully Supported</span>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-4 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Frequently Asked Questions on Languages</h2>
          <div className="space-y-3">
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">Can I translate between any two languages?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Yes! Nova Translator supports bidirectional translation between English, Urdu, Arabic, Spanish, French, German, Hindi, Japanese, Punjabi, and dozens of other languages.
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">Are RTL (Right-to-Left) scripts supported?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Absolutely. Languages like Urdu, Arabic, and Punjabi automatically switch to right-to-left (RTL) text alignment with proper Nastaliq typography rendering.
              </p>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
};
