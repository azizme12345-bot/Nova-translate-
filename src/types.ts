export interface HistoryItem {
  id: string;
  from: string;
  to: string;
  input: string;
  output: string;
  time: string;
  detectedLang?: string;
}

export type ActivePage = 'home' | 'voice' | 'history' | 'camera' | 'settings';

export interface AppSettings {
  darkMode: boolean;
  autoDetect: boolean;
  voiceOutput: boolean;
  textSize: 'small' | 'medium' | 'large';
}
