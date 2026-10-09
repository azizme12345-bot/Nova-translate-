import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types.ts';
import { ApiClient } from '../services/apiClient.ts';

interface SettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenPrivacy?: () => void;
  onOpenAbout?: () => void;
  onOpenApiKeyModal?: () => void;
  onToast: (msg: string) => void;
  backendConfigured?: boolean;
  onClearHistory?: () => void;
  historyCount?: number;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  onUpdateSettings,
  onOpenApiKeyModal,
  onToast,
}) => {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!ApiClient.getCustomApiKey());
  }, []);

  const setLight = () => {
    onUpdateSettings({ darkMode: false });
    onToast('Light Mode active');
  };

  const setDark = () => {
    onUpdateSettings({ darkMode: true });
    onToast('Deep Space Theme active');
  };

  return (
    <section id="settings" className="screen active">
      <div className="eyebrow">NOVA CONTROL CENTER</div>
      <h1>Settings</h1>
      <p className="sub">Customize your translation experience & Gemini API connection.</p>

      {/* AI Model Section */}
      <div className="section-title">AI MODEL</div>
      <div className="card settings-card">
        <div className="model">
          <div className="model-icon">✦</div>
          <div>
            <strong>Gemini Flash AI</strong>
            <span>Ultra-fast AI translation, live mic speech-to-text, & vision OCR.</span>
          </div>
        </div>
      </div>

      {/* Secure Gemini API Key Section */}
      <div className="section-title">GOOGLE GEMINI API KEY</div>
      <div className="card settings-card">
        <div className="model">
          <div className="model-icon">🔑</div>
          <div>
            <strong>{hasKey ? 'Custom API Key Active 🟢' : 'Default Backend Connection 🟡'}</strong>
            <span>
              {hasKey
                ? 'Your custom Google Gemini API key is active for direct fast translation.'
                : 'Connect your Google AI Studio key for personal high-speed quota.'}
            </span>
          </div>
        </div>
        <button
          className="primary keybtn"
          onClick={onOpenApiKeyModal}
          type="button"
          style={{ marginTop: '12px' }}
        >
          🔑 MANAGE GEMINI API KEY
        </button>
      </div>

      {/* Appearance Section */}
      <div className="section-title">APPEARANCE</div>
      <div className="theme-grid">
        <div
          className={`theme ${!settings.darkMode ? 'border-cyan-400 font-bold' : ''}`}
          onClick={setLight}
        >
          ☀️
          <span>Light Mode</span>
        </div>
        <div
          className={`theme deep ${settings.darkMode ? 'border-cyan-400 font-bold' : ''}`}
          onClick={setDark}
        >
          ☾
          <span>Deep Space</span>
        </div>
      </div>

      {/* Device Preview Section */}
      <div className="section-title">DEVICE PREVIEW</div>
      <div className="card settings-card">
        <div className="setting-row">
          <span>Phone layout</span>
          <b>Bottom navigation</b>
        </div>
        <div className="setting-row">
          <span>Tablet layout</span>
          <b>Left sidebar</b>
        </div>
        <div className="setting-row">
          <span>Responsive</span>
          <b>Yes • 650px+</b>
        </div>
      </div>

      {/* Language Defaults Section */}
      <div className="section-title">LANGUAGE DEFAULTS</div>
      <div className="card settings-card">
        <div className="setting-row">
          <span>Input Language</span>
          <b>English 🇬🇧</b>
        </div>
        <div className="setting-row">
          <span>Output Language</span>
          <b>Urdu 🇵🇰</b>
        </div>
      </div>
    </section>
  );
};
