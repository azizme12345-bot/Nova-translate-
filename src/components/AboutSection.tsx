import React, { useEffect } from 'react';

interface AboutSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'About Us — Lafz Translator';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Learn about Lafz Translator, our mission to bridge global communication gaps with Google Gemini AI translation technology.');
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
            About Lafz Translator
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6 bg-white overflow-y-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <img
            src="/app-logo.png"
            alt="Lafz Translator Official Logo"
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl shadow-sm object-cover border border-emerald-600/20 shrink-0"
            loading="eager"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">About Lafz Translator</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Lafz Translator is a next-generation multilingual communication suite designed to connect people across the globe. Powered by state-of-the-art Google Gemini AI models, we deliver fast, contextual, and natural translations for text, voice, and camera text recognition.
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">What Lafz Translator Does &amp; Who It Is For</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Lafz Translator is built specifically for anyone who needs fast, accurate, and reliable translation between English and Urdu, as well as over 100 other international languages. Whether you are a student learning a new language, a traveler navigating foreign streets, a business professional handling international documents, or someone communicating daily with friends and family across language barriers, Lafz Translator provides the tools you need right in your browser or mobile device.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Our application is designed to be lightweight, responsive, and completely user-friendly. Because it is a Progressive Web App (PWA), you can easily install Lafz Translator directly onto your phone or computer home screen like a native mobile app without visiting an app store. It also translates a small set of common everyday phrases even when you are offline, and it keeps your translation history private in your browser.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">How Our Translation Features Work</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">✍️ Text Translation</h3>
              <p>
                Type or paste sentences and paragraphs into the translator input box. Powered by advanced Google Gemini AI, the system instantly processes context, grammar, and natural phrasing to deliver clear bidirectional translation between English and Urdu with correct right-to-left (RTL) script alignment.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">🎙️ Voice &amp; Speech Translation</h3>
              <p>
                Tap the microphone icon to speak naturally into your device. Our continuous speech recognition captures your voice in real time, converts it into text, translates it instantly, and reads the translation aloud using natural male or female audio synthesis.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">📷 Camera &amp; Photo Scanner</h3>
              <p>
                Use your camera or upload photo files of restaurant menus, road signs, book pages, or official documents. Optical Character Recognition (OCR) extracts the printed text from the image and translates it immediately into your target language.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Our Mission</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Our mission is to eliminate language barriers in education, travel, business, and daily conversation by providing a lightning-fast, highly accurate, and privacy-focused translation experience accessible on any device.
          </p>
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
