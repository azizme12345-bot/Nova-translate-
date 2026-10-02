/**
 * Robust Multilingual Audio Queue & TTS Player
 * Capable of seamlessly speaking long paragraphs, articles, and prompts (500, 1000+ words)
 * in Urdu, English, Arabic, Hindi, Punjabi, and all supported languages.
 */

export interface AudioPlayerCallbacks {
  onStart?: () => void;
  onProgress?: (currentChunk: number, totalChunks: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
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
 * Splits long text (even 1000-5000 words) into clean sentence chunks of <= 180 chars
 * preserving Urdu (۔), Arabic (؟،), English (.,!?\n), Hindi (।), etc.
 */
export function splitTextIntoChunks(text: string, maxChunkLength = 160): string[] {
  if (!text || !text.trim()) return [];
  const clean = text.trim();

  // Split on paragraphs and sentence boundaries first
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

  // Now break any sentence that exceeds maxChunkLength by commas, spaces, or words
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChunkLength) {
      chunks.push(sentence);
    } else {
      // Split on clauses/commas or words
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

class LongTextAudioPlayer {
  private isPlaying = false;
  private currentChunks: string[] = [];
  private currentIndex = 0;
  private currentLang = '';
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private callbacks: AudioPlayerCallbacks = {};
  private chromeResumeInterval: any = null;

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public stop() {
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

    if ('speechSynthesis' in window) {
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
  }

  /**
   * Play any text of arbitrary length (50 words, 500 words, 1000+ words)
   */
  public async play(text: string, langName: string, callbacks: AudioPlayerCallbacks = {}) {
    this.stop();

    const clean = (text || '').trim();
    if (!clean) return;

    this.currentLang = langName;
    this.callbacks = callbacks;
    this.currentChunks = splitTextIntoChunks(clean, 160);

    if (this.currentChunks.length === 0) return;

    this.isPlaying = true;
    this.currentIndex = 0;

    if (this.callbacks.onStart) {
      this.callbacks.onStart();
    }

    // Workaround for Chrome's 15-second speech synthesis timeout bug
    this.chromeResumeInterval = setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 5000);

    await this.playNextChunk();
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

    // Try playing through server TTS proxy first (with preloading of next chunk)
    const ttsUrl = `/api/tts?text=${encodeURIComponent(chunk)}&lang=${encodeURIComponent(this.currentLang)}`;

    try {
      const audio = new Audio(ttsUrl);
      this.currentAudio = audio;

      // Preload next chunk if available
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
        // Fallback to browser SpeechSynthesis for this chunk
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
    if (!('speechSynthesis' in window)) {
      onDone();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = getLanguageSpeechCode(this.currentLang);

      let finished = false;
      const completeOnce = () => {
        if (!finished) {
          finished = true;
          onDone();
        }
      };

      utterance.onend = completeOnce;
      utterance.onerror = completeOnce;

      // Safety timeout in case browser TTS hangs on a chunk
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
