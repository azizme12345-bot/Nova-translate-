import React, { useEffect } from 'react';

interface VoiceTranslationSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const VoiceTranslationSection: React.FC<VoiceTranslationSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Voice Speech Translation & Live Call — Nova Translator';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Speak naturally and translate your voice in real-time across 100+ languages with continuous voice recognition and AI speech synthesis.');
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
            Voice & Live Call Translation
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        <header>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Real-Time Voice Speech Translation</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Communicate effortlessly across language barriers using your voice. Nova Translator features advanced speech recognition and continuous voice translation, allowing you to speak freely and hear instant audio translations.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Voice Translation Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-[#2e7d32] mb-1">🎙️ Continuous Speech Recognition</h3>
              <p className="text-xs text-gray-600">Speak naturally without worrying about short pauses. The mic stays active until you finish.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-sm text-[#2e7d32] mb-1">📞 Live Call Translation Mode</h3>
              <p className="text-xs text-gray-600">Two-way conversation mode designed for bilingual dialogues and live interpretations.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Frequently Asked Questions on Voice Translation</h2>
          <div className="space-y-3">
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">How do I use voice translation?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Tap the microphone icon on the <button onClick={() => { window.history.pushState({}, '', '/'); onBack(); }} className="text-[#2e7d32] font-bold underline cursor-pointer">home page</button> and speak clearly into your device microphone. Your speech will be converted to text and translated instantly.
              </p>
            </details>
            <details className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-semibold text-sm text-gray-800 cursor-pointer">Why is microphone permission required?</summary>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Browser security requires microphone access permission to capture your voice input for speech-to-text translation.
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
            Try Voice Translation Now ➔
          </button>
        </div>
      </div>
    </div>
  );
};
