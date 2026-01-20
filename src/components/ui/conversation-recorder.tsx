'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, User, Users, Play, Pause, Trash2, Edit2, Check, X, Wand2, Hand, Radio, AlertCircle, Globe, Save, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface ConversationSegment {
  id: string;
  speaker: string;
  speakerLabel: string;
  text: string;
  audioUrl?: string;
  timestamp: Date;
  startTime?: number;
  endTime?: number;
}

type RecordingMode = 'manual' | 'auto';

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Supported languages for speech recognition
const SPEECH_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect', flag: '🌐' },
  { code: 'el-GR', label: 'Greek', flag: '🇬🇷' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'de-DE', label: 'German', flag: '🇩🇪' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
  { code: 'it-IT', label: 'Italian', flag: '🇮🇹' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
  { code: 'pt-PT', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl-NL', label: 'Dutch', flag: '🇳🇱' },
  { code: 'pl-PL', label: 'Polish', flag: '🇵🇱' },
  { code: 'ru-RU', label: 'Russian', flag: '🇷🇺' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', label: 'Korean', flag: '🇰🇷' },
  { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
];

// Detect browser language and map to supported language code
const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en-US';

  // Get browser languages (ordered by preference)
  const browserLangs = navigator.languages || [navigator.language];

  // Language code mappings (browser code -> our supported code)
  const languageMap: Record<string, string> = {
    'el': 'el-GR', 'el-gr': 'el-GR',
    'en': 'en-US', 'en-us': 'en-US', 'en-gb': 'en-GB', 'en-au': 'en-GB',
    'de': 'de-DE', 'de-de': 'de-DE', 'de-at': 'de-DE', 'de-ch': 'de-DE',
    'fr': 'fr-FR', 'fr-fr': 'fr-FR', 'fr-ca': 'fr-FR', 'fr-be': 'fr-FR',
    'it': 'it-IT', 'it-it': 'it-IT',
    'es': 'es-ES', 'es-es': 'es-ES', 'es-mx': 'es-ES', 'es-ar': 'es-ES',
    'pt': 'pt-PT', 'pt-pt': 'pt-PT', 'pt-br': 'pt-PT',
    'nl': 'nl-NL', 'nl-nl': 'nl-NL', 'nl-be': 'nl-NL',
    'pl': 'pl-PL', 'pl-pl': 'pl-PL',
    'ru': 'ru-RU', 'ru-ru': 'ru-RU',
    'zh': 'zh-CN', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-CN', 'zh-hk': 'zh-CN',
    'ja': 'ja-JP', 'ja-jp': 'ja-JP',
    'ko': 'ko-KR', 'ko-kr': 'ko-KR',
    'ar': 'ar-SA', 'ar-sa': 'ar-SA',
  };

  for (const lang of browserLangs) {
    const normalizedLang = lang.toLowerCase();
    // Try exact match first
    if (languageMap[normalizedLang]) {
      return languageMap[normalizedLang];
    }
    // Try base language (e.g., 'en' from 'en-US')
    const baseLang = normalizedLang.split('-')[0];
    if (languageMap[baseLang]) {
      return languageMap[baseLang];
    }
  }

  return 'en-US'; // Default fallback
};

interface ConversationRecorderProps {
  onConversationUpdate: (segments: ConversationSegment[]) => void;
  initialSegments?: ConversationSegment[];
  speakerALabel?: string;
  speakerBLabel?: string;
  className?: string;
  saveAudio?: boolean;
  defaultMode?: RecordingMode;
  defaultLanguage?: string;
  sessionId?: string;
  sourceName?: string;
}

// Color palette for multiple speakers
const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string; button: string }> = {
  A: {
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    text: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  B: {
    bg: 'bg-green-50/50 dark:bg-green-950/20',
    text: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    border: 'border-green-200 dark:border-green-800',
    button: 'bg-green-600 hover:bg-green-700',
  },
  C: {
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    text: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    border: 'border-purple-200 dark:border-purple-800',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  D: {
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    text: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    border: 'border-orange-200 dark:border-orange-800',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
  E: {
    bg: 'bg-pink-50/50 dark:bg-pink-950/20',
    text: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    border: 'border-pink-200 dark:border-pink-800',
    button: 'bg-pink-600 hover:bg-pink-700',
  },
};

const DEFAULT_COLOR = {
  bg: 'bg-gray-50/50 dark:bg-gray-950/20',
  text: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  border: 'border-gray-200 dark:border-gray-800',
  button: 'bg-gray-600 hover:bg-gray-700',
};

export function ConversationRecorder({
  onConversationUpdate,
  initialSegments = [],
  speakerALabel = 'Person A',
  speakerBLabel = 'Person B',
  className,
  saveAudio = true,
  defaultMode = 'auto',
  defaultLanguage = 'el-GR',
  sessionId,
  sourceName = 'Recording',
}: ConversationRecorderProps) {
  const [segments, setSegments] = useState<ConversationSegment[]>(initialSegments);
  const [mode, setMode] = useState<RecordingMode>(defaultMode);
  const [currentSpeaker, setCurrentSpeaker] = useState<'A' | 'B'>('A');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [currentLiveSpeaker, setCurrentLiveSpeaker] = useState<string>('A');
  const [speechLanguage, setSpeechLanguage] = useState(defaultLanguage);
  const [previewTextDuringProcessing, setPreviewTextDuringProcessing] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastRecordingDuration, setLastRecordingDuration] = useState(0);

  // Speaker labels state
  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({
    A: speakerALabel,
    B: speakerBLabel,
  });
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Real-time transcription refs
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const segmentsRef = useRef<ConversationSegment[]>(initialSegments);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingTextRef = useRef<string>('');
  const recordingStartTimeRef = useRef<number>(0);

  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep segmentsRef in sync
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Helper to update segments and notify parent
  const updateSegments = useCallback((
    newSegmentsOrUpdater: ConversationSegment[] | ((prev: ConversationSegment[]) => ConversationSegment[])
  ) => {
    if (typeof newSegmentsOrUpdater === 'function') {
      setSegments((prev) => {
        const newSegments = newSegmentsOrUpdater(prev);
        onConversationUpdate(newSegments);
        return newSegments;
      });
    } else {
      setSegments(newSegmentsOrUpdater);
      onConversationUpdate(newSegmentsOrUpdater);
    }
  }, [onConversationUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerLabel = useCallback((speaker: string) => {
    return speakerLabels[speaker] || `Speaker ${speaker}`;
  }, [speakerLabels]);

  const getSpeakerColor = (speaker: string) => {
    return SPEAKER_COLORS[speaker] || DEFAULT_COLOR;
  };

  // Check if browser supports SpeechRecognition
  const getSpeechRecognition = (): SpeechRecognition | null => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    return new SpeechRecognitionAPI();
  };

  // Start real-time transcription using browser's SpeechRecognition for immediate feedback
  // Audio is recorded simultaneously for AssemblyAI speaker diarization when stopped
  const startRealtimeRecording = async () => {
    setIsConnecting(true);

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Set up audio level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start recording audio for later speaker diarization
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(1000); // Capture in 1-second chunks
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();

      // Try to start browser speech recognition for immediate text display
      const recognition = getSpeechRecognition();

      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechLanguage; // Use selected language

        // Accumulate all finalized text during recording
        let accumulatedText = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              currentInterim += result[0].transcript;
            }
          }

          // Update finalized text (confirmed speech)
          if (finalTranscript) {
            accumulatedText += (accumulatedText ? ' ' : '') + finalTranscript.trim();
            setLiveText(accumulatedText);
          }

          // Always update interim text (currently being spoken - shown in different style)
          setInterimText(currentInterim);
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          // Don't stop recording on error, just continue without live transcription
          if (event.error === 'not-allowed') {
            setLiveText('(Microphone access needed for live transcription)');
          }
        };

        recognition.onend = () => {
          // Restart recognition if still recording
          if (isRecording && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('Could not restart speech recognition:', e);
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        console.log('SpeechRecognition not supported, will use AssemblyAI only');
        setLiveText('(Live preview not available - recording in progress)');
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start audio level monitoring
      const monitorAudio = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        animationRef.current = requestAnimationFrame(monitorAudio);
      };
      animationRef.current = requestAnimationFrame(monitorAudio);

      setIsConnecting(false);
      setIsRecording(true);
      setRecordingTime(0);
      setLiveText('');

    } catch (error) {
      console.error('Error starting realtime recording:', error);
      setIsConnecting(false);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  // Stop real-time transcription
  const stopRealtimeRecording = async () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    // Stop WebSocket if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop processor if any
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear timer and animation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Store preview text and duration before clearing
    const capturedPreviewText = liveText + (interimText ? ' ' + interimText : '');
    setPreviewTextDuringProcessing(capturedPreviewText);
    setLastRecordingDuration(recordingTime);

    setIsRecording(false);
    setAudioLevel(0);
    setLiveText('');
    setInterimText('');

    // Process audio with AssemblyAI for speaker diarization
    if (audioChunksRef.current.length > 0) {
      setIsTranscribing(true);
      setSaveStatus('saving');

      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('save', saveAudio ? 'true' : 'false');
        formData.append('speakers_expected', '2');
        if (sessionId) {
          formData.append('session_id', sessionId);
          formData.append('source_name', sourceName);
        }

        const response = await fetch('/api/transcribe-diarization', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Transcription response:', {
            segmentsCount: data.segments?.length,
            audioUrl: data.audioUrl,
            transcriptId: data.transcriptId
          });

          if (data.segments && data.segments.length > 0) {
            // Replace temporary segments with properly diarized ones from AssemblyAI
            const diarizedSegments: ConversationSegment[] = data.segments.map((seg: {
              id: string;
              speaker: string;
              text: string;
              startTime: number;
              endTime: number;
              confidence: number;
            }) => ({
              id: seg.id,
              speaker: seg.speaker,
              speakerLabel: getSpeakerLabel(seg.speaker),
              text: seg.text,
              audioUrl: data.audioUrl,
              timestamp: new Date(),
              startTime: seg.startTime,
              endTime: seg.endTime,
            }));

            // Update speaker labels if new speakers detected
            data.speakers?.forEach((speaker: string) => {
              if (!speakerLabels[speaker]) {
                setSpeakerLabels((prev) => ({
                  ...prev,
                  [speaker]: `Speaker ${speaker}`,
                }));
              }
            });

            setSegments(diarizedSegments);
            onConversationUpdate(diarizedSegments);
            // Mark as saved if either audio or transcript was saved
            const wasSaved = data.audioUrl || data.transcriptId;
            if (wasSaved) {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
              setSaveStatus('idle');
            }
          } else if (data.audioUrl || data.transcriptId) {
            // No segments from diarization, but something was saved
            setSegments((prev) => {
              const updated = prev.map((seg) => ({
                ...seg,
                audioUrl: data.audioUrl,
                speakerLabel: getSpeakerLabel(seg.speaker),
              }));
              onConversationUpdate(updated);
              return updated;
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
          } else {
            setSaveStatus('idle');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Transcription failed:', errorData);
          setSaveStatus('error');
        }
      } catch (error) {
        console.error('Failed to process audio:', error);
        setSaveStatus('error');
        // Keep the temporary segments but remove "(pending)" label
        setSegments((prev) => {
          const updated = prev.map((seg) => ({
            ...seg,
            speakerLabel: getSpeakerLabel(seg.speaker),
          }));
          onConversationUpdate(updated);
          return updated;
        });
      } finally {
        setIsTranscribing(false);
        setPreviewTextDuringProcessing('');
      }
    }
  };

  // Manual mode recording
  const startManualRecording = async () => {
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
        await transcribeManual(audioBlob);
      };

      // Audio level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const monitorAudio = () => {
        if (!analyserRef.current) return;
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

      animationRef.current = requestAnimationFrame(monitorAudio);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopManualRecording = () => {
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  // Manual mode transcription (OpenAI Whisper)
  const transcribeManual = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

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
        const newSegment: ConversationSegment = {
          id: `segment-${Date.now()}`,
          speaker: currentSpeaker,
          speakerLabel: getSpeakerLabel(currentSpeaker),
          text: data.transcription,
          audioUrl: data.audioUrl,
          timestamp: new Date(),
        };

        updateSegments((prev) => [...prev, newSegment]);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Unified start/stop functions
  const startRecording = () => {
    if (mode === 'auto') {
      startRealtimeRecording();
    } else {
      startManualRecording();
    }
  };

  const stopRecording = () => {
    if (mode === 'auto') {
      stopRealtimeRecording();
    } else {
      stopManualRecording();
    }
  };

  const handlePlayAudio = (segment: ConversationSegment) => {
    if (!segment.audioUrl) return;

    if (playingId === segment.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(segment.audioUrl);

      if (segment.startTime !== undefined) {
        audioRef.current.currentTime = segment.startTime;
        if (segment.endTime !== undefined) {
          const endTime = segment.endTime;
          audioRef.current.ontimeupdate = () => {
            if (audioRef.current && audioRef.current.currentTime >= endTime) {
              audioRef.current.pause();
              setPlayingId(null);
            }
          };
        }
      }

      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(segment.id);
    }
  };

  const handleDeleteSegment = (id: string) => {
    updateSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const handleEditSegment = (segment: ConversationSegment) => {
    setEditingId(segment.id);
    setEditText(segment.text);
  };

  const handleSaveEdit = (id: string) => {
    updateSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: editText } : s))
    );
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleChangeSpeaker = (id: string) => {
    const availableSpeakers = Object.keys(speakerLabels);
    updateSegments((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const currentIndex = availableSpeakers.indexOf(s.speaker);
          const nextIndex = (currentIndex + 1) % availableSpeakers.length;
          const newSpeaker = availableSpeakers[nextIndex];
          return {
            ...s,
            speaker: newSpeaker,
            speakerLabel: getSpeakerLabel(newSpeaker),
          };
        }
        return s;
      })
    );
  };

  const startEditLabel = (speaker: string) => {
    setEditingLabel(speaker);
    setTempLabel(speakerLabels[speaker] || `Speaker ${speaker}`);
  };

  const saveLabel = () => {
    if (editingLabel) {
      const newLabel = tempLabel || `Speaker ${editingLabel}`;
      setSpeakerLabels((prev) => ({ ...prev, [editingLabel]: newLabel }));
      updateSegments((prev) =>
        prev.map((s) =>
          s.speaker === editingLabel ? { ...s, speakerLabel: newLabel } : s
        )
      );
    }
    setEditingLabel(null);
    setTempLabel('');
  };

  // Get unique speakers from segments
  const uniqueSpeakers = [...new Set(segments.map((s) => s.speaker))].sort();
  const displaySpeakers = uniqueSpeakers.length > 0 ? uniqueSpeakers : ['A', 'B'];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle and Language Selector */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Mode:</span>
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setMode('auto')}
              disabled={isRecording || isTranscribing || isConnecting}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                mode === 'auto'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                (isRecording || isTranscribing || isConnecting) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Wand2 className="h-4 w-4" />
              Auto Detect
            </button>
            <button
              onClick={() => setMode('manual')}
              disabled={isRecording || isTranscribing || isConnecting}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                mode === 'manual'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                (isRecording || isTranscribing || isConnecting) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Hand className="h-4 w-4" />
              Manual
            </button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            disabled={isRecording || isTranscribing || isConnecting}
            className={cn(
              'text-sm border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              (isRecording || isTranscribing || isConnecting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {SPEECH_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save status indicator */}
        {saveStatus !== 'idle' && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
            saveStatus === 'saving' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            saveStatus === 'saved' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            saveStatus === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
            {saveStatus === 'saved' && <><CheckCircle2 className="h-3 w-3" /> Saved</>}
            {saveStatus === 'error' && <><AlertCircle className="h-3 w-3" /> Save failed</>}
          </div>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {mode === 'auto'
            ? 'Live transcription with automatic speaker detection'
            : 'Manually select speaker before recording'}
        </span>
      </div>

      {/* Speaker Labels */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Speakers:</span>
        </div>

        {displaySpeakers.map((speaker) => (
          <div key={speaker} className="flex items-center gap-2">
            {editingLabel === speaker ? (
              <div className="flex items-center gap-1">
                <Input
                  value={tempLabel}
                  onChange={(e) => setTempLabel(e.target.value)}
                  className="h-8 w-32"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveLabel()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveLabel}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingLabel(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => startEditLabel(speaker)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity',
                  getSpeakerColor(speaker).text
                )}
              >
                <User className="h-3 w-3" />
                {speakerLabels[speaker] || `Speaker ${speaker}`}
                <Edit2 className="h-3 w-3 opacity-50" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-gray-900 border rounded-lg">
        {/* Manual mode: Speaker Toggle */}
        {mode === 'manual' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Recording as:</span>
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setCurrentSpeaker('A')}
                disabled={isRecording}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  currentSpeaker === 'A'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {speakerLabels.A}
              </button>
              <button
                onClick={() => setCurrentSpeaker('B')}
                disabled={isRecording}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  currentSpeaker === 'B'
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {speakerLabels.B}
              </button>
            </div>
          </div>
        )}

        {/* Auto mode hint */}
        {mode === 'auto' && !isRecording && !isTranscribing && !isConnecting && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Wand2 className="h-4 w-4" />
            <span>Real-time transcription - see text as you speak</span>
          </div>
        )}

        {/* Record Button */}
        <div className="flex items-center gap-4">
          {isConnecting ? (
            <Button disabled variant="outline" className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </Button>
          ) : isTranscribing ? (
            <Button disabled variant="outline" className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </Button>
          ) : !isRecording ? (
            <Button
              onClick={startRecording}
              variant="default"
              className={cn(
                'gap-2',
                mode === 'auto'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : currentSpeaker === 'A'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
              )}
            >
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </div>
              <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-100',
                    mode === 'auto'
                      ? 'bg-indigo-500'
                      : currentSpeaker === 'A'
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Transcription Display */}
      {mode === 'auto' && isRecording && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Live Preview</span>
            </div>
            <span className="text-xs text-indigo-500 dark:text-indigo-400">
              Speaker ID will be assigned when you stop recording
            </span>
          </div>
          <div className="text-sm min-h-8 whitespace-pre-wrap">
            {!liveText && !interimText ? (
              <span className="text-indigo-400 italic">Listening... Start speaking to see live preview</span>
            ) : (
              <>
                {/* Finalized text - solid color */}
                <span className="text-indigo-900 dark:text-indigo-100">{liveText}</span>
                {/* Interim text - lighter color with typing indicator */}
                {interimText && (
                  <span className="text-indigo-500 dark:text-indigo-400 italic">
                    {liveText ? ' ' : ''}{interimText}
                    <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {mode === 'auto' && isTranscribing && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Processing {formatTime(lastRecordingDuration)} of audio...
              </span>
            </div>
            {saveAudio && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <Save className="h-3 w-3" />
                Saving audio & transcript
              </span>
            )}
          </div>

          {/* Show captured preview during processing */}
          {previewTextDuringProcessing && (
            <div className="p-3 bg-white/50 dark:bg-gray-900/30 rounded border border-amber-200/50 dark:border-amber-700/50">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">
                Captured speech (will be replaced with speaker-labeled version):
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-100 line-clamp-4">
                {previewTextDuringProcessing}
              </p>
            </div>
          )}

          <p className="text-xs text-amber-600 dark:text-amber-400">
            AssemblyAI is analyzing voice patterns to identify Speaker A, Speaker B, etc.
          </p>
        </div>
      )}

      {/* Conversation Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Conversation ({segments.length} segments)
        </h4>

        {segments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recordings yet. Start recording to capture the conversation.</p>
            {mode === 'auto' && (
              <div className="text-xs mt-3 space-y-1">
                <p className="text-indigo-500 font-medium">Auto Detect Mode:</p>
                <p className="text-gray-400">1. See live preview as you speak</p>
                <p className="text-gray-400">2. Stop recording to analyze speakers</p>
                <p className="text-gray-400">3. Segments with Speaker A, B, etc. will appear</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((segment, index) => {
              const colors = getSpeakerColor(segment.speaker);
              return (
                <div
                  key={segment.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    colors.border,
                    colors.bg
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChangeSpeaker(segment.id)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity',
                          colors.text
                        )}
                        title="Click to change speaker"
                      >
                        <User className="h-3 w-3" />
                        {segment.speakerLabel}
                      </button>
                      <span className="text-xs text-gray-400">
                        #{index + 1}
                      </span>
                      {segment.startTime !== undefined && (
                        <span className="text-xs text-gray-400 font-mono">
                          {formatTime(Math.floor(segment.startTime))}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {segment.audioUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handlePlayAudio(segment)}
                        >
                          {playingId === segment.id ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEditSegment(segment)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteSegment(segment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {editingId === segment.id ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(segment.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {segment.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
