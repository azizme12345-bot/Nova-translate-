/**
 * Offline Translation Engine & Language Pack Manager for Nova Translator
 * Provides instant local translations when offline or disconnected.
 */

import { TranslationResult } from './apiClient.ts';
import { TranslationCache } from './cacheService.ts';

// Popular offline phrases & vocabulary dictionary
export const OFFLINE_DICTIONARY: Record<string, Record<string, string>> = {
  // English to Urdu
  'en_to_ur': {
    'hello': 'سلام / ہیلو',
    'welcome': 'خوش آمدید',
    'how are you': 'آپ کیسے ہیں؟',
    'thank you': 'شکریہ',
    'thanks': 'شکریہ',
    'good morning': 'صبح بخیر',
    'good evening': 'شام بخیر',
    'good night': 'شب بخیر',
    'yes': 'جی ہاں',
    'no': 'جی نہیں',
    'please': 'براہ کرم',
    'sorry': 'معذرت / معاف کیجیے',
    'goodbye': 'خدا حافظ',
    'bye': 'اللہ حافظ',
    'what is your name': 'آپ کا نام کیا ہے؟',
    'my name is': 'میرا نام ... ہے',
    'where is the bathroom': 'باتھ روم کہاں ہے؟',
    'help': 'مدد کریں',
    'i love you': 'میں آپ سے محبت کرتا ہوں',
    'how much is this': 'یہ کتنے کا ہے؟',
    'water': 'پانی',
    'food': 'کھانا',
    'hospital': 'ہسپتال',
    'doctor': 'ڈاکٹر',
  },
  // Urdu to English
  'ur_to_en': {
    'سلام': 'Hello / Peace be upon you',
    'ہیلو': 'Hello',
    'خوش آمدید': 'Welcome',
    'آپ کیسے ہیں': 'How are you?',
    'آپ کیسے ہیں؟': 'How are you?',
    'شکریہ': 'Thank you',
    'صبح بخیر': 'Good morning',
    'شام بخیر': 'Good evening',
    'شب بخیر': 'Good night',
    'جی ہاں': 'Yes',
    'جی نہیں': 'No',
    'براہ کرم': 'Please',
    'معذرت': 'Sorry',
    'خدا حافظ': 'Goodbye',
    'الله حافظ': 'Goodbye',
    'آپ کا نام کیا ہے؟': 'What is your name?',
    'پانی': 'Water',
    'کھانا': 'Food',
    'ہسپتال': 'Hospital',
    'مدد': 'Help',
  },
  // English to Arabic
  'en_to_ar': {
    'hello': 'مرحباً / السلام عليكم',
    'welcome': 'أهلاً وسهلاً',
    'how are you': 'كيف حالك؟',
    'thank you': 'شكراً جزيلاً',
    'good morning': 'صباح الخير',
    'good evening': 'مساء الخير',
    'yes': 'نعم',
    'no': 'لا',
    'please': 'من فضلك',
    'sorry': 'آسف',
    'goodbye': 'مع السلامة',
  },
  // English to Hindi
  'en_to_hi': {
    'hello': 'नमस्ते (Namaste)',
    'welcome': 'स्वागत है',
    'how are you': 'आप कैसे हैं?',
    'thank you': 'धन्यवाद / शुक्रिया',
    'good morning': 'सुप्रभात',
    'yes': 'हाँ',
    'no': 'नहीं',
    'please': 'कृपया',
    'sorry': 'क्षमा करें',
    'goodbye': 'अलविदा',
  },
  // English to Spanish
  'en_to_es': {
    'hello': 'Hola',
    'welcome': 'Bienvenido',
    'how are you': '¿Cómo estás?',
    'thank you': 'Gracias',
    'good morning': 'Buenos días',
    'yes': 'Sí',
    'no': 'No',
    'please': 'Por favor',
    'sorry': 'Lo siento',
    'goodbye': 'Adiós',
  },
};

export class OfflineEngine {
  private static isForceOffline = false;

  static setForceOffline(status: boolean) {
    OfflineEngine.isForceOffline = status;
    try {
      localStorage.setItem('nova_force_offline', status ? '1' : '0');
    } catch {}
  }

  static getForceOffline(): boolean {
    try {
      return localStorage.getItem('nova_force_offline') === '1' || OfflineEngine.isForceOffline;
    } catch {
      return false;
    }
  }

  static isOnline(): boolean {
    if (OfflineEngine.getForceOffline()) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Translates text offline using local phrasebook & cache
   */
  static translateOffline(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): TranslationResult {
    const clean = text.trim();
    const lower = clean.toLowerCase();

    // 1. Check local cache
    const cached = TranslationCache.get(clean, sourceLanguage, targetLanguage);
    if (cached) {
      return {
        ...cached,
        details: '⚡ Instant Offline Translation (From Local Cache)',
        fromCache: true,
      };
    }

    // 2. Derive language codes
    const srcCode = (sourceLanguage || 'English').toLowerCase().slice(0, 2);
    const tgtCode = (targetLanguage || 'Urdu').toLowerCase().slice(0, 2);
    const dictKey = `${srcCode}_to_${tgtCode}`;

    const dict = OFFLINE_DICTIONARY[dictKey];
    let translated = '';

    if (dict && dict[lower]) {
      translated = dict[lower];
    } else if (dict) {
      // Word by word matching
      const words = clean.split(/\s+/);
      const translatedWords = words.map((w) => {
        const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        return dict[cleanW] || w;
      });
      translated = translatedWords.join(' ');
    }

    if (!translated) {
      translated = `[Offline Mode] ${clean}`;
    }

    const isRtl =
      targetLanguage.toLowerCase().includes('urdu') ||
      targetLanguage.toLowerCase().includes('arabic') ||
      targetLanguage.toLowerCase().includes('persian') ||
      targetLanguage.toLowerCase().includes('pashto');

    const result: TranslationResult = {
      originalText: clean,
      translatedText: translated,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0.9,
      direction: isRtl ? 'rtl' : 'ltr',
      details: '⚡ Offline Mode Translation (Offline Language Pack)',
      timestamp: new Date().toISOString(),
      fromCache: true,
    };

    // Save offline lookup into cache
    TranslationCache.set(clean, sourceLanguage, targetLanguage, result);

    return result;
  }
}
