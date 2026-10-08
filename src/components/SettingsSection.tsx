import React from 'react';
import { AppSettings } from '../types.ts';

interface SettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
  onToast: (msg: string) => void;
  backendConfigured: boolean;
  onClearHistory?: () => void;
  historyCount?: number;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  onUpdateSettings,
  onOpenPrivacy,
  onOpenAbout,
  onToast,
  backendConfigured,
  onClearHistory,
  historyCount = 0,
}) => {
  const toggleTextSize = (size: 'small' | 'medium' | 'large') => {
    onUpdateSettings({ textSize: size });
    onToast(`Editor font size set to ${size}.`);
  };

  const handleResetData = () => {
    if (onClearHistory) {
      onClearHistory();
      onToast('All translation history and cache cleared.');
    } else {
      localStorage.removeItem('nova_translation_history');
      onToast('Local data reset.');
    }
  };

  return (
    <section className="section active" id="settings">
      <div className="hero">
        <div>
          <div className="eyebrow">APP PREFERENCES & CONFIGURATION</div>
          <h1>Settings</h1>
          <p className="subtitle">Customize your translation, voice, and visual experience.</p>
        </div>
      </div>

      <div className="settings space-y-4 max-w-3xl">
        {/* Appearance Section */}
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-2 mb-1 px-1">
          Appearance & Display
        </div>

        {/* Dark Mode */}
        <div className="setting">
          <div>
            <b>Dark mode</b>
            <small>Switch between light and dark themes.</small>
          </div>
          <button
            className={`switch ${settings.darkMode ? 'on' : ''}`}
            id="darkSwitch"
            onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
            type="button"
            aria-label="Toggle dark mode"
          >
            <i></i>
          </button>
        </div>

        {/* Text Size Selector */}
        <div className="setting flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <b>Editor Font Size</b>
            <small>Choose the text size for the translation workspace.</small>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleTextSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  settings.textSize === size
                    ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Translation & Voice Section */}
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-6 mb-1 px-1">
          Translation & Audio Features
        </div>

        {/* Auto-detect Language */}
        <div className="setting">
          <div>
            <b>Auto-detect language</b>
            <small>Automatically recognize the source language of entered text or speech.</small>
          </div>
          <button
            className={`switch ${settings.autoDetect ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ autoDetect: !settings.autoDetect })}
            type="button"
            aria-label="Toggle auto detect"
          >
            <i></i>
          </button>
        </div>

        {/* Voice Output */}
        <div className="setting">
          <div>
            <b>Auto-read translations aloud</b>
            <small>Automatically play native voice audio when translation completes.</small>
          </div>
          <button
            className={`switch ${settings.voiceOutput ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ voiceOutput: !settings.voiceOutput })}
            type="button"
            aria-label="Toggle voice output"
          >
            <i></i>
          </button>
        </div>

        {/* Data & Storage Section */}
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-6 mb-1 px-1">
          Data & Local Storage
        </div>

        {/* History Storage & Clear */}
        <div className="setting flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <b>Translation History Storage</b>
            <small>Currently storing {historyCount} saved translations locally on this device.</small>
          </div>
          <button
            onClick={handleResetData}
            type="button"
            className="mini text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400 py-1.5 px-3"
          >
            Clear History & Cache
          </button>
        </div>

        {/* Backend & Security Section */}
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-6 mb-1 px-1">
          Security & System
        </div>

        {/* Backend API Connection Status */}
        <div className="setting">
          <div>
            <b>Backend Translation Engine Status</b>
            <small>
              {backendConfigured
                ? 'Centralized backend service connected with active Gemini Multimodal API.'
                : 'Backend service active. API key loaded securely via server environment.'}
            </small>
          </div>
          <span
            className="pill font-semibold"
            style={{
              background: backendConfigured ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface2)',
              color: backendConfigured ? '#059669' : 'var(--muted)',
            }}
          >
            {backendConfigured ? '● Active & Secure' : '● Ready'}
          </span>
        </div>

        {/* Privacy Policy */}
        <div
          className="setting cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={onOpenPrivacy}
        >
          <div>
            <b>Privacy & Zero-Leak Security</b>
            <small>Read how user data and audio are processed securely without client exposure.</small>
          </div>
          <span style={{ fontSize: '18px', color: 'var(--muted)' }}>›</span>
        </div>

        {/* About App */}
        <div
          className="setting cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={onOpenAbout}
        >
          <div>
            <b>About Nova Translator</b>
            <small>Version 1.0 Production Edition · Multilingual Platform</small>
          </div>
          <span style={{ fontSize: '18px', color: 'var(--muted)' }}>›</span>
        </div>
      </div>
    </section>
  );
};
