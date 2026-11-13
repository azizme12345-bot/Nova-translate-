import React, { useEffect } from 'react';
import { ActivePage } from '../types.ts';

interface ContactSectionProps {
  onBack: () => void;
  onNavigate: (page: ActivePage) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    document.title = 'Contact Us — LAFZ Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Contact LAFZ Translation with questions, feedback, feature suggestions, or bug reports.'
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
          Contact Us
        </span>
      </div>

      <article className="lafz-content-card flex flex-col gap-6">
        <header className="border-b border-[#e3eaf3] pb-5">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Contact LAFZ Translation
          </h1>
          <p className="text-base text-[#6b7a8f] leading-relaxed">
            If you have a question about how LAFZ Translation works, spot an error on the site, or want to share helpful feedback, you can reach us directly by email.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            How to Reach Us
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            The simplest way to reach us is by sending an email with a clear subject line that summarizes your question, feedback, or technical note. We do not use embedded contact forms, pop-up chat widgets, or user accounts on this site, so writing directly to our email address ensures your message arrives cleanly without extra steps.
          </p>
          <div className="p-4 sm:p-5 bg-[#fafcfe] rounded-2xl border border-[#e3eaf3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-base font-semibold text-[#0f2a4a]">
              Email:{' '}
              <a
                href="mailto:azizme12345@gmail.com"
                className="text-[#1d5fb8] font-bold hover:underline break-all"
              >
                azizme12345@gmail.com
              </a>
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            What Kinds of Messages Are Welcome
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            We welcome general feedback about page readability, ideas for practical new features, bug reports when a button or screen fails to work, reports of confusing or broken translation results, and business or partnership questions related to the website. Notes from everyday visitors on both mobile phones and desktop browsers help make the translator steadier, clearer, and easier to use for everyone.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            What to Include in a Bug or Translation-Error Report
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            When reporting a technical bug or an inaccurate translation, sharing clear details helps us investigate much faster. Please include the type of device you are using such as an Android phone, iPhone, or desktop computer, the browser name and version, the exact steps you took before the issue happened, the source and target languages chosen, which tool you opened such as text, voice, or Camera OCR, and what you expected to see compared with the actual result on screen.
          </p>
          <p className="text-base text-[#55657b] leading-relaxed">
            To protect your privacy, never include passwords, financial account details, identification numbers, or private personal messages when emailing sample text or screenshots.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Replies and What to Expect
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            All incoming messages are read as time permits, and replies may take a little while depending on inbox volume and ongoing updates to the site. We cannot promise a specific response window, so including complete details in your first email helps reduce follow-up questions. Please note that LAFZ Translation is an independent interface and is not affiliated with Google or any other translation provider. Before emailing about browser storage or site rules, you may also check our{' '}
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
            and{' '}
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('terms');
              }}
              className="text-[#1d5fb8] font-semibold hover:underline"
            >
              Terms of Use
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
};
