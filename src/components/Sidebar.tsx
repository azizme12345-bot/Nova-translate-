import React from 'react';
import { ActivePage } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { Bookmark, Home, Camera, History, Settings } from 'lucide-react';
import { AppLanguage, t } from '../services/i18n.ts';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  lang: AppLanguage;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  return (
    <aside className="bg-white border-r border-[#e3eaf3] p-4 flex flex-col gap-4">
      <div className="cursor-pointer flex items-center gap-2.5" onClick={() => onSelectPage('home')}>
        <BrandLogo size={40} />
        <span className="font-extrabold text-lg text-[#0f2a4a] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          LAFZ Translator
        </span>
      </div>
      <nav className="flex flex-col gap-1.5">
        <button
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activePage === 'home' ? 'bg-[#eaf2fc] text-[#1d5fb8]' : 'text-[#55657b] hover:bg-[#f1f5fa]'
          }`}
          onClick={() => onSelectPage('home')}
          type="button"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activePage === 'camera' ? 'bg-[#eaf2fc] text-[#1d5fb8]' : 'text-[#55657b] hover:bg-[#f1f5fa]'
          }`}
          onClick={() => onSelectPage('camera')}
          type="button"
        >
          <Camera className="w-4 h-4" />
          <span>Camera</span>
        </button>
        <button
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activePage === 'saved' ? 'bg-[#eaf2fc] text-[#1d5fb8]' : 'text-[#55657b] hover:bg-[#f1f5fa]'
          }`}
          onClick={() => onSelectPage('saved')}
          type="button"
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved</span>
        </button>
        <button
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activePage === 'history' ? 'bg-[#eaf2fc] text-[#1d5fb8]' : 'text-[#55657b] hover:bg-[#f1f5fa]'
          }`}
          onClick={() => onSelectPage('history')}
          type="button"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
        <button
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activePage === 'settings' ? 'bg-[#eaf2fc] text-[#1d5fb8]' : 'text-[#55657b] hover:bg-[#f1f5fa]'
          }`}
          onClick={() => onSelectPage('settings')}
          type="button"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>
      <div className="mt-auto text-xs text-[#6b7a8f] font-medium pt-3 border-t border-[#e3eaf3]">
        LAFZ Translator · Pro
      </div>
    </aside>
  );
};
