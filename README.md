# 🗣️ Voice Assistant PWA

A modern Progressive Web App (PWA) that provides real-time voice-based interaction using the Web Speech API for Speech-to-Text (STT) and Text-to-Speech (TTS) processing, with AI-powered responses via OpenRouter API.

## ✨ Features

- **🎤 Real-time Voice Interaction**: Web Speech API for instant speech recognition and synthesis
- **🤖 AI-Powered Responses**: Integration with OpenRouter API using Google Gemma 3N model
- **📱 PWA Support**: Installable as a native app with service worker caching
- **📊 Performance Monitoring**: Real-time latency logging and system status
- **🎨 Modern UI**: Beautiful, responsive design with smooth animations
- **📱 Mobile Optimized**: Touch-friendly interface with haptic feedback

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + TypeScript + React 19
- **PWA**: next-pwa + Service Worker + Web App Manifest
- **Voice Processing**: Web Speech API (STT + TTS)
- **AI**: OpenRouter API (Google Gemma 3N E2B)
- **Styling**: Tailwind CSS 4 + Custom animations
- **Audio**: MediaRecorder API for fallback recording

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (free tier available)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/05Sourav/VoiceFlow.git
   cd voice-pwa
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_OPENROUTER_KEY=your_openrouter_api_key_here" > .env.local
   ```
   
   Get your free API key from [OpenRouter](https://openrouter.ai)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Allow microphone permissions when prompted
   - Click the voice button to start interaction

## 📁 Project Structure

```
voice-pwa/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main voice interface (810 lines)
│   ├── layout.tsx         # App layout with PWA metadata
│   ├── globals.css        # Global styles and animations
│   ├── favicon.ico        # App icon
│   └── offline/           # Offline page
│       └── page.tsx       # Offline fallback UI
├── hooks/                 # Custom React hooks
│   └── useMic.ts         # Microphone management (109 lines)
├── types/                 # TypeScript declarations
│   └── next-pwa.d.ts     # PWA type definitions
├── public/                # Static assets
│   ├── sw.js             # Service worker (auto-generated)
│   ├── manifest.json     # PWA manifest
│   ├── icon.png          # App icons
│   └── workbox-*.js      # Workbox libraries
├── next.config.ts        # Next.js + PWA configuration
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### PWA Settings
- **Service Worker**: Automatic caching with Workbox
- **Manifest**: Complete PWA configuration with icons and metadata
- **Runtime Caching**: Smart caching for API calls, images, and static resources
- **Offline Page**: Custom offline page with retry functionality

### Voice Processing
- **Primary**: Web Speech API for real-time STT/TTS
- **Fallback**: MediaRecorder API for audio recording
- **Audio Quality**: 16kHz sample rate, mono channel
- **Browser Support**: Automatic detection and graceful degradation

### API Configuration
- **Provider**: OpenRouter API
- **Model**: `google/gemma-3n-e2b-it:free`
- **Max Tokens**: 200 for concise responses
- **Temperature**: 0.7 for balanced creativity
- **Timeout**: 15 seconds with retry logic

## 🎯 Key Features

### **Voice Interaction**
- **Real-time STT**: Instant speech-to-text conversion
- **Natural TTS**: High-quality text-to-speech synthesis
- **Visual Feedback**: Animated waveform and status indicators
- **Error Handling**: Graceful fallback for unsupported browsers

### **PWA Capabilities**
- **Installation**: Native app installation prompt
- **App-like Experience**: Full-screen, standalone mode
- **Service Worker**: Caches static assets and API responses

### **Performance Features**
- **Latency Monitoring**: Real-time performance tracking
- **Debug Panel**: Comprehensive system status display
- **Cache Management**: Manual cache clearing functionality
- **Network Detection**: Online/offline status monitoring

## 🚨 Current Implementation Status

✅ **Fully Functional Voice Assistant PWA**:

### **Core Features**
- ✅ **Web Speech API Integration** - Real STT and TTS functionality
- ✅ **OpenRouter API Integration** - AI-powered responses
- ✅ **Complete PWA Implementation** - Installable, native app experience
- ✅ **Modern UI/UX** - Beautiful, responsive design
- ✅ **Performance Monitoring** - Real-time logging and metrics

### **PWA Features**
- ✅ **Web App Manifest** - Complete app metadata and icons
- ✅ **Service Worker** - Caching and background sync
- ✅ **Installation Prompt** - Native app installation
- ✅ **Offline Page** - Graceful offline handling
- ✅ **Runtime Caching** - Smart resource caching strategy

### **Voice Features**
- ✅ **Real-time STT** - Instant speech recognition
- ✅ **Natural TTS** - High-quality speech synthesis
- ✅ **Fallback Recording** - MediaRecorder for unsupported browsers
- ✅ **Visual Feedback** - Animated UI states
- ✅ **Error Handling** - Graceful degradation

## ⚠️ Important Notes

### **Internet Requirement**
- **Web Speech API requires internet connection** for speech recognition
- **OpenRouter API requires internet connection** for AI responses
- **Voice features will not work offline** - only UI and basic PWA features are available offline

### **Browser Compatibility**
- **Chrome/Edge**: Full Web Speech API support
- **Firefox**: Limited Web Speech API support
- **Safari**: Limited Web Speech API support
- **Mobile browsers**: Varies by platform

## 🎮 Usage

### **Basic Interaction**
1. **Start**: Click and hold the voice button
2. **Speak**: Talk clearly into your microphone
3. **Listen**: Wait for AI processing and response
4. **Repeat**: Continue the conversation naturally

### **Advanced Features**
- **Debug Panel**: Toggle debug information (bottom-right)
- **Cache Management**: Clear cache and reload when needed
- **Installation**: Add to home screen for app-like experience

## 🔮 Roadmap

### **Completed** ✅
- [x] Web Speech API integration
- [x] OpenRouter API integration
- [x] Complete PWA implementation
- [x] Modern responsive UI
- [x] Performance monitoring

### **Planned** 🚧
- [ ] Voice activity detection (VAD)
- [ ] Streaming STT for real-time processing
- [ ] Multiple TTS voices and languages
- [ ] Wake word detection
- [ ] Offline conversation history
- [ ] Push notifications
- [ ] Background sync for failed requests
- [ ] Voice commands and shortcuts

## 🛠️ Development

### **Available Scripts**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### **Environment Variables**
```bash
NEXT_PUBLIC_OPENROUTER_KEY=your_api_key_here
```

### **PWA Development**
- Service worker is disabled in development mode
- Use `npm run build && npm run start` for PWA testing
- Clear cache manually for testing updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Maintain PWA compatibility
- Test cross-browser compatibility
- Ensure proper error handling

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) for voice processing
- [OpenRouter](https://openrouter.ai) for AI API access
- [Next.js](https://nextjs.org) for the framework
- [next-pwa](https://github.com/shadowwalker/next-pwa) for PWA support
- [Tailwind CSS](https://tailwindcss.com) for styling

## 📞 Support

For issues and questions:
- Check the debug panel for system status
- Review browser console for error messages
- Ensure microphone permissions are granted
- Verify OpenRouter API key is configured
- **Note**: Voice features require internet connection

---

**Built with ❤️ using modern web technologies**
