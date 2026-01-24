'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, Play, Pause, Trash2, Edit2, Radio, AlertCircle, Globe, Save, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/lib/utils';

export interface ConversationSegment {
  id: string;
  text: string;
  audioUrl?: string;
  timestamp: Date;
  startTime?: number;
  endTime?: number;
}

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

  const browserLangs = navigator.languages || [navigator.language];

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
    if (languageMap[normalizedLang]) {
      return languageMap[normalizedLang];
    }
    const baseLang = normalizedLang.split('-')[0];
    if (languageMap[baseLang]) {
      return languageMap[baseLang];
    }
  }

  return 'en-US';
};

interface ConversationRecorderProps {
  onConversationUpdate: (segments: ConversationSegment[]) => void;
  initialSegments?: ConversationSegment[];
  className?: string;
  saveAudio?: boolean;
  defaultLanguage?: string;
  sessionId?: string;
  sourceName?: string;
}

export function ConversationRecorder({
  onConversationUpdate,
  initialSegments = [],
  className,
  saveAudio = true,
  defaultLanguage = 'el-GR',
  sessionId,
  sourceName = 'Recording',
}: ConversationRecorderProps) {
  const [segments, setSegments] = useState<ConversationSegment[]>(initialSegments);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [language, setLanguage] = useState(defaultLanguage);
  const [detectedLanguage, setDetectedLanguage] = useState(defaultLanguage);
  const [previewTextDuringProcessing, setPreviewTextDuringProcessing] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastRecordingDuration, setLastRecordingDuration] = useState(0);

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const segmentsRef = useRef<ConversationSegment[]>(initialSegments);

  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    setDetectedLanguage(detectBrowserLanguage());
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
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

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

  const getSpeechRecognition = (): SpeechRecognition | null => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    return new SpeechRecognitionAPI();
  };

  const startRecording = async () => {
    setIsConnecting(true);

    try {
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

      // Start recording audio
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      // Start browser speech recognition for live preview
      const recognition = getSpeechRecognition();

      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        const activeLanguage = language === 'auto' ? detectedLanguage : language;
        recognition.lang = activeLanguage;

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

          if (finalTranscript) {
            accumulatedText += (accumulatedText ? ' ' : '') + finalTranscript.trim();
            setLiveText(accumulatedText);
          }

          setInterimText(currentInterim);
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setLiveText('(Microphone access needed for live transcription)');
          }
        };

        recognition.onend = () => {
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
      console.error('Error starting recording:', error);
      setIsConnecting(false);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
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

    // Process audio with Whisper for transcription
    if (audioChunksRef.current.length > 0) {
      setIsTranscribing(true);
      setSaveStatus('saving');

      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('save', saveAudio ? 'true' : 'false');
        if (sessionId) {
          formData.append('session_id', sessionId);
          formData.append('source_name', sourceName);
        }

        const response = await fetch('/api/transcribe-with-speakers', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();

          if (data.segments && data.segments.length > 0) {
            // Use timed segments from Whisper
            const newSegments: ConversationSegment[] = data.segments.map(
              (seg: { id: string; text: string; startTime: number; endTime: number }, index: number) => ({
                id: `segment-${Date.now()}-${index}`,
                text: seg.text,
                audioUrl: data.audioUrl,
                timestamp: new Date(),
                startTime: seg.startTime,
                endTime: seg.endTime,
              })
            );

            updateSegments((prev) => [...prev, ...newSegments]);
            if (data.audioUrl) {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
              setSaveStatus('idle');
            }
          } else if (data.transcription) {
            // Fallback: single segment if no timed segments
            const newSegment: ConversationSegment = {
              id: `segment-${Date.now()}`,
              text: data.transcription,
              audioUrl: data.audioUrl,
              timestamp: new Date(),
            };

            updateSegments((prev) => [...prev, newSegment]);
            if (data.audioUrl) {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
              setSaveStatus('idle');
            }
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
      } finally {
        setIsTranscribing(false);
        setPreviewTextDuringProcessing('');
      }
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* Language Selector */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
          Record and transcribe conversation
        </span>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-gray-900 border rounded-lg">
        {!isRecording && !isTranscribing && !isConnecting && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Mic className="h-4 w-4" />
            <span>Press record to start transcribing</span>
          </div>
        )}

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
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
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
                  className="h-full transition-all duration-100 bg-indigo-500"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Transcription Display */}
      {isRecording && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-4 w-4 text-indigo-600 animate-pulse" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Live Preview</span>
          </div>
          <div className="text-sm min-h-8 whitespace-pre-wrap">
            {!liveText && !interimText ? (
              <span className="text-indigo-400 italic">Listening... Start speaking to see live preview</span>
            ) : (
              <>
                <span className="text-indigo-900 dark:text-indigo-100">{liveText}</span>
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
      {isTranscribing && (
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

          {previewTextDuringProcessing && (
            <div className="p-3 bg-white/50 dark:bg-gray-900/30 rounded border border-amber-200/50 dark:border-amber-700/50">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">
                Captured speech:
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-100 line-clamp-4">
                {previewTextDuringProcessing}
              </p>
            </div>
          )}

          <p className="text-xs text-amber-600 dark:text-amber-400">
            Transcribing audio with OpenAI Whisper...
          </p>
        </div>
      )}

      {/* Transcript Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Transcript ({segments.length} {segments.length === 1 ? 'recording' : 'recordings'})
        </h4>

        {segments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recordings yet. Start recording to capture the conversation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
