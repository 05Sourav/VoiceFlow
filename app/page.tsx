'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import useMic from '@/hooks/useMic';
import dynamic from 'next/dynamic';

// Type declarations for Web Speech API
declare global {
  interface Window {
  webkitSpeechRecognition?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  SpeechRecognition?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  webkitAudioContext?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
}

// Browser compatibility check - only run on client
const getBrowserSupport = () => {
  return {
    webSpeechAPI: !!(window.webkitSpeechRecognition || window.SpeechRecognition),
    speechSynthesis: !!window.speechSynthesis,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
  };
};

function HomeComponent() {
  const { start, stop, isRecording } = useMic();
  const audioCtx = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [log, setLog] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({
    webSpeechAPI: false,
    speechSynthesis: false,
    getUserMedia: false,
    audioContext: false,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  
  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [...l.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const checkReady = useCallback(() => {
    setIsReady(true);
    pushLog('All systems ready');
  }, [pushLog]);

  // Check browser support and online status after hydration
  useEffect(() => {
    setIsHydrated(true);
    // Only check browser support on client side
    if (typeof window !== 'undefined') {
      const support = getBrowserSupport();
      setBrowserSupport(support);
      console.log('Browser support:', support);
      pushLog(`Browser support: Web Speech API: ${support.webSpeechAPI}, Speech Synthesis: ${support.speechSynthesis}, Media: ${support.getUserMedia}`);
      
      // Check online status
      setIsOnline(navigator.onLine);
      pushLog(`Online status: ${navigator.onLine ? 'Online' : 'Offline'}`);
      
      // Handle service worker cleanup for development
      if (process.env.NODE_ENV === 'development') {
        // Unregister any existing service workers in development
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
              pushLog('Service worker unregistered (development mode)');
            }
          });
        }
      }
      
      // Listen for online/offline events
      const handleOnline = () => {
        setIsOnline(true);
        pushLog('Connection restored');
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        pushLog('Connection lost');
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [pushLog]);

  // PWA Installation logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleBeforeInstallPrompt = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
      pushLog('PWA installation available');
    };

    const handleAppInstalled = () => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      pushLog('PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [pushLog]);

  const handleInstallPWA = async () => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation rejected');
      }
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const clearServiceWorkerCache = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        
        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        
        pushLog('Service worker cache cleared');
        window.location.reload();
      } catch (error) {
        console.error('Error clearing service worker cache:', error);
        pushLog('Failed to clear service worker cache');
      }
    }
  };



  // Initialize Web Speech API in main thread
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize Web Speech API in main thread (more reliable than in worker)
    if (browserSupport.webSpeechAPI) {
      try {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
                  recognitionRef.current.onresult = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const transcript = event.results[0][0].transcript;
            console.log('Speech recognition result:', transcript);
            setIsListening(false);
            setCurrentTranscript(transcript);
            setLastQuestion(transcript);
            setIsProcessing(true);
            pushLog(`STT result: "${transcript}"`);
            
            // Process with LLM
            const t0 = Date.now();
            const reply = await llm(transcript);
            console.log('LLM reply:', reply);
            setLastAnswer(reply);
            pushLog(`LLM RTT ${Date.now() - t0} ms`);
          
          // Use Web Speech API for TTS
          if (browserSupport.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(reply);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onstart = () => {
              pushLog('TTS started');
              setIsProcessing(false); // Stop processing when TTS starts
              setIsReplying(true); // Start replying state
              setCurrentTranscript(''); // Clear transcript when TTS starts
            };
            
            utterance.onend = () => {
              pushLog('TTS completed');
              setIsReplying(false); // Stop replying when TTS ends
            };
            
            utterance.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              console.error('TTS error:', event);
              pushLog('TTS error occurred');
              setIsProcessing(false);
              setIsReplying(false);
              setCurrentTranscript('');
            };
            
            speechSynthesis.speak(utterance);
          } else {
            pushLog('Speech synthesis not supported - displaying text only');
            alert(`Assistant: ${reply}`);
            setIsProcessing(false);
            setCurrentTranscript('');
          }
        };
        
        recognitionRef.current.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setIsProcessing(false);
          setIsReplying(false);
          setCurrentTranscript('');
          pushLog(`Speech recognition error: ${event.error}`);
        };
        
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };
        
        setIsFallbackMode(false);
        pushLog('Web Speech API initialized in main thread');
        checkReady();
      } catch (error) {
        console.error('Failed to initialize Web Speech API:', error);
        setIsFallbackMode(true);
        pushLog('Web Speech API failed - using fallback mode');
        checkReady();
      }
    } else {
      setIsFallbackMode(true);
      pushLog('Web Speech API not supported - using fallback mode');
      checkReady();
    }
  }, [pushLog, checkReady, browserSupport, isHydrated]);

  // Fallback audio recording function
  const handleAudioRecording = useCallback(async () => {
    try {
      console.log('Starting audio recording...');
      await start();
      pushLog('Audio recording started - speak now!');
      
      // Start countdown timer
      const recordingDuration = 8; // 8 seconds for better audio capture
      
      // Stop recording after the specified duration
      setTimeout(async () => {
        try {
          console.log('Stopping audio recording...');
          const audioData = await stop();
          pushLog('Audio recording stopped');
          console.log('Audio data received, length:', audioData.length);
          
          // For fallback mode, we'll simulate transcription
          // In a real app, you'd send this to a STT service
          setTimeout(() => {
            const simulatedTranscript = "Hello, how can I help you today?";
            setCurrentTranscript(simulatedTranscript);
            setIsProcessing(true);
            pushLog(`Simulated STT result: "${simulatedTranscript}"`);
            
            // Process with LLM
            llm(simulatedTranscript).then(reply => {
              pushLog(`LLM reply: ${reply}`);
              if (browserSupport.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.onstart = () => {
                  setIsProcessing(false); // Stop processing when TTS starts
                  setIsReplying(true); // Start replying state
                  setCurrentTranscript(''); // Clear transcript when TTS starts
                };
                utterance.onend = () => {
                  setIsReplying(false); // Stop replying when TTS ends
                };
                speechSynthesis.speak(utterance);
              } else {
                alert(`Assistant: ${reply}`);
                setIsProcessing(false);
                setCurrentTranscript('');
              }
            });
          }, 1000);
        } catch (stopError) {
          console.error('Failed to stop audio recording:', stopError);
          pushLog('Failed to stop audio recording');
          setIsProcessing(false);
          setIsReplying(false);
          setCurrentTranscript('');
        }
      }, recordingDuration * 1000);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      pushLog('Failed to start audio recording');
      setIsProcessing(false);
      setIsReplying(false);
      setCurrentTranscript('');
    }
  }, [start, stop, pushLog, browserSupport]);

  const handleTalk = async () => {
    console.log('handleTalk called, isReady:', isReady);
    
    if (!isReady) {
      pushLog('System not ready yet');
      return;
    }
    
    if (isListening || isProcessing || isReplying) {
      pushLog('Already listening, processing, or replying');
      return;
    }
    
    console.log('Starting speech recognition...');
    pushLog('Starting speech recognition...');
    
    if (browserSupport.webSpeechAPI && recognitionRef.current && !isFallbackMode) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
        pushLog('Web Speech API started');
      } catch (error) {
        console.error('Failed to start Web Speech API:', error);
        pushLog('Web Speech API failed - using fallback');
        handleAudioRecording();
      }
    } else {
      // Use fallback audio recording
      handleAudioRecording();
    }
  };

  const handleStop = useCallback(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        pushLog('Stopped speech recognition');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [isListening, pushLog]);

  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: '"Spline Sans", sans-serif' }}>
      <div className="mx-auto h-screen max-w-sm overflow-hidden rounded-[40px] bg-gradient-to-br from-[#1b1a2e] via-[#120f26] to-[#0d091e] shadow-2xl">
        <div className="relative flex size-full flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <div className="text-white/80">
              <svg className="feather feather-chevron-left" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </div>
            <div className="text-white/80">
              <svg className="feather feather-settings" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
          </div>

          {/* PWA Installation Prompt */}
          {showInstallPrompt && (
            <div className="mx-4 mb-4 rounded-lg bg-gradient-to-r from-[#6565cc]/20] to-[#bf7aff]/20] border border-white/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6565cc] to-[#bf7aff] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Install Voice Assistant</p>
                    <p className="text-white/60 text-sm">Add to home screen for quick access</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowInstallPrompt(false)}
                    className="px-3 py-1 text-white/60 hover:text-white transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={handleInstallPWA}
                    className="px-4 py-2 bg-gradient-to-r from-[#6565cc] to-[#bf7aff] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Install
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            
            {/* Waveform Animation */}
            <div className="relative flex h-40 w-full items-center justify-center">
              <div className="absolute inset-0 z-0 h-full w-full bg-gradient-to-tr from-[rgba(101,101,204,0.3)] to-[rgba(191,122,255,0.3)] opacity-50 blur-2xl"></div>
              
              {(isListening || isRecording) ? (
                <div className="flex h-24 items-center justify-center space-x-2">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="waveform-bar h-6 w-2 rounded-full bg-gradient-to-b from-[#6565cc] to-[#bf7aff]"
                      style={{
                        animation: `waveform 1.5s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    ></div>
                  ))}
                </div>
              ) : isProcessing ? (
                <div className="flex h-24 items-center justify-center">
                  {/* Processing Animation */}
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-full bg-[#00d4ff] animate-bounce"
                          style={{
                            animationDelay: `${i * 0.2}s`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isReplying ? (
                <div className="flex h-24 items-center justify-center">
                  {/* Replying Animation */}
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="h-4 w-1 rounded-full bg-[#00ff88] animate-pulse"
                          style={{
                            animationDelay: `${i * 0.1}s`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center">
                  {/* Circular Background - Made Bigger */}
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    {/* White Microphone Icon - Made Bigger */}
                    <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Status Text */}
            <h1 className={`mt-8 text-3xl font-bold text-white ${(isListening || isRecording || isProcessing || isReplying) ? 'animate-pulse' : ''}`}>
              {!isReady ? 'Loading...' : 
               isListening || isRecording ? 'Listening...' : 
               isProcessing ? 'Processing...' :
               isReplying ? 'Replying...' :
               'Voice Assistant'}
            </h1>
            <p className="mt-2 text-base text-white/60">
              {!isReady ? 'Initializing...' : 
               isListening || isRecording ? 'I\'m ready to help.' : 
               isProcessing ? 'Analyzing your request...' :
               isReplying ? 'Speaking to you...' :
               'Tap to start speaking'}
            </p>
            
            {/* Offline Indicator */}
            {!isOnline && (
              <div className="mt-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                <p className="text-xs text-red-300">Offline Mode</p>
              </div>
            )}

            {/* Show Transcript when Processing */}
            {isProcessing && currentTranscript && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg max-w-xs">
                <p className="text-sm text-white/80">You said:</p>
                <p className="text-sm text-white font-medium">&quot;{currentTranscript}&quot;</p>
              </div>
            )}
          </div>

          {/* Voice Button */}
          <div className="flex items-center justify-center p-6 pb-12">
            <div className="relative">
              {/* Animated Rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-white/20 animate-ping"
                    style={{
                      width: `${80 + i * 20}px`,
                      height: `${80 + i * 20}px`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '2s',
                      opacity: 0.3 - (i * 0.05)
                    }}
                  ></div>
                ))}
              </div>
              
              {/* Glow Effect - Changed to Bluish Neon */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d4ff] via-[#0099cc] to-[#0066ff] opacity-30 blur-xl animate-pulse"></div>
              
              <button
                onMouseDown={handleTalk}
                onMouseUp={handleStop}
                onTouchStart={handleTalk}
                onTouchEnd={handleStop}
                disabled={!isReady || isProcessing || isReplying}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 ${
                  isListening || isRecording
                    ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.25)]'
                    : isProcessing
                      ? 'bg-gradient-to-br from-gray-500 to-gray-600 shadow-[0_10px_20px_rgba(107,114,128,0.25)] cursor-not-allowed'
                      : isReplying
                        ? 'bg-gradient-to-br from-[#00ff88] to-[#00cc6a] shadow-[0_10px_20px_rgba(0,255,136,0.25)] cursor-not-allowed'
                        : isReady
                          ? 'bg-gradient-to-br from-[#00d4ff] via-[#0099cc] to-[#0066ff] shadow-[0_10px_20px_rgba(0,212,255,0.25)] hover:from-[#00b8e6] hover:via-[#0088b3] hover:to-[#0052cc] active:scale-95'
                          : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                {/* Sparkle Effect - Changed to Bluish */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-[#00d4ff] rounded-full opacity-80 animate-pulse"></div>
                
                {(isListening || isRecording) ? (
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                ) : isProcessing ? (
                  <svg className="h-8 w-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M6.34 6.34l-2.83 2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                ) : isReplying ? (
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                    <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                    <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></line>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Indicator */}
          <div className="absolute bottom-2 left-1/2 w-32 -translate-x-1/2">
            <div className="h-1 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <details className="fixed bottom-4 right-4 w-80 bg-black/80 text-white p-4 rounded-lg">
        <summary className="cursor-pointer font-medium">Debug Log</summary>
        <div className="mt-2 space-y-2">
          {/* Status */}
          <div className="border-b border-white/20 pb-2">
            <div className="text-xs text-purple-300 font-medium">Status:</div>
            <div className="text-xs text-white">
              Online: {isOnline ? '✅' : '❌'} | Ready: {isReady ? '✅' : '❌'}
            </div>
            <div className="text-xs text-white mt-1">
              PWA: {window.matchMedia('(display-mode: standalone)').matches ? '✅' : '❌'}
            </div>
            <button
              onClick={clearServiceWorkerCache}
              className="mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Clear Cache & Reload
            </button>
          </div>
          {/* Last Q&A */}
          {lastQuestion && (
            <div className="border-b border-white/20 pb-2">
              <div className="text-xs text-blue-300 font-medium">Last Question:</div>
                             <div className="text-xs text-white">&quot;{lastQuestion}&quot;</div>
            </div>
          )}
          {lastAnswer && (
            <div className="border-b border-white/20 pb-2">
              <div className="text-xs text-green-300 font-medium">Last Answer:</div>
                             <div className="text-xs text-white">&quot;{lastAnswer}&quot;</div>
            </div>
          )}
          {/* System Log */}
          <div>
            <div className="text-xs text-yellow-300 font-medium mb-1">System Log:</div>
            <pre className="text-xs overflow-y-auto h-24">
              {log.join('\n')}
            </pre>
          </div>
        </div>
      </details>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.4); }
          20% { transform: scaleY(1); }
          40% { transform: scaleY(0.6); }
          60% { transform: scaleY(0.8); }
          80% { transform: scaleY(0.5); }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .waveform-bar {
          animation: waveform 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

async function llm(prompt: string): Promise<string> {
  try {
    // Check if we're online
    if (!navigator.onLine) {
      console.log('Offline mode detected');
      return "I'm sorry, but I'm currently offline. Please check your internet connection and try again.";
    }
    
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_KEY;
    
    // Debug logging without exposing the API key
    console.log('API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      isConfigured: apiKey && apiKey !== 'your_openrouter_api_key_here'
    });
    
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      console.error('OpenRouter API key not configured');
      return "I'm sorry, but the API key is not configured. Please add your OpenRouter API key to the .env.local file.";
    }

    console.log('Making API request with prompt:', prompt);
    
    const requestBody = {
      model: 'google/gemma-3n-e2b-it:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Add timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let res: Response | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(`Attempt ${retryCount + 1} of ${maxRetries + 1}`);
        
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        console.log(`Attempt ${retryCount} failed:`, error);
        
        if (retryCount > maxRetries) {
          clearTimeout(timeoutId);
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Ensure res is defined after the loop
    if (!res) {
      throw new Error('Failed to get response after all retries');
    }

    console.log('API Response status:', res.status);
    console.log('API Response headers:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', res.status, errorText);
      return `API Error: ${res.status} - ${errorText}`;
    }

    const responseText = await res.text();
    console.log('Raw API response:', responseText);
    
    const json = JSON.parse(responseText);
    console.log('Parsed JSON response:', json);
    
    if (!json.choices || !json.choices[0] || !json.choices[0].message) {
      console.error('Unexpected API response structure:', json);
      return "I'm sorry, but I received an unexpected response from the API.";
    }

    const content = json.choices[0].message.content;
    const reasoning = json.choices[0].message.reasoning;
    console.log('Extracted content:', content);
    console.log('Extracted reasoning:', reasoning);
    
    if (!content || content.trim() === '') {
      console.error('Empty content received from API');
      // If there's reasoning, try to extract a simple answer from it
      if (reasoning && reasoning.trim() !== '') {
        // Try to extract a simple answer from the reasoning
        const simpleAnswer = reasoning.split('.')[0] + '.';
        console.log('Using reasoning as fallback:', simpleAnswer);
        return simpleAnswer;
      }
      return "I'm sorry, but I received an empty response from the API.";
    }

    return content;
   } catch (error) {
     console.error('LLM Error:', error);
     return "I'm sorry, but there was an error processing your request.";
   }
 }

// Export with dynamic import to disable SSR
export default dynamic(() => Promise.resolve(HomeComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading Voice Assistant...</div>
    </div>
  ),
});