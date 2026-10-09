# Nova AI — All-in-One AI Workspace

Nova AI is a premium, production-ready AI workspace built for advanced chat, code generation, image generation, voice synthesis, and video analysis.

## Features
- **AI Chat & Streaming**: Real-time token streaming responses with Markdown rendering.
- **Code Generator**: Code blocks with instant "Copy" and "Download as file" (.py, .js, .html, .css, .json, etc.).
- **Image Generator**: Inline image generation with prompt enhancement and download support.
- **Voice & Listening**: Natural Text-to-Speech (Male/Female voice selection with preview), Noto Nastaliq Urdu RTL rendering, and fast speech-to-text live transcription.
- **Video Analyzer**: Analyze uploaded video files for insights and frame extraction.
- **Projects & History**: Organize chats into custom projects, search chat history, rename/delete chats, and auto-group by Today, Yesterday, Last 7 days, and Older.
- **Smart Session Resume**: Restores exact scroll, active chat, and draft text when switching back from Recent Apps, while performing a fresh start on the Home page if the app is fully swiped away (tracked via `sessionStorage`).

## Setup & Running
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` (optional for custom keys):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
