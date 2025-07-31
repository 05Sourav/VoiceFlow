'use client';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import useMic from '@/hooks/useMic';

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
    webkitAudioContext?: any;
  }
}

// Browser compatibility check - moved outside component to prevent recreation
const getBrowserSupport = () => {
  if (typeof window === 'undefined') {
    return {
      webSpeechAPI: false,
      speechSynthesis: false,
      getUserMedia: false,
      audioContext: false,
    };
  }
  
  return {
    webSpeechAPI: !!(window.webkitSpeechRecognition || window.SpeechRecognition),
    speechSynthesis: !!window.speechSynthesis,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
  };
};

export default function Home() {
  const { start, stop, isRecording } = useMic();
  const whisperWorker = useRef<Worker | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

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
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const [textInput, setTextInput] = useState('');

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [...l.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const checkReady = useCallback(() => {
    if (whisperWorker.current) {
      setIsReady(true);
      pushLog('All systems ready');
    }
  }, [pushLog]);

  // Check browser support after hydration
  useEffect(() => {
    setIsHydrated(true);
    const support = getBrowserSupport();
    setBrowserSupport(support);
    console.log('Browser support:', support);
    pushLog(`Browser support: Web Speech API: ${support.webSpeechAPI}, Speech Synthesis: ${support.speechSynthesis}, Media: ${support.getUserMedia}`);
  }, [pushLog]);

  // Separate useEffect for initialization
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration to complete
    
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize Whisper worker
    whisperWorker.current = new Worker(new URL('../workers/whisper.worker', import.meta.url), { type: 'module' });

    whisperWorker.current.postMessage({
      type: 'init',
    });

    whisperWorker.current.onmessage = async (e) => {
      console.log('Whisper worker message:', e.data);
      
      if (e.data.type === 'ready') {
        if (e.data.fallback) {
          setIsFallbackMode(true);
          pushLog('Web Speech API not supported - using fallback mode');
        } else {
          setIsFallbackMode(false);
          pushLog('Web Speech API ready');
        }
        checkReady();
      } else if (e.data.type === 'result') {
        console.log('Whisper result received:', e.data.text);
        pushLog(`STT done in ${e.data.sttMs.toFixed(0)} ms`);
        const t0 = Date.now();
        const reply = await llm(e.data.text);
        console.log('LLM reply:', reply);
        pushLog(`LLM RTT ${Date.now() - t0} ms`);
        
        // Use Web Speech API for real TTS (in main thread)
        if (browserSupport.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          utterance.onstart = () => {
            pushLog('TTS started');
          };
          
          utterance.onend = () => {
            pushLog('TTS completed');
          };
          
          utterance.onerror = (event) => {
            console.error('TTS error:', event);
            pushLog('TTS error occurred');
          };
          
          speechSynthesis.speak(utterance);
        } else {
          pushLog('Speech synthesis not supported - displaying text only');
          // You could show the reply in a text area or alert
          alert(`Assistant: ${reply}`);
        }
      } else if (e.data.type === 'error') {
        console.error('Whisper worker error:', e.data.error);
        pushLog(`Whisper error: ${e.data.error}`);
      } else if (e.data.type === 'request_audio') {
        // Worker is requesting audio data (fallback mode)
        console.log('Worker requesting audio data');
        pushLog('Starting audio recording (fallback mode)');
        
        // Handle audio recording in a separate function to avoid dependency issues
        handleAudioRecording();
      } else {
        console.log('Unknown worker message type:', e.data.type);
      }
    };
  }, [pushLog, checkReady, browserSupport, isHydrated]); // Added isHydrated dependency

  // Separate function to handle audio recording
  const handleAudioRecording = useCallback(async () => {
    try {
      console.log('Starting audio recording...');
      await start();
      pushLog('Audio recording started - speak now!');
      
      // Start countdown timer
      const recordingDuration = 8; // 8 seconds for better audio capture
      setRecordingCountdown(recordingDuration);
      
      const countdownInterval = setInterval(() => {
        setRecordingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Stop recording after the specified duration
      setTimeout(async () => {
        try {
          console.log('Stopping audio recording...');
          const audioData = await stop();
          pushLog('Audio recording stopped');
          console.log('Audio data received, length:', audioData.length);
          
          // Send audio data to worker
          whisperWorker.current!.postMessage({
            type: 'audio_data',
            data: audioData
          });
        } catch (stopError) {
          console.error('Failed to stop audio recording:', stopError);
          pushLog('Failed to stop audio recording');
        }
      }, recordingDuration * 1000);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      pushLog('Failed to start audio recording');
    }
  }, [start, stop, pushLog]);

  const handleTalk = async () => {
    console.log('handleTalk called, isReady:', isReady);
    
    if (!isReady) {
      pushLog('System not ready yet');
      return;
    }
    
    console.log('Starting speech recognition...');
    pushLog('Starting speech recognition...');
    
    // Trigger Web Speech API directly (no need for separate recording)
    whisperWorker.current!.postMessage({ type: 'transcribe' });
  };

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) {
      pushLog('Please enter a question to send.');
      return;
    }

    pushLog(`Sending text: "${textInput}"`);
    const t0 = Date.now();
    const reply = await llm(textInput);
    pushLog(`LLM RTT ${Date.now() - t0} ms`);

    if (browserSupport.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        pushLog('TTS started');
      };

      utterance.onend = () => {
        pushLog('TTS completed');
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event);
        pushLog('TTS error occurred');
      };

      speechSynthesis.speak(utterance);
    } else {
      pushLog('Speech synthesis not supported - displaying text only');
      alert(`Assistant: ${reply}`);
    }
  }, [textInput, browserSupport, pushLog]);

  const handleStop = useCallback(() => {
    // This function is not directly used in the new JSX, but keeping it for potential future use or if handleTalk is updated.
    // For now, it's a placeholder.
    console.log('handleStop called');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Voice Assistant</h1>
          <p className="text-gray-600">Speak or type your question</p>
        </div>

        {/* Text Input Fallback */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Type your question here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                handleTextSubmit();
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Text
          </button>
        </div>

        {/* Voice Button */}
        <div className="text-center">
          <button
            onMouseDown={handleTalk}
            onMouseUp={handleStop}
            onTouchStart={handleTalk}
            onTouchEnd={handleStop}
            disabled={!isReady}
            className={`w-24 h-24 rounded-full text-white font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : isReady 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isRecording ? recordingCountdown > 0 ? `${recordingCountdown}s` : 'Processing...' : isReady ? 'Hold to talk' : 'Loading...'}
          </button>
        </div>

        {/* Debug info - only show after hydration */}
        {isHydrated && (
          <details className="text-xs text-gray-500 mt-2">
            <summary>Browser Support Debug</summary>
            <div className="text-left mt-1">
              <div>Web Speech API: {browserSupport.webSpeechAPI ? '✅' : '❌'}</div>
              <div>Speech Synthesis: {browserSupport.speechSynthesis ? '✅' : '❌'}</div>
              <div>Media Devices: {browserSupport.getUserMedia ? '✅' : '❌'}</div>
              <div>Audio Context: {browserSupport.audioContext ? '✅' : '❌'}</div>
            </div>
          </details>
        )}
      </div>
      
      <details className="w-full">
        <summary className="cursor-pointer font-medium">Latency log</summary>
        <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-y-auto h-48">
          {log.join('\n')}
        </pre>
      </details>
    </div>
  );
}

async function llm(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_KEY;
    
    // Debug logging
    console.log('API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyStart: apiKey?.substring(0, 10) + '...',
      isPlaceholder: apiKey === 'your_openrouter_api_key_here',
      fullKey: apiKey // Temporarily show full key for debugging
    });
    
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      console.error('OpenRouter API key not configured');
      return "I'm sorry, but the API key is not configured. Please add your OpenRouter API key to the .env.local file.";
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-3n-e2b-it:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', res.status, errorText);
      return `API Error: ${res.status} - ${errorText}`;
    }

    const json = await res.json();
    
    if (!json.choices || !json.choices[0] || !json.choices[0].message) {
      console.error('Unexpected API response structure:', json);
      return "I'm sorry, but I received an unexpected response from the API.";
    }

    return json.choices[0].message.content;
  } catch (error) {
    console.error('LLM Error:', error);
    return "I'm sorry, but there was an error processing your request.";
  }
}