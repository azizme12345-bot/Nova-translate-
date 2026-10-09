import React, { useState, useEffect } from 'react';
import { ApiClient } from '../services/apiClient.ts';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onToast }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid?: boolean; message?: string } | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = ApiClient.getCustomApiKey();
      setApiKeyInput(saved);
      setHasSavedKey(!!saved);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      ApiClient.clearCustomApiKey();
      setHasSavedKey(false);
      setTestResult({ valid: false, message: 'API key cleared. System will use default backend key.' });
      onToast('API Key cleared');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await ApiClient.testApiKey(cleanKey);
      if (res.valid) {
        ApiClient.setCustomApiKey(cleanKey);
        setHasSavedKey(true);
        setTestResult({ valid: true, message: res.message || 'Key connected successfully! Gemini API active.' });
        onToast('Google Gemini API Key Saved! 🟢');
      } else {
        setTestResult({ valid: false, message: res.message || 'Key test failed. Please check your Google AI Studio key.' });
      }
    } catch (err: any) {
      setTestResult({ valid: false, message: err.message || 'Key validation error.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearKey = () => {
    ApiClient.clearCustomApiKey();
    setApiKeyInput('');
    setHasSavedKey(false);
    setTestResult({ valid: true, message: 'Google Gemini API key removed.' });
    onToast('API key removed');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔑</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Google Gemini API Key</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5', margin: '0 0 16px' }}>
          Enter your personal <strong>Google Gemini API Key</strong> (from Google AI Studio) to unlock unlimited direct translations, voice transcription, photo analysis, and live call features.
        </p>

        {/* API Key Input Field */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--fg)', marginBottom: '6px' }}>
            GEMINI API KEY
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--fg)',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        {/* Status Message */}
        {testResult && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 600,
              background: testResult.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: testResult.valid ? '#10b981' : '#ef4444',
              border: `1px solid ${testResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            {testResult.valid ? '✓ ' : '✕ '} {testResult.message}
          </div>
        )}

        {hasSavedKey && !testResult && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🟢</span> Saved API Key active on this device.
          </div>
        )}

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {hasSavedKey && (
            <button
              onClick={handleClearKey}
              type="button"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'transparent',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Remove Key
            </button>
          )}

          <button
            onClick={handleTestAndSave}
            disabled={isTesting}
            type="button"
            className="primary"
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            {isTesting ? 'Testing Key…' : 'Save & Verify Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
