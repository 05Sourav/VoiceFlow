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
  const recognitionRef = useRef<any>(null);

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
  const [isListening, setIsListening] = useState(false);

  const pushLog = useCallback((msg: string) => {
    setLog((l) => [...l.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const checkReady = useCallback(() => {
    setIsReady(true);
    pushLog('All systems ready');
  }, [pushLog]);

  // Check browser support after hydration
  useEffect(() => {
    setIsHydrated(true);
    const support = getBrowserSupport();
    setBrowserSupport(support);
    console.log('Browser support:', support);
    pushLog(`Browser support: Web Speech API: ${support.webSpeechAPI}, Speech Synthesis: ${support.speechSynthesis}, Media: ${support.getUserMedia}`);
  }, [pushLog]);

  // Initialize Web Speech API in main thread
  useEffect(() => {
    if (!isHydrated) return;
    
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize Web Speech API in main thread (more reliable than in worker)
    if (browserSupport.webSpeechAPI) {
      try {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Speech recognition result:', transcript);
          setIsListening(false);
          pushLog(`STT result: "${transcript}"`);
          
          // Process with LLM
          const t0 = Date.now();
          const reply = await llm(transcript);
          console.log('LLM reply:', reply);
          pushLog(`LLM RTT ${Date.now() - t0} ms`);
          
          // Use Web Speech API for TTS
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
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
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
          
          // For fallback mode, we'll simulate transcription
          // In a real app, you'd send this to a STT service
          setTimeout(() => {
            const simulatedTranscript = "Hello, how can I help you today?";
            pushLog(`Simulated STT result: "${simulatedTranscript}"`);
            
            // Process with LLM
            llm(simulatedTranscript).then(reply => {
              pushLog(`LLM reply: ${reply}`);
              if (browserSupport.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                speechSynthesis.speak(utterance);
              } else {
                alert(`Assistant: ${reply}`);
              }
            });
          }, 1000);
        } catch (stopError) {
          console.error('Failed to stop audio recording:', stopError);
          pushLog('Failed to stop audio recording');
        }
      }, recordingDuration * 1000);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      pushLog('Failed to start audio recording');
    }
  }, [start, stop, pushLog, browserSupport]);

  const handleTalk = async () => {
    console.log('handleTalk called, isReady:', isReady);
    
    if (!isReady) {
      pushLog('System not ready yet');
      return;
    }
    
    if (isListening) {
      pushLog('Already listening');
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
              isListening || isRecording
                ? 'bg-red-500 text-white animate-pulse' 
                : isReady 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isListening || isRecording ? recordingCountdown > 0 ? `${recordingCountdown}s` : 'Listening...' : isReady ? 'Hold to talk' : 'Loading...'}
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
        model: 'deepseek/deepseek-chat-v3-0324:free',
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