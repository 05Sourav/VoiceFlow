import { useEffect, useRef, useState } from 'react';

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitAudioContext?: any;
  }
}

export default function useMic() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const start = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    
    // Try to use WAV format for better compatibility with Whisper
    const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
      ? 'audio/wav' 
      : 'audio/webm;codecs=opus';
    
    const mr = new MediaRecorder(s, { mimeType });
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.start(250); // 250 ms chunks
    recorderRef.current = mr;
    setStream(s);
    
    // Initialize AudioContext for potential conversion
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
  };

  const stop = () =>
    new Promise<Float32Array>((res) => {
      recorderRef.current!.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: recorderRef.current!.mimeType });
          console.log('Audio blob created:', { size: blob.size, type: blob.type });
          
          // Convert to PCM Float32Array for Whisper
          const arrayBuffer = await blob.arrayBuffer();
          console.log('Array buffer created:', { size: arrayBuffer.byteLength });
          
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          console.log('Audio buffer decoded:', { 
            duration: audioBuffer.duration, 
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            length: audioBuffer.length
          });
          
          // Extract mono channel and convert to Float32Array
          const channelData = audioBuffer.getChannelData(0);
          const pcmData = new Float32Array(channelData);
          
          // Amplify the audio signal to make it more detectable
          const amplificationFactor = 100000; // Boost by 100,000x (increased from 1000x)
          const amplifiedData = new Float32Array(pcmData.length);
          
          for (let i = 0; i < pcmData.length; i++) {
            amplifiedData[i] = pcmData[i] * amplificationFactor;
            // Clamp to prevent distortion
            if (amplifiedData[i] > 1.0) amplifiedData[i] = 1.0;
            if (amplifiedData[i] < -1.0) amplifiedData[i] = -1.0;
          }
          
          // Debug: Check if we have actual audio data
          let maxValue = 0;
          let minValue = 0;
          let sum = 0;
          for (let i = 0; i < Math.min(amplifiedData.length, 1000); i++) {
            const val = amplifiedData[i];
            maxValue = Math.max(maxValue, val);
            minValue = Math.min(minValue, val);
            sum += Math.abs(val);
          }
          const avgValue = sum / Math.min(amplifiedData.length, 1000);
          console.log('Audio data analysis:', { 
            length: amplifiedData.length, 
            maxValue, 
            minValue, 
            avgValue,
            hasData: amplifiedData.length > 0 && avgValue > 0,
            amplificationFactor
          });
          
          stream?.getTracks().forEach((t) => t.stop());
          chunksRef.current = [];
          
          res(amplifiedData);
        } catch (error) {
          console.error('Error processing audio:', error);
          // Return empty array if processing fails
          res(new Float32Array());
        }
      };
      recorderRef.current!.stop();
    });

  return { start, stop, isRecording: !!stream };
}