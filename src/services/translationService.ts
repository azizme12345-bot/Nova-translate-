import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const translateText = async (
  text: string,
  targetLang: string,
  sourceLang: string = 'Auto'
): Promise<string> => {
  try {
    if (!text.trim()) return '';
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text with no preamble or explanations.\n\nText:\n${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('Translation Error:', error);
    throw new Error(error?.message || 'ترجمہ کرنے میں ناکامی ہوئی۔');
  }
};

export const translateImageText = async (
  base64Image: string,
  targetLang: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg',
      },
    };
    const prompt = `Extract all visible text from this image and translate it to ${targetLang}. Return ONLY the translated text.`;
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('OCR Error:', error);
    throw new Error('تصویر پڑھنے اور ترجمہ کرنے میں ناکامی ہوئی۔');
  }
};
