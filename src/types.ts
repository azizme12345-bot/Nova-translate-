export interface HistoryItem {
  id: string;
  from: string;
  to: string;
  input: string;
  output: string;
  time: string;
  detectedLang?: string;
  confidence?: number;
  details?: string;
}

export interface SavedItem {
  id: string;
  from: string;
  to: string;
  input: string;
  output: string;
  type?: 'text' | 'voice' | 'image';
  timestamp: string;
  details?: string;
}

export type ActivePage = 'home' | 'camera' | 'history' | 'saved' | 'settings';

export interface AppSettings {
  darkMode: boolean;
  autoDetect: boolean;
  voiceOutput: boolean;
  textSize: 'small' | 'medium' | 'large';
  selectedModel?: string;
}
