# LAFZ Translation

LAFZ Translation is a fast, simple web translator for text, voice, and camera/photo OCR across 35 languages.

## Features
- **Text Translation**: Server-side streaming translation via Gemini (`POST /api/translate`).
- **Camera & Photo OCR**: Browser-side image resizing (max 1024px JPEG) and server-side text extraction + translation (`POST /api/image-translate`).
- **Voice Input & Listening**: Browser-native `SpeechRecognition` for microphone input and `speechSynthesis` for audio playback, coordinated one at a time.
- **Local History & Saved Items**: Searchable device history, favorites, copy, paste, share, and language swap.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `GEMINI_API_KEY` in your environment (Vercel Environment Variables or local environment; never expose it in browser code).
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
