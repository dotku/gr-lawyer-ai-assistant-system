'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  FileText,
  Send,
  Loader2,
  Trash2,
  FileAudio,
  File,
  Sparkles,
  X,
  Volume2,
} from 'lucide-react';

interface TranscriptItem {
  id: string;
  type: 'recording' | 'upload' | 'document';
  name: string;
  content: string;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export default function AIChatView() {
  // Transcript state
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // File input refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextString = () => {
    return transcripts
      .map((t) => `[${t.type.toUpperCase()}: ${t.name}]\n${t.content}`)
      .join('\n\n---\n\n');
  };

  // Start recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

        // Transcribe the recording
        await transcribeAudio(audioBlob, `Recording ${new Date().toLocaleTimeString()}`);
      };

      // Audio level monitoring
      const audioContext = new AudioContext();
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
      monitorAudio();

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
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

  // Transcribe audio
  const transcribeAudio = async (audioBlob: Blob, name: string) => {
    setIsProcessing(true);
    setProcessingStatus('Transcribing audio...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();

      const newTranscript: TranscriptItem = {
        id: Date.now().toString(),
        type: 'recording',
        name,
        content: data.transcription,
        createdAt: new Date(),
      };

      setTranscripts((prev) => [...prev, newTranscript]);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle audio file upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus(`Transcribing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();

      const newTranscript: TranscriptItem = {
        id: Date.now().toString(),
        type: 'upload',
        name: file.name,
        content: data.transcription,
        createdAt: new Date(),
      };

      setTranscripts((prev) => [...prev, newTranscript]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to transcribe uploaded audio.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus(`Extracting text from ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch('/api/extract-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Document extraction failed');
      }

      const data = await response.json();

      const newTranscript: TranscriptItem = {
        id: Date.now().toString(),
        type: 'document',
        name: file.name,
        content: data.extractedText,
        createdAt: new Date(),
      };

      setTranscripts((prev) => [...prev, newTranscript]);
    } catch (error) {
      console.error('Document error:', error);
      alert('Failed to extract document content.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  // Delete transcript
  const handleDeleteTranscript = (id: string) => {
    setTranscripts((prev) => prev.filter((t) => t.id !== id));
  };

  // Send chat message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    if (transcripts.length === 0) {
      alert('Please add at least one transcript or document before chatting.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      createdAt: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: getContextString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        createdAt: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      alert('Failed to get response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Generate summary
  const handleGenerateSummary = async () => {
    if (transcripts.length === 0) {
      alert('Please add at least one transcript or document first.');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          context: getContextString(),
          action: 'summarize',
        }),
      });

      if (!response.ok) {
        throw new Error('Summary request failed');
      }

      const data = await response.json();

      const summaryMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Summary of all content:**\n\n${data.summary}`,
        createdAt: new Date(),
      };

      setChatMessages((prev) => [...prev, summaryMessage]);
    } catch (error) {
      console.error('Summary error:', error);
      alert('Failed to generate summary.');
    } finally {
      setIsSending(false);
    }
  };

  const getTypeIcon = (type: TranscriptItem['type']) => {
    switch (type) {
      case 'recording':
        return <Mic className="w-4 h-4" />;
      case 'upload':
        return <FileAudio className="w-4 h-4" />;
      case 'document':
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Panel - Input Sources */}
      <div className="lg:w-1/3 flex flex-col gap-4">
        {/* Recording Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Recording
          </h3>

          <div className="flex flex-col items-center gap-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-6 py-3 text-white bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </button>
            )}

            {isRecording && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Files
          </h3>

          <div className="flex flex-col gap-3">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
            <button
              onClick={() => audioInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4" />
              Upload Audio File
            </button>

            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            <button
              onClick={() => documentInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Upload Document (PDF/Word/Image)
            </button>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {processingStatus}
            </div>
          )}
        </div>

        {/* Transcripts List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Sources ({transcripts.length})
            </span>
            {transcripts.length > 0 && (
              <button
                onClick={handleGenerateSummary}
                disabled={isSending}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Summarize
              </button>
            )}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2">
            {transcripts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No sources yet. Record audio or upload files to get started.
              </p>
            ) : (
              transcripts.map((transcript) => (
                <div
                  key={transcript.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      {getTypeIcon(transcript.type)}
                      <span className="truncate">{transcript.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTranscript(transcript.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {transcript.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Legal Assistant
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chat with AI about your transcripts and documents
          </p>
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Ready to assist</p>
                <p className="text-sm mt-2">
                  Add transcripts or documents, then ask questions about them.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <p>Try asking:</p>
                  <ul className="text-left inline-block space-y-1">
                    <li>&quot;Summarize the key points&quot;</li>
                    <li>&quot;What are the main legal issues?&quot;</li>
                    <li>&quot;What dates were mentioned?&quot;</li>
                    <li>&quot;Who are the parties involved?&quot;</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={
                transcripts.length === 0
                  ? 'Add transcripts or documents first...'
                  : 'Ask about your transcripts and documents...'
              }
              disabled={transcripts.length === 0 || isSending}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || transcripts.length === 0 || isSending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
