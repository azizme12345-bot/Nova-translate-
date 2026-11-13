import React, { useEffect } from 'react';

interface VoiceTranslationSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const VoiceTranslationSection: React.FC<VoiceTranslationSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Voice Speech Translation & Live Audio — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Speak naturally and translate your voice in real-time across 100+ languages with continuous voice recognition and AI speech synthesis.'
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
          Voice Speech Engine
        </span>
      </div>

      <article className="lafz-card p-5 sm:p-7 flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-4">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Real-Time Voice &amp; Speech Translation
          </h1>
          <p className="text-sm text-[#6b7a8f] leading-relaxed">
            Communicate effortlessly across language barriers using your natural voice. Powered by Google Gemini AI speech recognition and text-to-speech synthesis.
          </p>
        </header>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] flex flex-col gap-2">
            <span className="text-2xl">🎙️</span>
            <h2 className="font-bold text-sm text-[#0f2a4a]">Continuous Speech Recognition</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Speak full sentences without worrying about short pauses. The mic keeps recording until you choose to stop.
            </p>
          </div>

          <div className="p-5 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] flex flex-col gap-2">
            <span className="text-2xl">🗣️</span>
            <h2 className="font-bold text-sm text-[#0f2a4a]">Bilingual Speech Synthesis</h2>
            <p className="text-xs text-[#6b7a8f] leading-relaxed">
              Listen to high-definition pronunciations in male or female natural voices for English, Urdu, and more.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pt-2 flex flex-col gap-3">
          <h2
            className="text-lg font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Voice Translation Guide
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
              <h3 className="font-bold text-xs sm:text-sm text-[#0f2a4a] mb-1">
                How do I grant microphone access?
              </h3>
              <p className="text-xs text-[#6b7a8f] leading-relaxed">
                When prompted by your browser, tap Allow. You can also adjust permissions anytime in your browser site settings.
              </p>
            </div>

            <div className="p-4 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3]">
              <h3 className="font-bold text-xs sm:text-sm text-[#0f2a4a] mb-1">
                Does voice translation work in noisy environments?
              </h3>
              <p className="text-xs text-[#6b7a8f] leading-relaxed">
                Yes, our audio pre-processing and Opus compression optimize voice clarity before transcription to maintain high accuracy.
              </p>
            </div>
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
            Open Voice Translator ➔
          </button>
        </div>
      </article>
    </div>
  );
};
