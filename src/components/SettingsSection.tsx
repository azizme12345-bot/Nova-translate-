import React from 'react';
import { AppSettings } from '../types.ts';

interface SettingsSectionProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
  onToast: (msg: string) => void;
  backendConfigured: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  onUpdateSettings,
  onOpenPrivacy,
  onOpenAbout,
  onToast,
  backendConfigured,
}) => {
  const toggleTextSize = () => {
    const nextSize =
      settings.textSize === 'small' ? 'medium' : settings.textSize === 'medium' ? 'large' : 'small';
    onUpdateSettings({ textSize: nextSize });
    onToast(`Text size set to ${nextSize}`);
  };

  return (
    <section className="section active" id="settings">
      <div className="hero">
        <div>
          <div className="eyebrow">PREFERENCES</div>
          <h1>Settings</h1>
          <p className="subtitle">Control the Nova Translate experience.</p>
        </div>
      </div>

      <div className="settings">
        {/* Dark Mode */}
        <div className="setting">
          <div>
            <b>Dark mode</b>
            <small>Switch between light and dark appearance.</small>
          </div>
          <button
            className={`switch ${settings.darkMode ? 'on' : ''}`}
            id="darkSwitch"
            onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
            type="button"
          >
            <i></i>
          </button>
        </div>

        {/* Auto-detect Language */}
        <div className="setting">
          <div>
            <b>Auto-detect language</b>
            <small>Detect the source language automatically.</small>
          </div>
          <button
            className={`switch ${settings.autoDetect ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ autoDetect: !settings.autoDetect })}
            type="button"
          >
            <i></i>
          </button>
        </div>

        {/* Voice Output */}
        <div className="setting">
          <div>
            <b>Voice output</b>
            <small>Read translated text aloud automatically.</small>
          </div>
          <button
            className={`switch ${settings.voiceOutput ? 'on' : ''}`}
            onClick={() => onUpdateSettings({ voiceOutput: !settings.voiceOutput })}
            type="button"
          >
            <i></i>
          </button>
        </div>

        {/* Text Size */}
        <div className="setting" onClick={toggleTextSize} style={{ cursor: 'pointer' }}>
          <div>
            <b>Text size</b>
            <small>Click to toggle between Small, Medium and Large editor fonts.</small>
          </div>
          <span className="pill" style={{ textTransform: 'capitalize' }}>
            {settings.textSize}
          </span>
        </div>

        {/* Backend API Connection Status */}
        <div className="setting">
          <div>
            <b>Backend Security & API</b>
            <small>
              {backendConfigured
                ? 'Centralized backend service connected with active Gemini API key.'
                : 'Backend service active. GEMINI_API_KEY injected via environment.'}
            </small>
          </div>
          <span
            className="pill"
            style={{
              background: backendConfigured ? 'rgba(24, 185, 138, 0.15)' : 'var(--surface2)',
              color: backendConfigured ? 'var(--primary)' : 'var(--muted)',
            }}
          >
            {backendConfigured ? '● Active' : '● Ready'}
          </span>
        </div>

        {/* Privacy */}
        <div
          className="setting"
          onClick={onOpenPrivacy}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <b>Privacy & Security</b>
            <small>Zero client-side secrets. All translation runs server-side.</small>
          </div>
          <span style={{ fontSize: '18px', color: 'var(--muted)' }}>›</span>
        </div>

        {/* About */}
        <div
          className="setting"
          onClick={onOpenAbout}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <b>About Nova Translate</b>
            <small>AI Translator · Production v1.0</small>
          </div>
          <span style={{ fontSize: '18px', color: 'var(--muted)' }}>›</span>
        </div>
      </div>
    </section>
  );
};
