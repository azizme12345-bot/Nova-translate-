import React, { useEffect } from 'react';

interface TextTranslationSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const TextTranslationSection: React.FC<TextTranslationSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'AI Text Translation — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Translate sentences, paragraphs, and documents instantly with AI-powered natural text translation across 100+ languages.'
      );
    }
  }, []);

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            window.history.pushState({}, '', '/');
            onBack();
          }}
          className="text-xs sm:text-sm font-bold text-[#1d5fb8] hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          ← Back to Translator
        </button>

        <span className="text-xs font-bold text-[#6b7a8f] uppercase tracking-wider">
          AI Text Engine
        </span>
      </div>

      <article className="lafz-card p-5 sm:p-7 flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-4">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Instant AI Text Translation
          </h1>
          <p className="text-sm text-[#6b7a8f] leading-relaxed">
            Experience lightning-fast, highly accurate text translation powered by advanced Google Gemini AI models. Adapts intelligently to formal writing, natural dialogues, and technical terms.
          </p>
        </header>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
            <div className="text-2xl mb-1">⚡</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-1">Fast Local Cache</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Frequently translated phrases respond in 0ms with local client-side memory caching.
            </p>
          </div>

          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
            <div className="text-2xl mb-1">🗣️</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-1">Voice Pronunciation</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Listen to translated output with natural speech synthesis in male and female voices.
            </p>
          </div>

          <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
            <div className="text-2xl mb-1">📋</div>
            <h2 className="font-bold text-sm text-[#0f2a4a] mb-1">Copy &amp; Share</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              One-click copying to clipboard and direct sharing to WhatsApp, Messages, or email.
            </p>
          </div>
        </section>

        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="lafz-primary-btn text-sm px-6 py-3 cursor-pointer"
          >
            Open Translator Editor ➔
          </button>
        </div>
      </article>
    </div>
  );
};
