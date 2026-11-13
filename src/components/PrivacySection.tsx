import React, { useEffect } from 'react';
import { ActivePage } from '../types.ts';

interface PrivacySectionProps {
  onBack: () => void;
  onNavigate: (page: ActivePage) => void;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Privacy Policy — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Privacy Policy for LAFZ Translation. Learn what text, voice audio, and images are sent to the server, what stays in your browser storage, and how to clear history.'
      );
    }
  }, []);

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6 min-w-0">
      <div className="flex items-center justify-between gap-3">
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
          Privacy Policy
        </span>
      </div>

      <article className="lafz-content-card flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-5">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Privacy Policy
          </h1>
          <p className="text-base text-[#6b7a8f] leading-relaxed">
            This policy explains in plain, honest language how LAFZ Translation handles the text, voice audio, and images you translate, and what information stays inside your own web browser.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            How Text and Images Are Sent to the Server
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            No user account, sign-in, or personal profile is needed to use LAFZ Translation. When you enter written text and request a translation, that text is sent to our server and processed through the connected translation service so the result can be returned to your screen. When you choose Camera OCR, the selected image is sent to the server to extract printed text and translate it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            How Voice Input and Spoken Output Work
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Microphone access starts only when you press Speak and approve permission in your browser. When voice input records audio from your microphone, that audio is sent to the server to convert speech into text before translation. When you press Listen, spoken playback uses your browser and device speech features so you can hear how translated text sounds.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            What Is Stored in Your Browser
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Your recent translation history, saved items, and basic interface preferences are stored locally inside your browser&apos;s localStorage. This browser storage stays strictly inside the current browser on your phone, tablet, or computer and is not synced across different devices or uploaded to build a user profile. Keeping history local helps you revisit recent translations quickly while keeping control on your own device.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Information You Should Not Submit
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Please never type, speak, or upload passwords, bank account numbers, payment card details, government identity documents, private medical records, or other sensitive personal information. Any text, audio, or image submitted for translation travels over the network to the server for processing.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            How to Clear History and Independent Notice
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            You can remove individual translations or clear your entire history at any time using the Clear button on the Home page or History page, or by clearing site storage inside your browser settings. Once cleared, those saved entries are removed from that browser. LAFZ Translation is an independent interface and is not affiliated with Google or any other translation provider.
          </p>
        </section>

        <section className="p-5 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2
              className="text-lg font-bold text-[#0f2a4a]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Questions About Privacy
            </h2>
            <p className="text-base text-[#6b7a8f] leading-relaxed">
              If you have questions about how your inputs or browser storage are handled, visit Contact or read our Terms.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className="px-4 py-2.5 rounded-xl border border-[#e3eaf3] bg-white hover:bg-[#eaf2fc] text-[#1d5fb8] text-sm font-bold cursor-pointer transition"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="lafz-primary-btn text-sm px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Contact
            </button>
          </div>
        </section>
      </article>
    </div>
  );
};
