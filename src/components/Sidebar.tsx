import React from 'react';
import { ActivePage } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { Bookmark, Home, Camera, History, Settings } from 'lucide-react';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  return (
    <aside className="sidebar">
      <div className="brand cursor-pointer" onClick={() => onSelectPage('home')}>
        <BrandLogo size={42} />
        <span className="font-extrabold text-lg text-white tracking-tight">Nova Translator</span>
      </div>
      <nav className="nav">
        <button
          className={activePage === 'home' ? 'active' : ''}
          onClick={() => onSelectPage('home')}
          type="button"
        >
          <Home className="w-4 h-4 icon" />
          <span>Home</span>
        </button>
        <button
          className={activePage === 'camera' ? 'active' : ''}
          onClick={() => onSelectPage('camera')}
          type="button"
        >
          <Camera className="w-4 h-4 icon" />
          <span>Camera</span>
        </button>
        <button
          className={activePage === 'saved' ? 'active' : ''}
          onClick={() => onSelectPage('saved')}
          type="button"
        >
          <Bookmark className="w-4 h-4 icon" />
          <span>Saved</span>
        </button>
        <button
          className={activePage === 'history' ? 'active' : ''}
          onClick={() => onSelectPage('history')}
          type="button"
        >
          <History className="w-4 h-4 icon" />
          <span>History</span>
        </button>
        <button
          className={activePage === 'settings' ? 'active' : ''}
          onClick={() => onSelectPage('settings')}
          type="button"
        >
          <Settings className="w-4 h-4 icon" />
          <span>Settings</span>
        </button>
      </nav>
      <div className="sidebottom">Nova Translator · Pro</div>
    </aside>
  );
};
