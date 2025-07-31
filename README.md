# 🗣️ Voice Assistant PWA

An offline-capable Progressive Web App (PWA) that provides real-time voice-based interaction using local Speech-to-Text (STT) and Text-to-Speech (TTS) processing.

## ✨ Features

- **Offline-First Architecture**: Works offline except for LLM API calls
- **Local STT**: Whisper.cpp compiled to WebAssembly for browser-based speech recognition
- **Local TTS**: Coqui TTS compiled to WebAssembly for browser-based speech synthesis
- **PWA Support**: Installable as a native app with service worker caching
- **Real-time Processing**: Web Workers for non-blocking audio processing
- **Latency Logging**: Comprehensive performance monitoring and benchmarking

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + TypeScript + React 19
- **PWA**: next-pwa + Service Worker
- **STT**: Whisper.cpp (WASM) in Web Worker
- **TTS**: Coqui TTS (WASM) in Web Worker
- **LLM**: OpenRouter API (Google Gemma 3N)
- **Styling**: Tailwind CSS 4

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd voice-pwa
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_OPENROUTER_KEY=your_openrouter_api_key_here" > .env.local
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Allow microphone permissions
   - Click "Hold to talk" to start voice interaction

## 📁 Project Structure

```
voice-pwa/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main voice interface
│   ├── layout.tsx         # App layout
│   └── globals.css        # Global styles
├── hooks/                 # Custom React hooks
│   └── useMic.ts         # Microphone management
├── workers/               # Web Workers
│   └── whisper.worker.ts  # STT processing
├── public/                # Static assets
│   ├── models/           # WASM models
│   └── manifest.json     # PWA manifest
├── types/                # TypeScript declarations
└── next.config.ts        # Next.js + PWA config
```

## 🔧 Configuration

### PWA Settings
- **Service Worker**: Caches essential files for offline use
- **Manifest**: Configures app installation and appearance
- **Runtime Caching**: Caches WASM models and API responses

### Audio Processing
- **Sample Rate**: 16kHz for optimal Whisper performance
- **Channels**: Mono (single channel)
- **Format**: PCM Float32Array for WASM compatibility

### API Configuration
- **Model**: `google/gemma-3n-e2b-it:free` (OpenRouter)
- **Max Tokens**: 150 for concise responses
- **Temperature**: Default for consistent output

## 🚨 Current Status

✅ **Functional Implementation**: This project now uses:
- **Web Speech API** for real Speech-to-Text (STT) functionality
- **Web Speech API** for real Text-to-Speech (TTS) functionality  
- **OpenRouter API** for LLM responses
- **PWA features** for offline caching and installation

The app is fully functional and ready for use!

## 🔮 Roadmap

- [x] Integrate Web Speech API for STT
- [x] Integrate Web Speech API for TTS
- [x] Implement PWA functionality
- [x] Add real-time voice interaction
- [ ] Add voice activity detection
- [ ] Implement streaming STT
- [ ] Add multiple TTS voices
- [ ] Optimize model loading and caching
- [ ] Add offline conversation history
- [ ] Implement wake word detection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for STT
- [Coqui TTS](https://github.com/coqui-ai/TTS) for TTS
- [OpenRouter](https://openrouter.ai) for LLM API
- [Next.js](https://nextjs.org) for the framework
