import React, { useEffect } from 'react';

interface TextTranslationSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const TextTranslationSection: React.FC<TextTranslationSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'AI Text Translation — Nova Translator';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Translate sentences, paragraphs, and documents instantly with AI-powered natural text translation across 100+ languages.');
    }
  }, []);

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
            AI Text Translation Guide
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        <header>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Instant AI Text Translation</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Experience lightning-fast, highly accurate text translation powered by advanced Google Gemini AI models. Whether you need formal business translation or casual conversational phrasing, Nova Translator adapts instantly.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Key Features of Text Translation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-[#2e7d32] mb-1">⚡ Instant 0ms Cache</h3>
              <p className="text-xs text-gray-600">Frequently translated phrases are cached locally for zero-latency response.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-[#2e7d32] mb-1">🗣️ Audio Pronunciation</h3>
              <p className="text-xs text-gray-600">Listen to translated text with natural male and female voice synthesis.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-[#2e7d32] mb-1">📋 Copy & Share</h3>
              <p className="text-xs text-gray-600">Easily copy translations to clipboard or share them directly across social apps.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Frequently Asked Questions</h2>
          <div className="space-y-3">
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">How do I start translating text?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Simply visit the <button onClick={() => { window.history.pushState({}, '', '/'); onBack(); }} className="text-[#2e7d32] font-bold underline cursor-pointer">home page</button>, type or paste your text in the input box, and the translation will appear instantly in real-time.
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">Is there a character limit for text translation?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                You can translate up to 5,000 characters per request, making it ideal for paragraphs, emails, and articles.
              </p>
            </details>
          </div>
        </section>

        <div className="mt-auto pt-6 flex justify-center">
          <button
            type="button"
            onClick={() => { window.history.pushState({}, '', '/'); onBack(); }}
            className="bg-[#2e7d32] hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer"
          >
            Start Translating Now ➔
          </button>
        </div>
      </div>
    </div>
  );
};
