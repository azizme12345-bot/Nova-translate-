import React from 'react';

interface FooterProps {
  onNavigate: (page: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-auto text-xs text-gray-600">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <img
            src="/app-logo.jpg"
            alt="Nova Translator Logo"
            width={24}
            height={24}
            className="w-6 h-6 rounded-md object-cover border border-emerald-600/20 shrink-0"
          />
          <span>Nova Translator</span>
        </div>
        
        <nav className="flex flex-wrap items-center justify-center gap-4 text-gray-600 font-medium">
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/'); onNavigate('translate'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            Home
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/text-translation'); onNavigate('text-translation'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            Text Translation
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/voice-translation'); onNavigate('voice-translation'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            Voice Translation
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/camera-translation'); onNavigate('image'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            Camera OCR
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/languages'); onNavigate('languages'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            Languages
          </button>
          <button 
            type="button" 
            onClick={() => { window.history.pushState({}, '', '/about'); onNavigate('about'); }}
            className="hover:text-[#2e7d32] transition cursor-pointer"
          >
            About Us
          </button>
        </nav>

        <div className="text-gray-400 text-center sm:text-right">
          &copy; 2026 Nova Translator. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
