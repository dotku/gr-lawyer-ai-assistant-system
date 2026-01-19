'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
  audioUrl?: string;
  duration?: number;
  language?: string;
}

interface VoiceInputProps {
  onTranscript: (text: string, result?: TranscriptionResult) => void;
  disabled?: boolean;
  className?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  saveAudio?: boolean;
}

export function VoiceInput({
  onTranscript,
  disabled = false,
  className,
  buttonSize = 'icon',
  showLabel = false,
  saveAudio = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(audioBlob);
      };

      // Audio level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const monitorAudio = () => {
        if (!analyserRef.current || !isRecording) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        animationRef.current = requestAnimationFrame(monitorAudio);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start monitoring after state is set
      requestAnimationFrame(monitorAudio);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      // Use the endpoint that saves audio if saveAudio is enabled
      const endpoint = saveAudio ? '/api/transcribe-with-speakers' : '/api/transcribe';

      if (saveAudio) {
        formData.append('save', 'true');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();

      if (data.transcription) {
        const result: TranscriptionResult = {
          text: data.transcription,
          segments: data.segments,
          audioUrl: data.audioUrl,
          duration: data.duration,
          language: data.language,
        };
        onTranscript(data.transcription, result);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (isTranscribing) {
    return (
      <Button
        type="button"
        variant="outline"
        size={buttonSize}
        disabled
        className={cn('relative', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {showLabel && <span className="ml-2">Transcribing...</span>}
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          type="button"
          variant="destructive"
          size={buttonSize}
          onClick={handleClick}
          className="relative"
        >
          <Square className="h-4 w-4" />
          {showLabel && <span className="ml-2">Stop</span>}
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="font-mono">{formatTime(recordingTime)}</span>
        </div>
        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${Math.min(audioLevel, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={buttonSize}
      onClick={handleClick}
      disabled={disabled}
      className={cn('relative', className)}
      title="Record voice"
    >
      <Mic className="h-4 w-4" />
      {showLabel && <span className="ml-2">Record</span>}
    </Button>
  );
}
