import React, { useEffect } from 'react';

interface AboutSectionProps {
  onBack: () => void;
  onNavigate: (page: any) => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onBack }) => {
  useEffect(() => {
    document.title = 'About LAFZ Translation — Simple Language Translation';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Learn about LAFZ Translation: its mission, what keeps the interface simple, who it helps, and how it stays clear on phones and desktops.'
      );
    }
  }, []);

  return (
    <div className="lafz-wrap py-6 sm:py-8 flex flex-col gap-6 min-w-0">
      {/* Back button */}
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
      </div>

      <article className="lafz-content-card flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-[#e3eaf3]">
          <img
            src="/lafz-logo-icon.png"
            alt="LAFZ Translation Logo"
            className="w-16 h-16 rounded-2xl shadow-sm object-contain block shrink-0"
            loading="eager"
          />
          <div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-[#0f2a4a] mb-1"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              About LAFZ Translation
            </h1>
            <p className="text-base text-[#6b7a8f] leading-relaxed">
              Clear, direct language translation for English, Urdu, and everyday global communication without clutter or sign-up walls.
            </p>
          </div>
        </header>

        {/* Our Mission */}
        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Our Mission
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            LAFZ Translation exists to make everyday translation straightforward for people who need quick, readable results. Many translation websites crowd the screen with pop-ups, complicated menus, or mandatory sign-in prompts. Our mission is to provide one clean web workspace where anyone can open the page and translate words, sentences, spoken phrases, or printed text from images right away. LAFZ Translation is an independent interface and is not affiliated with Google or any other translation provider.
          </p>
        </section>

        {/* What Keeps the Tool Simple */}
        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            What Keeps the Tool Simple
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Every core feature lives in an uncluttered workspace. Pick your source and target languages, enter your text, tap Speak for microphone voice input, or open Camera OCR to extract printed text from a photo. Text, recorded voice audio, and chosen images are sent to the server and handled through the connected translation service, while Listen uses browser and device speech features.
          </p>
          <p className="text-base text-[#55657b] leading-relaxed">
            Quick controls let you swap languages, paste from the clipboard, copy results in one tap, or save useful phrases. Recent translation history stays locally inside your browser&apos;s localStorage under your device control and is not synced across other devices, so you can review or clear entries anytime.
          </p>
        </section>

        {/* Who It Is For */}
        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Who LAFZ Translation Is For
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            Students use LAFZ Translation to check vocabulary, reading notes, and homework sentences across English and Urdu. Travellers rely on quick text input and photo scanning to understand street signs, restaurant menus, and everyday directions. Language learners practice reading sentences and listening to pronunciation side by side, while professionals draft clear daily messages across languages without slow setup steps.
          </p>
        </section>

        {/* Clear Design on Phones and Desktops */}
        <section className="flex flex-col gap-2">
          <h2
            className="text-xl font-bold text-[#0f2a4a]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Clear Design on Phones and Desktops
          </h2>
          <p className="text-base text-[#55657b] leading-relaxed">
            The layout adjusts naturally to whatever screen you are using. On mobile phones, controls stack cleanly with comfortable spacing and readable type so dropdown menus, buttons, and paragraphs stay inside the screen without sideways scrolling. On tablets and desktop monitors, source and output boxes appear side by side, with proper right-to-left alignment for scripts including Urdu and Arabic. Every page follows the same clean structure for quick reading.
          </p>
        </section>

        {/* Contact Us Section */}
        <section className="p-5 bg-[#eaf2fc] rounded-2xl border border-[#dbe9fa] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2
              className="text-lg font-bold text-[#0f2a4a]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Have Questions or Feedback?
            </h2>
            <p className="text-base text-[#6b7a8f] mt-0.5 leading-relaxed">
              We welcome suggestions, bug reports, and general questions by email anytime.
            </p>
          </div>
          <a
            href="mailto:azizme12345@gmail.com"
            className="lafz-primary-btn text-sm px-5 py-2.5 rounded-xl no-underline inline-block whitespace-nowrap cursor-pointer"
          >
            Email azizme12345@gmail.com
          </a>
        </section>

        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              onBack();
            }}
            className="lafz-primary-btn text-sm px-6 py-3 cursor-pointer"
          >
            Back to Translator ➔
          </button>
        </div>
      </article>
    </div>
  );
};
