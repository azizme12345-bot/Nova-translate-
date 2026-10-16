import { ApiClient } from './apiClient.ts';

export const translateText = async (
  text: string,
  targetLang: string,
  sourceLang: string = 'Auto'
): Promise<string> => {
  try {
    if (!text.trim()) return '';
    const result = await ApiClient.translateText(text, sourceLang, targetLang, 'natural');
    return result.translatedText || '';
  } catch (error: any) {
    throw new Error(error?.message || 'ترجمہ کرنے میں ناکامی ہوئی۔');
  }
};

export const translateImageText = async (
  base64Image: string,
  targetLang: string
): Promise<string> => {
  try {
    const result = await ApiClient.ocrAndTranslate({
      imageBase64: base64Image,
      targetLanguage: targetLang,
    });
    return result.translatedText || '';
  } catch (error: any) {
    throw new Error('تصویر پڑھنے اور ترجمہ کرنے میں ناکامی ہوئی۔');
  }
};
