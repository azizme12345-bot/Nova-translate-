import React from 'react';
import { ActivePage } from '../types.ts';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">A</div>
        <span>Nova Translate</span>
      </div>
      <nav className="nav">
        <button
          className={activePage === 'home' ? 'active' : ''}
          onClick={() => onSelectPage('home')}
          type="button"
        >
          <span className="icon">⌂</span>
          Home
        </button>
        <button
          className={activePage === 'history' ? 'active' : ''}
          onClick={() => onSelectPage('history')}
          type="button"
        >
          <span className="icon">◷</span>
          History
        </button>
        <button
          className={activePage === 'camera' ? 'active' : ''}
          onClick={() => onSelectPage('camera')}
          type="button"
        >
          <span className="icon">▣</span>
          Camera
        </button>
        <button
          className={activePage === 'settings' ? 'active' : ''}
          onClick={() => onSelectPage('settings')}
          type="button"
        >
          <span className="icon">⚙</span>
          Settings
        </button>
      </nav>
      <div className="sidebottom">AI Translation · v1.0 Production</div>
    </aside>
  );
};
