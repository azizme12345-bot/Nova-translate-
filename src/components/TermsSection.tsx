import React, { useEffect } from 'react';
import { ActivePage } from '../types.ts';

interface TermsSectionProps {
  onBack: () => void;
  onNavigate: (page: ActivePage) => void;
}

export const TermsSection: React.FC<TermsSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Terms of Use — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Terms of Use for LAFZ Translation covering acceptable use, machine translation limitations, service availability, and content ownership.'
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
          Terms of Use
        </span>
      </div>

      <article className="lafz-content-card flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-5">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Terms of Use
          </h1>
          <p className="text-base text-[#6b7a8f] leading-relaxed">
            By opening and using LAFZ Translation, you agree to follow these simple rules. Please read them carefully before using the text, voice, or camera translation tools.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Acceptable Use
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            You may use LAFZ Translation for everyday personal, educational, travel, and work communication. You must not use this site to process or share illegal content, harass or harm others, send spam, run automated scraping scripts, or attempt to overload, damage, or interfere with the server and its translation service. Please respect these rules so the website stays reliable for all visitors.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Translations Provided As Is Without Guarantees
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            All translations, speech transcripts, and image text extractions are generated automatically by software and are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without any guarantee of accuracy, completeness, or reliability. Automated tools can miss idioms, tone, spelling variations, or regional context.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Check Important Translations Yourself
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Because automated output is not always exact, you are responsible for checking any result before relying on it. Do not depend solely on machine translation for medical instructions, legal agreements, financial paperwork, emergency situations, or official forms. When accuracy matters, ask a qualified human speaker or translator to review the wording.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Service Changes and Interruptions
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            LAFZ Translation is offered as an online utility whose features, supported languages, or server capacity may change over time. The service may be updated, limited, temporarily paused, or interrupted at any point due to maintenance, server load, or technical issues without prior notice to visitors.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Ownership of Design and Content
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            The LAFZ Translation name, logo artwork, page layout, styling, and original site text belong to the site owner and may not be copied or republished as your own service. Text you enter and translations generated for your own use remain yours. LAFZ Translation is an independent interface and is not affiliated with Google or any other translation provider.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Updates to These Terms
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            These Terms of Use may be updated from time to time as the website evolves. Any changes take effect once posted on this page, and continuing to use the site means you accept the updated terms. You can also review our{' '}
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              className="text-[#1d5fb8] font-semibold hover:underline"
            >
              Privacy Policy
            </a>{' '}
            or reach out via{' '}
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('contact');
              }}
              className="text-[#1d5fb8] font-semibold hover:underline"
            >
              Contact
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
};
