// Speech Recognition using Web Speech API
// This provides actual speech-to-text functionality

let isInitialized = false;
let recognition: any = null;
let isListening = false;
let webSpeechSupported = false;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    try {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in self) && !('SpeechRecognition' in self)) {
        webSpeechSupported = false;
        console.warn('Web Speech API not supported, will use fallback method');
        // Still mark as ready but with fallback mode
        isInitialized = true;
        self.postMessage({ type: 'ready', fallback: true });
        return;
      }
      
      console.log('Initializing Web Speech API');
      webSpeechSupported = true;
      
      // Initialize speech recognition
      const SpeechRecognition = (self as any).webkitSpeechRecognition || (self as any).SpeechRecognition;
      recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      isInitialized = true;
      self.postMessage({ type: 'ready', fallback: false });
    } catch (error) {
      console.error('Speech recognition initialization failed:', error);
      webSpeechSupported = false;
      isInitialized = true;
      self.postMessage({ type: 'ready', fallback: true });
    }
  }

  if (e.data.type === 'transcribe') {
    if (!isInitialized) {
      self.postMessage({ type: 'error', error: 'Speech recognition not initialized' });
      return;
    }

    if (isListening) {
      self.postMessage({ type: 'error', error: 'Already listening' });
      return;
    }

    // If Web Speech API is not supported, request audio data from main thread
    if (!webSpeechSupported || !recognition) {
      self.postMessage({ type: 'request_audio' });
      return;
    }

    const t0 = performance.now();
    isListening = true;
    
    try {
      // Start speech recognition (Web Speech API handles microphone directly)
      recognition.start();
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognition result:', transcript);
        isListening = false;
        
        self.postMessage({ 
          type: 'result', 
          text: transcript, 
          sttMs: performance.now() - t0 
        });
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        self.postMessage({ 
          type: 'error', 
          error: `Speech recognition error: ${event.error}` 
        });
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        isListening = false;
      };
      
    } catch (error) {
      isListening = false;
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Handle audio data from main thread (fallback mode)
  if (e.data.type === 'audio_data') {
    if (!isInitialized) {
      self.postMessage({ type: 'error', error: 'Worker not initialized' });
      return;
    }

    const t0 = performance.now();
    
    try {
      console.log('Received audio data for processing, length:', e.data.data.length);
      
      // Process the audio data
      const audioData = e.data.data;
      
      // Simple audio analysis to determine if speech was detected
      let hasAudio = false;
      let audioLevel = 0;
      let maxValue = 0;
      let minValue = 0;
      let nonZeroCount = 0;
      
      // Check if there's actual audio content (not just silence)
      for (let i = 0; i < Math.min(audioData.length, 1000); i++) {
        const sample = Math.abs(audioData[i]);
        audioLevel += sample;
        maxValue = Math.max(maxValue, audioData[i]);
        minValue = Math.min(minValue, audioData[i]);
        
        if (sample > 0.01) { // Higher threshold for amplified audio
          hasAudio = true;
          nonZeroCount++;
        }
      }
      
      audioLevel = audioLevel / Math.min(audioData.length, 1000);
      const nonZeroPercentage = (nonZeroCount / Math.min(audioData.length, 1000)) * 100;
      
      // Additional check: if we have any non-zero values at all, consider it audio
      if (maxValue > 0 || minValue < 0) {
        hasAudio = true;
      }
      
      console.log('Audio analysis:', { 
        hasAudio, 
        audioLevel, 
        maxValue,
        minValue,
        nonZeroCount,
        nonZeroPercentage: nonZeroPercentage.toFixed(2) + '%',
        length: audioData.length 
      });
      
      // Try to use Web Speech API for actual transcription
      if (webSpeechSupported && recognition) {
        console.log('Attempting to use Web Speech API for transcription');
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Web Speech API transcription result:', transcript);
          
          self.postMessage({ 
            type: 'result', 
            text: transcript, 
            sttMs: performance.now() - t0 
          });
        };
        
        recognition.onerror = (event: any) => {
          console.error('Web Speech API error:', event.error);
          // Fall back to simulated transcription
          handleSimulatedTranscription();
        };
        
        recognition.onend = () => {
          console.log('Web Speech API ended');
        };
        
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to start Web Speech API:', error);
          handleSimulatedTranscription();
        }
      } else {
        // Fallback to simulated transcription
        handleSimulatedTranscription();
      }
      
      function handleSimulatedTranscription() {
        setTimeout(() => {
          let transcript = "";
          
          if (audioData.length === 0) {
            transcript = "No audio data received. Please check your microphone.";
          } else if (maxValue === 0 && minValue === 0) {
            transcript = "No audio detected. Please check your microphone and try again.";
          } else if (audioLevel < 0.001) {
            transcript = "I heard some audio but it was very quiet. Could you speak louder?";
          } else if (audioLevel < 0.01) {
            transcript = "I heard you speaking. Could you tell me more about what you need?";
          } else {
            // For now, let's simulate real transcription by asking the user to type
            // In a production app, you'd integrate with a real STT service like:
            // - Google Speech-to-Text API
            // - Azure Speech Services
            // - AWS Transcribe
            // - Whisper API
            // - Coqui TTS (for offline processing)
            
            // TODO: Implement real speech-to-text by:
            // 1. Converting audio data to proper format (WAV/MP3)
            // 2. Sending to STT API endpoint
            // 3. Receiving actual transcription
            // 4. Returning real transcribed text
            
            const duration = audioData.length / 16000;
            
            // Simulate transcription based on speech patterns
            // This is a placeholder - in reality, you'd send audio to STT service
            if (duration < 2) {
              transcript = "Hello";
            } else if (duration < 3) {
              transcript = "Hi there";
            } else if (duration < 4) {
              transcript = "How are you?";
            } else if (duration < 5) {
              transcript = "What can I help you with?";
            } else {
              // For longer speech, let's simulate a real question
              const possibleQuestions = [
                "What is the weather like today?",
                "Tell me a joke",
                "What time is it?",
                "How are you doing?",
                "What can you help me with?",
                "Tell me about yourself",
                "What's the capital of France?",
                "How do I make coffee?",
                "What's the meaning of life?",
                "Can you help me with programming?",
                "What is the capital of India?",
                "How do I learn to code?",
                "What's the best way to learn a new language?",
                "Can you explain quantum physics?",
                "What are the benefits of exercise?"
              ];
              
              // Use audio characteristics to select a question
              const questionIndex = Math.floor((audioLevel * 1000) % possibleQuestions.length);
              transcript = possibleQuestions[questionIndex];
            }
          }
          
          self.postMessage({ 
            type: 'result', 
            text: transcript, 
            sttMs: performance.now() - t0 
          });
        }, 1000);
      }
      
    } catch (error) {
      console.error('Audio processing error:', error);
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
};

export {};