'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

type Case = {
  id: number;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  client: string;
  description: string;
  nextAction: string;
  dueDate: string;
};

const STORAGE_KEYS = {
  CASES: 'demo_cases',
  DOCUMENTS: 'demo_documents',
  RECORDINGS: 'demo_recordings',
};

const DEFAULT_CASES: Case[] = [
  {
    id: 1,
    caseNumber: 'CASE-2025-001',
    title: 'Smith vs. ABC Corporation',
    status: 'In Progress',
    priority: 'High',
    client: 'John Smith',
    description: 'Employment discrimination case involving wrongful termination.',
    nextAction: 'Prepare discovery documents',
    dueDate: '2025-01-15',
  },
  {
    id: 2,
    caseNumber: 'CASE-2025-002',
    title: 'Estate of Johnson',
    status: 'Open',
    priority: 'Medium',
    client: 'Mary Johnson',
    description: 'Estate planning and will preparation.',
    nextAction: 'Schedule client meeting',
    dueDate: '2025-01-20',
  },
  {
    id: 3,
    caseNumber: 'CASE-2024-089',
    title: 'Tech Startup LLC Formation',
    status: 'Closed',
    priority: 'Low',
    client: 'Innovation Labs Inc.',
    description: 'Business formation and contract review.',
    nextAction: 'N/A',
    dueDate: 'Completed',
  },
];

export default function DemoPage() {
  const locale = useLocale();
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cases' | 'documents' | 'ai' | 'interview'>('cases');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [transcription, setTranscription] = useState<Array<{speaker: string, text: string, timestamp: string}>>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<'lawyer' | 'client' | null>(null);
  const [savedRecordings, setSavedRecordings] = useState<Array<{id: string, name: string, data: string, date: string}>>([]);

  // Demo user
  const demoUser = {
    name: 'Demo User',
    role: 'Lawyer',
  };

  const [demoDocuments, setDemoDocuments] = useState([
    { id: 1, name: 'Employment Contract.pdf', type: 'Contract', size: '245 KB', date: '2024-12-15' },
    { id: 2, name: 'Complaint Filing.docx', type: 'Pleading', size: '128 KB', date: '2024-12-20' },
    { id: 3, name: 'Evidence Photos.zip', type: 'Evidence', size: '2.4 MB', date: '2025-01-03' },
  ]);

  // Load data from localStorage on mount
  useEffect(() => {
    console.log('Loading data from localStorage...');

    const loadedCases = localStorage.getItem(STORAGE_KEYS.CASES);
    const loadedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const loadedRecordings = localStorage.getItem(STORAGE_KEYS.RECORDINGS);

    if (loadedCases) {
      const parsedCases = JSON.parse(loadedCases);
      console.log('Loaded cases from localStorage:', parsedCases.length);
      setCases(parsedCases);
    } else {
      console.log('No saved cases, using defaults');
      setCases(DEFAULT_CASES);
    }

    if (loadedDocs) {
      const parsedDocs = JSON.parse(loadedDocs);
      console.log('Loaded documents from localStorage:', parsedDocs.length);
      setDemoDocuments(parsedDocs);
    } else {
      console.log('No saved documents');
    }

    if (loadedRecordings) {
      const parsedRecordings = JSON.parse(loadedRecordings);
      console.log('Loaded recordings from localStorage:', parsedRecordings.length);
      setSavedRecordings(parsedRecordings);
    } else {
      console.log('No saved recordings');
    }
  }, []);

  // Save cases to localStorage whenever they change
  useEffect(() => {
    if (cases.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
    }
  }, [cases]);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    if (demoDocuments.length > 0) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(demoDocuments));
    }
  }, [demoDocuments]);

  // Save recordings to localStorage whenever they change (backup to setState save)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(savedRecordings));
      console.log('useEffect: Synced recordings to localStorage, count:', savedRecordings.length);
    } catch (error) {
      console.error('useEffect: Failed to save recordings to localStorage:', error);
    }
  }, [savedRecordings]);

  const aiConversation = [
    {
      role: 'user',
      message: 'Can you help me draft a motion to dismiss based on lack of jurisdiction?',
    },
    {
      role: 'assistant',
      message: 'I can help you draft a motion to dismiss. Based on your case details, here are the key elements to include:\n\n1. Caption and case information\n2. Statement of facts\n3. Legal argument for lack of jurisdiction\n4. Supporting case law\n5. Request for relief\n\nWould you like me to generate a template based on your specific case details?',
    },
  ];

  const handleCreateCase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newCase: Case = {
      id: cases.length + 1,
      caseNumber: `CASE-2025-${String(cases.length + 1).padStart(3, '0')}`,
      title: formData.get('title') as string,
      status: 'Open',
      priority: formData.get('priority') as string,
      client: formData.get('client') as string,
      description: formData.get('description') as string,
      nextAction: formData.get('nextAction') as string,
      dueDate: formData.get('dueDate') as string,
    };

    setCases([newCase, ...cases]);
    setShowNewCaseModal(false);
    setSelectedCase(newCase.id);
  };

  const playRecordingAnnouncement = (): Promise<void> => {
    return new Promise((resolve) => {
      // Use Speech Synthesis API to announce recording
      const utterance = new SpeechSynthesisUtterance(
        "This interview will now be recorded. Recording started."
      );

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        // Play a beep after announcement
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        // Resolve after beep completes
        setTimeout(resolve, 400);
      };

      utterance.onerror = () => {
        console.error('Speech synthesis error');
        resolve(); // Continue even if speech fails
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const handleStartRecording = async () => {
    try {
      // Ask for consent before recording
      const consent = confirm(
        'Recording Consent Required\n\n' +
        'This interview will be recorded for legal documentation purposes. ' +
        'By clicking "OK", you acknowledge and consent to this recording.\n\n' +
        'Do you agree to proceed with the recording?'
      );

      if (!consent) {
        console.log('Recording consent denied by user');
        return;
      }

      // Play announcement and wait for it to complete
      await playRecordingAnnouncement();

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', audioBlob.size, 'bytes');

        // Auto-save the recording
        autoSaveRecording(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Set up audio analysis for speaker detection simulation
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Monitor audio levels for speaker detection
      const monitorAudio = () => {
        if (!isRecording) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);

        // Simulate speaker detection based on audio patterns
        // In production, this would use actual AI speaker diarization
        if (average > 30) {
          // Randomly assign speaker based on pattern (simulated)
          const detectedSpeaker = Math.random() > 0.5 ? 'client' : 'lawyer';
          setCurrentSpeaker(detectedSpeaker);
        } else {
          setCurrentSpeaker(null);
        }

        requestAnimationFrame(monitorAudio);
      };
      monitorAudio();

      // Recording timer
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 3600) { // Stop at 1 hour
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Store interval for cleanup
      (recorder as any).timerInterval = interval;

      // Simulate AI transcription with speaker identification
      setTimeout(() => {
        setTranscription(prev => [...prev, {
          speaker: 'client',
          text: 'I was terminated from my position on December 15th without any prior warning.',
          timestamp: formatTime(3)
        }]);
      }, 3000);

      setTimeout(() => {
        setTranscription(prev => [...prev, {
          speaker: 'lawyer',
          text: 'Can you describe the circumstances leading to your termination?',
          timestamp: formatTime(8)
        }]);
      }, 8000);

      setTimeout(() => {
        setTranscription(prev => [...prev, {
          speaker: 'client',
          text: 'My supervisor had made several discriminatory comments about my age over the past few months.',
          timestamp: formatTime(15)
        }]);
      }, 15000);

      setTimeout(() => {
        setTranscription(prev => [...prev, {
          speaker: 'lawyer',
          text: 'Do you have any documentation or witnesses regarding these discriminatory comments?',
          timestamp: formatTime(22)
        }]);
      }, 22000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();

      // Clear timer
      if ((mediaRecorder as any).timerInterval) {
        clearInterval((mediaRecorder as any).timerInterval);
      }
    }
    setIsRecording(false);
    setCurrentSpeaker(null);
    setAudioLevel(0);
  };

  const autoSaveRecording = (audioBlob: Blob) => {
    console.log('Auto-saving recording, blob size:', audioBlob.size, 'bytes');

    // Convert blob to base64 for localStorage
    const reader = new FileReader();

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Failed to save recording data.');
    };

    reader.onloadend = () => {
      try {
        const base64data = reader.result as string;
        console.log('Base64 data length:', base64data.length);

        const newRecording = {
          id: Date.now().toString(),
          name: `Interview Recording ${new Date().toLocaleString()}`,
          data: base64data,
          date: new Date().toISOString(),
        };

        console.log('Auto-saving recording:', newRecording.name);

        // Update state
        setSavedRecordings(prev => {
          const updated = [...prev, newRecording];
          console.log('Updated recordings count:', updated.length);

          // Try to save to localStorage immediately
          try {
            localStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(updated));
            console.log('Successfully auto-saved to localStorage');
          } catch (storageError) {
            console.error('localStorage error:', storageError);
            if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
              alert('Storage quota exceeded! Recording is too large to save in demo mode. Please try a shorter recording or create an account.');
            } else {
              alert('Failed to save recording to storage.');
            }
          }

          return updated;
        });

        // Show success notification
        alert('Recording automatically saved!');
      } catch (error) {
        console.error('Error processing recording:', error);
        alert('Failed to save recording.');
      }
    };

    reader.readAsDataURL(audioBlob);
  };

  const handleDownloadRecording = (recordingData: string, name: string) => {
    const a = document.createElement('a');
    a.href = recordingData;
    a.download = `${name}.webm`;
    a.click();
  };

  const handleDeleteRecording = (id: string) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      setSavedRecordings(prev => {
        const updated = prev.filter(r => r.id !== id);
        console.log('Deleted recording, remaining count:', updated.length);

        // Save to localStorage immediately
        try {
          localStorage.setItem(STORAGE_KEYS.RECORDINGS, JSON.stringify(updated));
          console.log('Updated localStorage after deletion');
        } catch (error) {
          console.error('Failed to update localStorage after deletion:', error);
        }

        return updated;
      });
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all demo data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEYS.CASES);
      localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
      localStorage.removeItem(STORAGE_KEYS.RECORDINGS);
      setCases(DEFAULT_CASES);
      setDemoDocuments([
        { id: 1, name: 'Employment Contract.pdf', type: 'Contract', size: '245 KB', date: '2024-12-15' },
        { id: 2, name: 'Complaint Filing.docx', type: 'Pleading', size: '128 KB', date: '2024-12-20' },
        { id: 3, name: 'Evidence Photos.zip', type: 'Evidence', size: '2.4 MB', date: '2025-01-03' },
      ]);
      setSavedRecordings([]);
      alert('All demo data has been cleared!');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/${locale}`} className="text-xl font-bold text-blue-600 dark:text-blue-400">
                GR Lawyer Assistant
              </Link>
              <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                DEMO MODE
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {demoUser.name} ({demoUser.role})
              </span>
              <Link
                href={`/${locale}/auth/register`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 text-2xl">ℹ️</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Interactive Demo - Try All Features!
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Create cases, record interviews, and explore AI assistance. All data is stored locally in your browser.
                  <Link href={`/${locale}/auth/register`} className="font-semibold underline ml-1">
                    Create a free account
                  </Link> to save your work permanently.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearAllData}
              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            {[
              { id: 'cases', label: 'Cases', icon: '📋' },
              { id: 'interview', label: 'Interview Recording', icon: '🎙️' },
              { id: 'documents', label: 'Documents', icon: '📄' },
              { id: 'ai', label: 'AI Assistant', icon: '🤖' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Cases</h2>
              <button
                onClick={() => setShowNewCaseModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Case
              </button>
            </div>
            <div className="grid gap-4">
              {cases.map((case_) => (
                <div
                  key={case_.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCase(selectedCase === case_.id ? null : case_.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {case_.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            case_.priority === 'High'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : case_.priority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {case_.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{case_.caseNumber}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        case_.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : case_.status === 'Open'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {case_.status}
                    </span>
                  </div>

                  {selectedCase === case_.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</p>
                          <p className="text-sm text-gray-900 dark:text-white">{case_.client}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</p>
                          <p className="text-sm text-gray-900 dark:text-white">{case_.dueDate}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{case_.description}</p>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Next Action</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{case_.nextAction}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('interview');
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      >
                        🎙️ Start Interview Recording
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Recording Tab */}
        {activeTab === 'interview' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Client Interview Recording</h2>

              {/* Recording Controls */}
              <div className="flex flex-col items-center gap-4 mb-6 p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="flex items-center gap-2 px-6 py-3 text-lg font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                    >
                      <span className="text-2xl">🎙️</span>
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center gap-2 px-6 py-3 text-lg font-medium text-white bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-2xl">⏹️</span>
                      Stop Recording
                    </button>
                  )}
                </div>
                {savedRecordings.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {savedRecordings.length} recording{savedRecordings.length !== 1 ? 's' : ''} saved
                  </p>
                )}

                {isRecording && (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-lg font-mono text-gray-900 dark:text-white">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                    </div>

                    {/* Audio Level Visualization */}
                    <div className="w-full max-w-md mx-auto">
                      <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${Math.min(audioLevel, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Current Speaker Indicator */}
                    {currentSpeaker && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <div className={`px-3 py-1 rounded-full ${
                          currentSpeaker === 'lawyer'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {currentSpeaker === 'lawyer' ? '👔 Lawyer Speaking' : '👤 Client Speaking'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Transcription with Speaker Identification */}
              {transcription.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Live AI Transcription with Speaker Detection
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                    {transcription.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className={`flex-shrink-0 w-20 text-xs font-semibold ${
                          item.speaker === 'lawyer'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          <div className="flex items-center gap-1">
                            <span>{item.speaker === 'lawyer' ? '👔' : '👤'}</span>
                            <span>{item.speaker === 'lawyer' ? 'Lawyer' : 'Client'}</span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 mt-1">
                            {item.timestamp}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isRecording && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Listening and detecting speakers...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Interview Notes
                </h3>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Take notes during the interview..."
                  className="w-full h-48 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="mt-3 flex gap-3">
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    Save Notes
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                    Generate Summary with AI
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Recordings */}
            {savedRecordings.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Saved Recordings ({savedRecordings.length})
                </h3>
                <div className="space-y-3">
                  {savedRecordings.map((recording) => (
                    <div key={recording.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {recording.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(recording.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadRecording(recording.data, recording.name)}
                          className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteRecording(recording.id)}
                          className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 AI Suggested Questions
              </h4>
              <ul className="space-y-2">
                <li className="text-sm text-blue-800 dark:text-blue-200">
                  • "Can you provide specific dates and times of the incidents?"
                </li>
                <li className="text-sm text-blue-800 dark:text-blue-200">
                  • "Were there any witnesses to these events?"
                </li>
                <li className="text-sm text-blue-800 dark:text-blue-200">
                  • "Do you have any documentation or evidence supporting your claim?"
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h2>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                + Upload Document
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {demoDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        📎 {doc.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI Legal Assistant</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="space-y-4 mb-4">
                {aiConversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask the AI assistant anything..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create New Case</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Case Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Johnson vs. City Housing Authority"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Robert Johnson"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority *
                </label>
                <select
                  name="priority"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the case..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Next Action *
                </label>
                <input
                  type="text"
                  name="nextAction"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Schedule initial consultation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Case
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ready to manage your own cases? Create a free account to get started.
          </p>
          <Link
            href={`/${locale}/auth/register`}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
