import React, { useEffect } from 'react';

interface AboutSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'About Us — Nova Translator';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Learn about Nova Translator, our mission to bridge global communication gaps with Google Gemini AI translation technology.');
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
            About Nova Translator
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
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
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">About Nova Translator</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Nova Translator is a next-generation multilingual communication suite designed to connect people across the globe. Powered by state-of-the-art Google Gemini AI models, we deliver fast, contextual, and natural translations for text, voice, and camera text recognition.
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Our Mission</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Our mission is to eliminate language barriers in education, travel, business, and daily conversation by providing a lightning-fast, highly accurate, and privacy-focused translation experience accessible on any device.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Core Technologies</h2>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1.5">
            <li>Google Gemini Flash & Pro AI Models for intelligent context understanding.</li>
            <li>Web Speech API for continuous real-time voice recognition.</li>
            <li>Client-side caching for instant 0ms responses on frequent translations.</li>
            <li>Progressive Web App (PWA) compliance for offline readiness and fast mobile install.</li>
          </ul>
        </section>

        <div className="mt-auto pt-6 flex justify-center">
          <button
            type="button"
            onClick={() => { window.history.pushState({}, '', '/'); onBack(); }}
            className="bg-[#2e7d32] hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer"
          >
            Back to Translator ➔
          </button>
        </div>
      </div>
    </div>
  );
};
