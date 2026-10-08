/**
 * Robust Multilingual Audio Queue & TTS Player with Male / Female AI Voice Selection
 * Capable of speaking short phrases or long paragraphs (500–1000+ words)
 * in Urdu, English, Arabic, Hindi, Punjabi, and all supported global languages.
 */

import { ApiClient } from './apiClient.ts';

export type VoiceGender = 'female' | 'male';

export interface AudioPlayerCallbacks {
  onStart?: () => void;
  onProgress?: (currentChunk: number, totalChunks: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

const GENDER_STORAGE_KEY = 'novaVoiceGender';

export function getSavedVoiceGender(): VoiceGender {
  try {
    const saved = localStorage.getItem(GENDER_STORAGE_KEY);
    if (saved === 'male' || saved === 'female') return saved;
  } catch {
    // ignore
  }
  return 'female';
}

export function setSavedVoiceGender(gender: VoiceGender): void {
  try {
    localStorage.setItem(GENDER_STORAGE_KEY, gender);
  } catch {
    // ignore
  }
}

export function getLanguageSpeechCode(langName: string): string {
  if (!langName) return 'en-US';
  const lower = langName.toLowerCase();
  if (lower.includes('auto')) return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'ur-PK';
  if (lower.includes('ur') || lower.includes('urdu')) return 'ur-PK';
  if (lower.includes('en') || lower.includes('english')) return 'en-US';
  if (lower.includes('ar') || lower.includes('arabic')) return 'ar-SA';
  if (lower.includes('hi') || lower.includes('hindi')) return 'hi-IN';
  if (lower.includes('pa') || lower.includes('punjabi')) return 'pa-IN';
  if (lower.includes('fr') || lower.includes('french')) return 'fr-FR';
  if (lower.includes('de') || lower.includes('german')) return 'de-DE';
  if (lower.includes('es') || lower.includes('spanish')) return 'es-ES';
  if (lower.includes('tr') || lower.includes('turkish')) return 'tr-TR';
  if (lower.includes('zh') || lower.includes('chinese')) return 'zh-CN';
  if (lower.includes('ja') || lower.includes('japanese')) return 'ja-JP';
  if (lower.includes('ko') || lower.includes('korean')) return 'ko-KR';
  if (lower.includes('ru') || lower.includes('russian')) return 'ru-RU';
  if (lower.includes('fa') || lower.includes('persian')) return 'fa-IR';
  if (lower.includes('it') || lower.includes('italian')) return 'it-IT';
  if (lower.includes('pt') || lower.includes('portuguese')) return 'pt-PT';
  if (lower.includes('bn') || lower.includes('bengali')) return 'bn-BD';
  if (lower.includes('id') || lower.includes('indonesian')) return 'id-ID';
  if (lower.includes('nl') || lower.includes('dutch')) return 'nl-NL';
  if (lower.includes('ps') || lower.includes('pashto')) return 'ps-AF';
  if (lower.includes('sd') || lower.includes('sindhi')) return 'sd-PK';
  return 'en-US';
}

/**
 * Splits long text into clean sentence chunks of <= 160 chars
 * preserving Urdu (۔), Arabic (؟،), English (.,!?\n), Hindi (।), etc.
 */
export function splitTextIntoChunks(text: string, maxChunkLength = 160): string[] {
  if (!text || !text.trim()) return [];
  const clean = text.trim();

  const sentenceRegex = /([۔!؟\?\.\n\r\t]+)/g;
  const rawParts = clean.split(sentenceRegex);

  const sentences: string[] = [];
  let currentSentence = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    if (!part) continue;

    if (part.match(sentenceRegex)) {
      currentSentence += part;
      if (currentSentence.trim()) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
      }
    } else {
      currentSentence += part;
    }
  }
  if (currentSentence.trim()) {
    sentences.push(currentSentence.trim());
  }

  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChunkLength) {
      chunks.push(sentence);
    } else {
      const words = sentence.split(/([\s,،؛]+)/);
      let currentChunk = '';
      for (const word of words) {
        if ((currentChunk + word).length > maxChunkLength) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += word;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Selects the best matching Male or Female browser SpeechSynthesisVoice for a language
 */
function pickBrowserVoice(langCode: string, gender: VoiceGender): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const prefix = langCode.split('-')[0].toLowerCase();
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const pool = langVoices.length > 0 ? langVoices : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

  const maleKeywords = ['male', 'david', 'mark', 'guy', 'daniel', 'george', 'rishi', 'prabhat', 'asad', 'hamza', 'naayf', 'maged', 'puck', 'fenrir', 'alex', 'fred', 'thomas', 'luca', 'jorge'];
  const femaleKeywords = ['female', 'zira', 'aria', 'samantha', 'victoria', 'sara', 'heera', 'swara', 'uzma', 'salma', 'kore', 'zephyr', 'google', 'natural', 'amelie', 'monica', 'paulina'];

  const targetKeywords = gender === 'male' ? maleKeywords : femaleKeywords;

  for (const v of pool) {
    const lowerName = v.name.toLowerCase();
    if (targetKeywords.some((kw) => lowerName.includes(kw))) {
      return v;
    }
  }

  return pool[0] || null;
}

class LongTextAudioPlayer {
  private isPlaying = false;
  private currentChunks: string[] = [];
  private currentIndex = 0;
  private currentLang = '';
  private currentGender: VoiceGender = 'female';
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private callbacks: AudioPlayerCallbacks = {};
  private chromeResumeInterval: any = null;

  constructor() {
    this.setGender = this.setGender.bind(this);
    this.setVoiceGender = this.setVoiceGender.bind(this);
    this.getGender = this.getGender.bind(this);
    this.getVoiceGender = this.getVoiceGender.bind(this);
    this.play = this.play.bind(this);
    this.stop = this.stop.bind(this);
  }

  public getIsPlaying = (): boolean => {
    return this.isPlaying;
  };

  public setGender = (gender: VoiceGender): void => {
    this.currentGender = gender;
    setSavedVoiceGender(gender);
  };

  public getGender = (): VoiceGender => {
    return this.currentGender;
  };

  public stop = (): void => {
    this.isPlaying = false;
    this.currentChunks = [];
    this.currentIndex = 0;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }

    if (this.nextAudio) {
      try {
        this.nextAudio.pause();
        this.nextAudio.src = '';
      } catch {}
      this.nextAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (this.chromeResumeInterval) {
      clearInterval(this.chromeResumeInterval);
      this.chromeResumeInterval = null;
    }

    if (this.callbacks.onEnd) {
      this.callbacks.onEnd();
    }
  };

  public setVoiceGender = (gender: VoiceGender): void => {
    this.setGender(gender);
  };

  public getVoiceGender = (): VoiceGender => {
    return this.getGender();
  };

  /**
   * Play any text of arbitrary length with Male or Female AI voice support
   */
  public async play(
    text: string,
    langName: string,
    callbacks: AudioPlayerCallbacks = {},
    gender?: VoiceGender
  ) {
    this.stop();

    const clean = (text || '').trim();
    if (!clean) return;

    this.currentLang = langName;
    this.currentGender = gender || getSavedVoiceGender();
    this.callbacks = callbacks;

    this.isPlaying = true;
    if (this.callbacks.onStart) {
      this.callbacks.onStart();
    }

    // For short/medium phrases (<= 350 chars), try Gemini 3.8 TTS with Male (Puck) / Female (Kore) voice first if Male is selected or for ultra-natural AI voice
    if (clean.length <= 350 && this.currentGender === 'male') {
      try {
        const synth = await ApiClient.prepareVoiceSynthesis(clean, langName, this.currentGender);
        if (!this.isPlaying) return;
        if (synth && synth.audioBase64 && !synth.fallbackToBrowserTTS) {
          const audio = new Audio(`data:${synth.mimeType || 'audio/wav'};base64,${synth.audioBase64}`);
          this.currentAudio = audio;
          audio.onended = () => {
            if (!this.isPlaying) return;
            this.stop();
          };
          audio.onerror = () => {
            if (!this.isPlaying) return;
            this.startChunkedStream(clean);
          };
          await audio.play();
          return;
        }
      } catch {
        // Fallback to chunked stream below
      }
    }

    if (!this.isPlaying) return;
    await this.startChunkedStream(clean);
  }

  private async startChunkedStream(cleanText: string) {
    this.currentChunks = splitTextIntoChunks(cleanText, 160);
    if (this.currentChunks.length === 0) {
      this.stop();
      return;
    }

    this.currentIndex = 0;

    this.chromeResumeInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 5000);

    await this.playNextChunk();
  }

  private applyGenderAcousticTuning(audio: HTMLAudioElement) {
    try {
      if (this.currentGender === 'male') {
        // Disable pitch preservation so lowering playbackRate slightly deepens voice formant into a natural male baritone
        (audio as any).preservesPitch = false;
        (audio as any).mozPreservesPitch = false;
        (audio as any).webkitPreservesPitch = false;
        audio.playbackRate = 0.88;
      } else {
        (audio as any).preservesPitch = true;
        audio.playbackRate = 1.0;
      }
    } catch {
      // ignore if unsupported
    }
  }

  private async playNextChunk() {
    if (!this.isPlaying) return;

    if (this.currentIndex >= this.currentChunks.length) {
      this.stop();
      return;
    }

    const chunk = this.currentChunks[this.currentIndex];
    const total = this.currentChunks.length;
    const currentIdx = this.currentIndex;

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(currentIdx + 1, total);
    }

    const ttsUrl = `/api/tts?text=${encodeURIComponent(chunk)}&lang=${encodeURIComponent(this.currentLang)}`;

    try {
      const audio = new Audio(ttsUrl);
      this.applyGenderAcousticTuning(audio);
      this.currentAudio = audio;

      if (this.currentIndex + 1 < this.currentChunks.length) {
        const nextChunk = this.currentChunks[this.currentIndex + 1];
        const nextUrl = `/api/tts?text=${encodeURIComponent(nextChunk)}&lang=${encodeURIComponent(this.currentLang)}`;
        this.nextAudio = new Audio(nextUrl);
        this.nextAudio.preload = 'auto';
      }

      audio.onended = () => {
        if (!this.isPlaying) return;
        this.currentIndex++;
        this.playNextChunk();
      };

      audio.onerror = () => {
        if (!this.isPlaying) return;
        this.fallbackBrowserChunk(chunk, () => {
          if (!this.isPlaying) return;
          this.currentIndex++;
          this.playNextChunk();
        });
      };

      await audio.play().catch(() => {
        if (!this.isPlaying) return;
        this.fallbackBrowserChunk(chunk, () => {
          if (!this.isPlaying) return;
          this.currentIndex++;
          this.playNextChunk();
        });
      });
    } catch {
      this.fallbackBrowserChunk(chunk, () => {
        if (!this.isPlaying) return;
        this.currentIndex++;
        this.playNextChunk();
      });
    }
  }

  private fallbackBrowserChunk(chunk: string, onDone: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chunk);
      const langCode = getLanguageSpeechCode(this.currentLang);
      utterance.lang = langCode;

      const matchedVoice = pickBrowserVoice(langCode, this.currentGender);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // Apply distinct pitch & rate tuning for Male vs Female voice
      if (this.currentGender === 'male') {
        utterance.pitch = 0.82;
        utterance.rate = 0.96;
      } else {
        utterance.pitch = 1.08;
        utterance.rate = 1.0;
      }

      let finished = false;
      const completeOnce = () => {
        if (!finished) {
          finished = true;
          onDone();
        }
      };

      utterance.onend = completeOnce;
      utterance.onerror = completeOnce;

      setTimeout(() => {
        if (!finished && this.isPlaying) {
          completeOnce();
        }
      }, 12000);

      window.speechSynthesis.speak(utterance);
    } catch {
      onDone();
    }
  }
}

export const GlobalAudioPlayer = new LongTextAudioPlayer();
