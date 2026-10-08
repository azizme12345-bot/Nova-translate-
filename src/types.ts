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
  pronunciation?: string;
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
  pronunciation?: string;
}

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePreview?: string;
  timestamp: string;
}

export type ActivePage = 'home' | 'translate' | 'chat' | 'vision' | 'image' | 'camera' | 'history' | 'saved' | 'settings';

export interface AppSettings {
  darkMode: boolean;
  autoDetect: boolean;
  voiceOutput: boolean;
  voiceGender: 'female' | 'male';
  textSize: 'small' | 'medium' | 'large';
  selectedModel?: string;
}
