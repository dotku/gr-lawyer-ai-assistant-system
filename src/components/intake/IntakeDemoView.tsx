'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VoiceInput, TranscriptionResult } from '@/components/ui/voice-input';
import { ConversationRecorder, ConversationSegment } from '@/components/ui/conversation-recorder';
import { getSupabaseClient, type Transcript, type SpeakerSegment } from '@/lib/supabase';
import {
  Search,
  Plus,
  Star,
  Calendar,
  FileQuestion,
  StickyNote,
  Sparkles,
  ArrowRight,
  X,
  Mic,
  MessageSquare,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  Clock,
  Trash2,
  Edit2,
  Check,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  Mail,
  Copy,
} from 'lucide-react';

// Type definitions for mock data
interface MockSchedule {
  id: string;
  title: string;
  date: Date;
  time: string;
  meetingLink: string;
  type: string;
}

interface MockNotice {
  id: string;
  content: string;
  isStarred: boolean;
  createdAt: Date;
}

interface MockQuestion {
  id: string;
  question: string;
  answer: string | null;
  audioUrl?: string;
}

interface MockNote {
  id: string;
  content: string;
  author: { name: string; email: string };
  createdAt: Date;
  audioUrl?: string;
}

interface MockRecording {
  id: string;
  name: string;
  audioUrl: string;
  transcription: string;
  createdAt: Date;
}

interface MockIntake {
  id: string;
  intakeNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  status: string;
  category: string;
  tags: string[];
  shareSettings: string;
  summary: string | null;
  createdAt: Date;
  schedules: MockSchedule[];
  notices: MockNotice[];
  questions: MockQuestion[];
  notes: MockNote[];
  recordings: MockRecording[];
  conversation: ConversationSegment[];
}

// Mock data
const generateMockIntakes = (): MockIntake[] => [
  {
    id: '1',
    intakeNumber: 'INT-202601-0001',
    clientName: 'John Smith',
    clientEmail: 'john.smith@email.com',
    clientPhone: '555-0101',
    status: 'NEW',
    category: 'Family Law',
    tags: ['Lawyer', 'Family', 'Active', 'Court'],
    shareSettings: 'Only those invited',
    summary: null,
    createdAt: new Date('2026-01-25T11:00:00'),
    schedules: [
      {
        id: 's1',
        title: 'Initial Consultation',
        date: new Date('2026-01-25'),
        time: '11:00 AM',
        meetingLink: 'https://zoom.us/j/123456',
        type: 'zoom',
      },
    ],
    notices: [
      {
        id: 'n1',
        content: 'Client requested rush service',
        isStarred: true,
        createdAt: new Date(),
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Do you have children?',
        answer: 'Yes, 2 children',
      },
      {
        id: 'q2',
        question: 'Have you filed for divorce before?',
        answer: null,
      },
    ],
    notes: [
      {
        id: 'note1',
        content: 'Client seemed anxious about the process',
        author: { name: 'Demo User', email: 'demo@ordolex.com' },
        createdAt: new Date(),
      },
    ],
    recordings: [],
    conversation: [],
  },
  {
    id: '2',
    intakeNumber: 'INT-202601-0002',
    clientName: 'Sarah Johnson',
    clientEmail: 'sarah.j@email.com',
    clientPhone: '555-0102',
    status: 'PROCESSING',
    category: 'Corporate Law',
    tags: ['Business', 'Contract'],
    shareSettings: 'Only those invited',
    summary: 'Business contract review needed for new partnership agreement.',
    createdAt: new Date('2026-01-24T14:30:00'),
    schedules: [],
    notices: [],
    questions: [],
    notes: [],
    recordings: [],
    conversation: [],
  },
  {
    id: '3',
    intakeNumber: 'INT-202601-0003',
    clientName: 'Michael Brown',
    clientEmail: 'mbrown@email.com',
    clientPhone: null,
    status: 'NEED_REVIEW',
    category: 'Real Estate',
    tags: ['Property', 'Urgent'],
    shareSettings: 'Only those invited',
    summary: null,
    createdAt: new Date('2026-01-23T09:15:00'),
    schedules: [],
    notices: [],
    questions: [],
    notes: [],
    recordings: [],
    conversation: [],
  },
];

export function IntakeDemoView() {
  const router = useRouter();
  const locale = useLocale();
  const [intakes, setIntakes] = useState<MockIntake[]>(generateMockIntakes());
  const [selectedIntake, setSelectedIntake] = useState<MockIntake | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');

  // Form states
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleMeetingLink, setScheduleMeetingLink] = useState('');

  const [noticeContent, setNoticeContent] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState('');

  // New intake dialog states
  const [isNewIntakeDialogOpen, setIsNewIntakeDialogOpen] = useState(false);
  const [newIntakeClientName, setNewIntakeClientName] = useState('');
  const [newIntakeClientEmail, setNewIntakeClientEmail] = useState('');
  const [newIntakeClientPhone, setNewIntakeClientPhone] = useState('');
  const [newIntakeCategory, setNewIntakeCategory] = useState('');

  // Saved transcripts state
  const [savedTranscripts, setSavedTranscripts] = useState<Transcript[]>([]);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved transcripts from Supabase when intake is selected
  const loadSavedTranscripts = useCallback(async (intakeId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('Supabase not configured, cannot load transcripts');
      return;
    }

    setIsLoadingTranscripts(true);
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', intakeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load transcripts:', error);
        return;
      }

      setSavedTranscripts(data || []);
      console.log('Loaded transcripts:', data?.length || 0);

      // Convert saved transcripts to conversation segments for the recorder
      if (data && data.length > 0) {
        const latestTranscript = data[0];
        const audioUrl = (latestTranscript.metadata as { audio_url?: string })?.audio_url;

        let segments: ConversationSegment[];

        if (latestTranscript.speaker_segments && Array.isArray(latestTranscript.speaker_segments) && latestTranscript.speaker_segments.length > 0) {
          // Use timed segments
          segments = (latestTranscript.speaker_segments as SpeakerSegment[]).map((seg, index) => ({
            id: `saved-${index}`,
            text: seg.text,
            timestamp: new Date(latestTranscript.created_at),
            audioUrl,
            startTime: seg.start_time,
            endTime: seg.end_time,
          }));
        } else if (latestTranscript.content) {
          // Fallback to single segment
          segments = [{
            id: `saved-0`,
            text: latestTranscript.content,
            timestamp: new Date(latestTranscript.created_at),
            audioUrl,
          }];
        } else {
          segments = [];
        }

        if (segments.length > 0) {
          setIntakes(prev =>
            prev.map(intake =>
              intake.id === intakeId
                ? { ...intake, conversation: segments }
                : intake
            )
          );

          if (selectedIntake?.id === intakeId) {
            setSelectedIntake(prev =>
              prev ? { ...prev, conversation: segments } : prev
            );
          }
        }
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setIsLoadingTranscripts(false);
    }
  }, [selectedIntake?.id]);

  // Load transcripts when intake is selected
  useEffect(() => {
    if (selectedIntake) {
      loadSavedTranscripts(selectedIntake.id);
    }
  }, [selectedIntake?.id, loadSavedTranscripts]);

  // Transcript editing state
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editingTranscriptContent, setEditingTranscriptContent] = useState('');
  const [isDeletingTranscript, setIsDeletingTranscript] = useState<string | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  // Per-transcript summary state
  const [transcriptSummaries, setTranscriptSummaries] = useState<Record<string, string>>({});
  const [summarizingTranscriptId, setSummarizingTranscriptId] = useState<string | null>(null);

  // Email draft state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Format time for SRT format (HH:MM:SS,mmm)
  const formatSrtTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || !isFinite(seconds) || isNaN(seconds)) {
      return '00:00:00,000';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // Convert segments to SRT format
  const convertToSrt = (segments: SpeakerSegment[]): string => {
    if (!segments || segments.length === 0) return '';
    return segments.map((seg, index) => {
      const startTime = formatSrtTime(seg.start_time);
      const endTime = formatSrtTime(seg.end_time);
      return `${index + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    }).join('\n');
  };

  // Download transcript as SRT file
  const handleDownloadSrt = (transcript: Transcript) => {
    const segments = transcript.speaker_segments as SpeakerSegment[] | null;
    if (!segments || segments.length === 0) {
      // Fallback: download as plain text if no segments
      if (!transcript.content) {
        alert('No transcript content available');
        return;
      }
      const blob = new Blob([transcript.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transcript.source_name.replace(/[^a-z0-9]/gi, '_')}_${new Date(transcript.created_at).toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    const srtContent = convertToSrt(segments);
    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.source_name.replace(/[^a-z0-9]/gi, '_')}_${new Date(transcript.created_at).toISOString().split('T')[0]}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Summarize a single transcript
  const handleSummarizeTranscript = async (transcript: Transcript) => {
    if (!transcript.content) return;

    setSummarizingTranscriptId(transcript.id);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          context: transcript.content,
          action: 'summarize',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const summary = data.summary || data.response || 'Failed to generate summary.';

      setTranscriptSummaries(prev => ({
        ...prev,
        [transcript.id]: summary,
      }));
    } catch (error) {
      console.error('Transcript summary error:', error);
      alert('Failed to generate summary. Please check your API configuration.');
    } finally {
      setSummarizingTranscriptId(null);
    }
  };

  // Draft confirmation email
  const handleDraftEmail = async () => {
    if (!selectedIntake) return;

    setIsEmailDialogOpen(true);
    setIsGeneratingEmail(true);
    setEmailCopied(false);

    // Gather context for email generation
    const contextParts: string[] = [
      `Client Name: ${selectedIntake.clientName}`,
      `Client Email: ${selectedIntake.clientEmail}`,
      `Category: ${selectedIntake.category || 'General Legal'}`,
      `Intake Number: ${selectedIntake.intakeNumber}`,
    ];

    if (selectedIntake.schedules.length > 0) {
      const schedulesText = selectedIntake.schedules
        .map((s) => `- ${s.title}: ${s.date.toLocaleDateString()} at ${s.time} (${s.type}${s.meetingLink ? `, link: ${s.meetingLink}` : ''})`)
        .join('\n');
      contextParts.push(`\nScheduled Meetings:\n${schedulesText}`);
    }

    if (selectedIntake.notices.length > 0) {
      const noticesText = selectedIntake.notices
        .map((n) => `- ${n.content}`)
        .join('\n');
      contextParts.push(`\nNotices:\n${noticesText}`);
    }

    if (selectedIntake.summary) {
      contextParts.push(`\nCase Summary:\n${selectedIntake.summary}`);
    }

    const context = contextParts.join('\n');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Based on the provided intake information, draft a professional confirmation email to the client. The email should:
1. Address the client by name
2. Confirm their intake has been received
3. Mention their case category
4. Include any scheduled meeting details (dates, times, links)
5. Be professional, concise, and friendly
6. End with appropriate next steps

Please respond in this exact format:
SUBJECT: [email subject line]
---
[email body]`,
            },
          ],
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate email');
      }

      const data = await response.json();
      const emailContent = data.response || data.summary || '';

      // Parse subject and body from response
      const subjectMatch = emailContent.match(/SUBJECT:\s*(.+?)(?:\n|---)/);
      const bodyMatch = emailContent.split('---');

      if (subjectMatch) {
        setEmailSubject(subjectMatch[1].trim());
      } else {
        setEmailSubject(`Intake Confirmation - ${selectedIntake.intakeNumber}`);
      }

      if (bodyMatch.length > 1) {
        setEmailBody(bodyMatch.slice(1).join('---').trim());
      } else {
        setEmailBody(emailContent);
      }
    } catch (error) {
      console.error('Email generation error:', error);
      // Fallback to a simple template
      setEmailSubject(`Intake Confirmation - ${selectedIntake.intakeNumber}`);
      setEmailBody(
        `Dear ${selectedIntake.clientName},\n\n` +
        `Thank you for contacting us regarding your ${selectedIntake.category || 'legal'} matter. ` +
        `We have received your intake (Reference: ${selectedIntake.intakeNumber}) and a member of our team will be in touch shortly.\n\n` +
        (selectedIntake.schedules.length > 0
          ? `Your next scheduled appointment:\n${selectedIntake.schedules.map(s => `- ${s.title}: ${s.date.toLocaleDateString()} at ${s.time}`).join('\n')}\n\n`
          : '') +
        `If you have any questions in the meantime, please do not hesitate to reach out.\n\n` +
        `Best regards,\n[Your Name]`
      );
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopyEmail = async () => {
    const fullEmail = `Subject: ${emailSubject}\n\n${emailBody}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = fullEmail;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleOpenInEmail = () => {
    if (!selectedIntake) return;
    const mailto = `mailto:${encodeURIComponent(selectedIntake.clientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, '_blank');
  };

  // Audio playback functions
  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || !isFinite(seconds) || isNaN(seconds)) {
      return '--:--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Delete transcript from Supabase
  const handleDeleteTranscript = async (transcriptId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      alert('Supabase not configured');
      return;
    }

    setIsDeletingTranscript(transcriptId);
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', transcriptId);

      if (error) {
        console.error('Failed to delete transcript:', error);
        alert('Failed to delete recording: ' + error.message);
        return;
      }

      // Remove from local state
      setSavedTranscripts(prev => prev.filter(t => t.id !== transcriptId));
    } catch (error) {
      console.error('Error deleting transcript:', error);
      alert('Failed to delete recording');
    } finally {
      setIsDeletingTranscript(null);
    }
  };

  // Update transcript content in Supabase
  const handleUpdateTranscript = async (transcriptId: string, newContent: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      alert('Supabase not configured');
      return;
    }

    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ content: newContent })
        .eq('id', transcriptId);

      if (error) {
        console.error('Failed to update transcript:', error);
        alert('Failed to update transcript: ' + error.message);
        return;
      }

      // Update local state
      setSavedTranscripts(prev =>
        prev.map(t => t.id === transcriptId ? { ...t, content: newContent } : t)
      );
      setEditingTranscriptId(null);
      setEditingTranscriptContent('');
    } catch (error) {
      console.error('Error updating transcript:', error);
      alert('Failed to update transcript');
    }
  };

  const handlePlayAudio = (transcriptId: string, audioUrl: string) => {
    if (playingAudioId === transcriptId) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setAudioCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        setAudioCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setPlayingAudioId(null);
        alert('Failed to play audio. The file may no longer be available.');
      });

      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setPlayingAudioId(null);
      });

      setPlayingAudioId(transcriptId);
    }
  };

  // Cleanup audio on unmount or intake change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedIntake?.id]);

  const filters = [
    { key: 'all', label: 'All', count: intakes.length },
    { key: 'NEW', label: 'New', count: intakes.filter(i => i.status === 'NEW').length },
    { key: 'PROCESSING', label: 'Processing', count: intakes.filter(i => i.status === 'PROCESSING').length },
    { key: 'NEED_REVIEW', label: 'Need Review', count: intakes.filter(i => i.status === 'NEED_REVIEW').length },
    { key: 'SENT', label: 'Sent', count: intakes.filter(i => i.status === 'SENT').length },
    { key: 'ARCHIVED', label: 'Archived', count: intakes.filter(i => i.status === 'ARCHIVED').length },
  ];

  const filteredIntakes = intakes.filter(intake => {
    const matchesSearch =
      intake.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intake.intakeNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = currentFilter === 'all' || intake.status === currentFilter;
    return matchesSearch && matchesFilter;
  });

  const handleAddSchedule = () => {
    if (!selectedIntake || !scheduleTitle || !scheduleDate || !scheduleTime) return;

    const newSchedule = {
      id: `s${Date.now()}`,
      title: scheduleTitle,
      date: new Date(scheduleDate),
      time: scheduleTime,
      meetingLink: scheduleMeetingLink,
      type: scheduleMeetingLink.includes('zoom') ? 'zoom' : 'meeting',
    };

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id
          ? { ...i, schedules: [...i.schedules, newSchedule] }
          : i
      )
    );

    setSelectedIntake((prev) => prev ? ({
      ...prev,
      schedules: [...prev.schedules, newSchedule],
    }) : null);

    setScheduleTitle('');
    setScheduleDate('');
    setScheduleTime('');
    setScheduleMeetingLink('');
  };

  const handleAddNotice = () => {
    if (!selectedIntake || !noticeContent) return;

    const newNotice = {
      id: `n${Date.now()}`,
      content: noticeContent,
      isStarred: false,
      createdAt: new Date(),
    };

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id ? { ...i, notices: [...i.notices, newNotice] } : i
      )
    );

    setSelectedIntake((prev) => prev ? ({
      ...prev,
      notices: [...prev.notices, newNotice],
    }) : null);

    setNoticeContent('');
  };

  const handleToggleNoticeStarred = (noticeId: string) => {
    if (!selectedIntake) return;

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id
          ? {
              ...i,
              notices: i.notices.map(n =>
                n.id === noticeId ? { ...n, isStarred: !n.isStarred } : n
              ),
            }
          : i
      )
    );

    setSelectedIntake(prev =>
      prev
        ? {
            ...prev,
            notices: prev.notices.map(n =>
              n.id === noticeId ? { ...n, isStarred: !n.isStarred } : n
            ),
          }
        : null
    );
  };

  const handleAddQuestion = () => {
    if (!selectedIntake || !questionText) return;

    const newQuestion = {
      id: `q${Date.now()}`,
      question: questionText,
      answer: null,
    };

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id
          ? { ...i, questions: [...i.questions, newQuestion] }
          : i
      )
    );

    setSelectedIntake((prev) => prev ? ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }) : null);

    setQuestionText('');
  };

  const handleAnswerQuestion = (questionId: string) => {
    if (!selectedIntake || !questionAnswer.trim()) return;

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id
          ? {
              ...i,
              questions: i.questions.map(q =>
                q.id === questionId ? { ...q, answer: questionAnswer } : q
              ),
            }
          : i
      )
    );

    setSelectedIntake(prev =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map(q =>
              q.id === questionId ? { ...q, answer: questionAnswer } : q
            ),
          }
        : null
    );

    setAnsweringQuestionId(null);
    setQuestionAnswer('');
  };

  const handleAddNote = () => {
    if (!selectedIntake || !noteContent) return;

    const newNote = {
      id: `note${Date.now()}`,
      content: noteContent,
      author: { name: 'Demo User', email: 'demo@ordolex.com' },
      createdAt: new Date(),
    };

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id ? { ...i, notes: [newNote, ...i.notes] } : i
      )
    );

    setSelectedIntake((prev) => prev ? ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }) : null);

    setNoteContent('');
  };

  const handleGenerateSummary = async () => {
    if (!selectedIntake) return;

    // Gather transcription content from saved transcripts and current conversation
    const transcriptTexts: string[] = [];

    // Add saved transcript content
    savedTranscripts.forEach((t) => {
      if (t.content) {
        transcriptTexts.push(t.content);
      }
    });

    // Add current conversation segments
    selectedIntake.conversation.forEach((seg) => {
      if (seg.text) {
        transcriptTexts.push(seg.text);
      }
    });

    // Add notices
    if (selectedIntake.notices.length > 0) {
      const noticesText = selectedIntake.notices
        .map((n) => `${n.isStarred ? '[IMPORTANT] ' : ''}${n.content}`)
        .join('\n');
      transcriptTexts.push(`Notices:\n${noticesText}`);
    }

    // Add questions and answers
    if (selectedIntake.questions.length > 0) {
      const qaText = selectedIntake.questions
        .map((q) => `Q: ${q.question}${q.answer ? `\nA: ${q.answer}` : ''}`)
        .join('\n');
      transcriptTexts.push(`Questions:\n${qaText}`);
    }

    // Add notes
    if (selectedIntake.notes.length > 0) {
      const notesText = selectedIntake.notes
        .map((n) => n.content)
        .join('\n');
      transcriptTexts.push(`Notes:\n${notesText}`);
    }

    // Add schedules
    if (selectedIntake.schedules.length > 0) {
      const schedulesText = selectedIntake.schedules
        .map((s) => `${s.title} - ${s.date.toLocaleDateString()} at ${s.time} (${s.type})`)
        .join('\n');
      transcriptTexts.push(`Scheduled Meetings:\n${schedulesText}`);
    }

    // Add per-transcript summaries if available
    const existingSummaries = savedTranscripts
      .filter((t) => transcriptSummaries[t.id])
      .map((t) => transcriptSummaries[t.id]);
    if (existingSummaries.length > 0) {
      transcriptTexts.push(`Individual Recording Summaries:\n${existingSummaries.join('\n---\n')}`);
    }

    const context = [
      `Client: ${selectedIntake.clientName}`,
      `Category: ${selectedIntake.category || 'General Legal'}`,
      `Intake Number: ${selectedIntake.intakeNumber}`,
      '',
      ...transcriptTexts,
    ].join('\n');

    if (transcriptTexts.length === 0) {
      // No transcription data available, show message
      const summary = `No transcription or notes available to summarize. Record an interview or add notes first.`;
      setIntakes(prev =>
        prev.map(i => (i.id === selectedIntake.id ? { ...i, summary } : i))
      );
      setSelectedIntake((prev) => prev ? ({ ...prev, summary }) : null);
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          context,
          action: 'summarize',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      const summary = data.summary || data.response || 'Failed to generate summary.';

      setIntakes(prev =>
        prev.map(i => (i.id === selectedIntake.id ? { ...i, summary } : i))
      );
      setSelectedIntake((prev) => prev ? ({ ...prev, summary }) : null);
    } catch (error) {
      console.error('Summary generation error:', error);
      alert('Failed to generate summary. Please check your API configuration.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleConvertToCase = () => {
    if (!selectedIntake) return;

    alert(`Intake ${selectedIntake.intakeNumber} would be converted to a case. In the full version, this would create a new case and redirect to the Matter Workspace.`);

    setIntakes(prev =>
      prev.map(i =>
        i.id === selectedIntake.id ? { ...i, status: 'CONVERTED' } : i
      )
    );

    setSelectedIntake((prev) => prev ? ({ ...prev, status: 'CONVERTED' }) : null);
  };

  const handleCreateNewIntake = () => {
    if (!newIntakeClientName.trim() || !newIntakeClientEmail.trim()) return;

    // Generate intake number
    const now = new Date();
    const yearMonth = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0');
    const nextNumber = String(intakes.length + 1).padStart(4, '0');
    const intakeNumber = `INT-${yearMonth}-${nextNumber}`;

    const newIntake: MockIntake = {
      id: `intake-${Date.now()}`,
      intakeNumber,
      clientName: newIntakeClientName,
      clientEmail: newIntakeClientEmail,
      clientPhone: newIntakeClientPhone || null,
      status: 'NEW',
      category: newIntakeCategory || 'General Legal',
      tags: ['New Client'],
      shareSettings: 'Only those invited',
      summary: null,
      createdAt: now,
      schedules: [],
      notices: [],
      questions: [],
      notes: [],
      recordings: [],
    conversation: [],
    };

    setIntakes(prev => [newIntake, ...prev]);
    setSelectedIntake(newIntake);

    // Reset form
    setNewIntakeClientName('');
    setNewIntakeClientEmail('');
    setNewIntakeClientPhone('');
    setNewIntakeCategory('');
    setIsNewIntakeDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'default';
      case 'PROCESSING':
        return 'secondary';
      case 'NEED_REVIEW':
        return 'destructive';
      case 'CONVERTED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Demo Banner */}
      <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm">
        <span className="font-medium">Demo Mode</span> - This is a fully interactive demo. All data is stored locally and will reset on page refresh.
        <span className="hidden md:inline"> Try adding meetings, notices, questions, and notes!</span>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-full md:w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Intake Inbox</h1>
            <Button
              size="sm"
              onClick={() => setIsNewIntakeDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search intakes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-1">
          {filters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setCurrentFilter(filter.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                currentFilter === filter.key
                  ? 'bg-secondary text-secondary-foreground'
                  : 'hover:bg-secondary/50'
              }`}
            >
              <span>{filter.label}</span>
              <Badge variant="secondary" className="ml-auto">
                {filter.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Intake List */}
        <div className="flex-1 overflow-y-auto">
          {filteredIntakes.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-center p-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'No intakes match your search'
                  : 'No intakes in this category'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredIntakes.map(intake => (
              <Card
                key={intake.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedIntake?.id === intake.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedIntake(intake)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{intake.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {intake.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {intake.intakeNumber}
                    </p>
                  </div>
                  <Badge
                    variant={getStatusBadgeVariant(intake.status) as any}
                    className="ml-2 shrink-0"
                  >
                    {intake.status}
                  </Badge>
                </div>
              </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto">
        {!selectedIntake ? (
          <div className="flex items-center justify-center h-full text-center p-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Select an intake</h2>
              <p className="text-muted-foreground">
                Choose an intake from the list to view details
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl md:text-3xl font-bold">{selectedIntake.intakeNumber}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(selectedIntake.status) as any}>
                    {selectedIntake.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedIntake(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedIntake.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
                {selectedIntake.category && (
                  <Badge variant="secondary">{selectedIntake.category}</Badge>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <span className="mr-2">🔒</span>
                    {selectedIntake.shareSettings}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium">{selectedIntake.clientName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedIntake.clientEmail}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">
                      {selectedIntake.clientPhone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="mr-2 h-5 w-5" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIntake.schedules.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{schedule.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.date.toLocaleDateString()} at {schedule.time}
                      </p>
                      {schedule.meetingLink && (
                        <a
                          href={schedule.meetingLink}
                          className="text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {schedule.type === 'zoom' ? 'Zoom Link' : 'Meeting Link'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {selectedIntake.schedules.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No meetings scheduled yet
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <Input
                    placeholder="Meeting title"
                    value={scheduleTitle}
                    onChange={e => setScheduleTitle(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Meeting link (optional)"
                    value={scheduleMeetingLink}
                    onChange={e => setScheduleMeetingLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSchedule();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddSchedule}
                    size="sm"
                    disabled={!scheduleTitle || !scheduleDate || !scheduleTime}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meeting
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notices Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Star className="mr-2 h-5 w-5" />
                  Notices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIntake.notices.map((notice: any) => (
                  <div
                    key={notice.id}
                    className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md group"
                  >
                    <button
                      onClick={() => handleToggleNoticeStarred(notice.id)}
                      className="shrink-0 mt-0.5 hover:scale-110 transition-transform"
                      title={notice.isStarred ? 'Unstar notice' : 'Star notice'}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          notice.isStarred
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground group-hover:text-yellow-500'
                        }`}
                      />
                    </button>
                    <p className="flex-1 text-sm">{notice.content}</p>
                  </div>
                ))}

                {selectedIntake.notices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notices yet
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    placeholder="Add a notice..."
                    value={noticeContent}
                    onChange={e => setNoticeContent(e.target.value)}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddNotice();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddNotice}
                    size="sm"
                    disabled={!noticeContent.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Notice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Questions Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileQuestion className="mr-2 h-5 w-5" />
                  Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIntake.questions.map((question: any, index: number) => (
                  <div key={question.id} className="p-3 bg-secondary/50 rounded-md space-y-2">
                    <p className="font-medium text-sm">
                      {index + 1}. {question.question}
                    </p>
                    {question.answer ? (
                      <p className="text-sm text-muted-foreground mt-2 pl-4">
                        <span className="font-medium">A:</span> {question.answer}
                      </p>
                    ) : answeringQuestionId === question.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type or record answer..."
                            value={questionAnswer}
                            onChange={(e) => setQuestionAnswer(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAnswerQuestion(question.id);
                              }
                            }}
                            autoFocus
                            className="flex-1"
                          />
                          <VoiceInput
                            onTranscript={(text, result) => {
                              setQuestionAnswer(prev => prev ? `${prev} ${text}` : text);
                              if (result?.audioUrl) {
                                console.log('Answer recording saved:', result.audioUrl);
                              }
                            }}
                            buttonSize="icon"
                            saveAudio
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAnswerQuestion(question.id)}
                          >
                            Save Answer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnsweringQuestionId(null);
                              setQuestionAnswer('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnsweringQuestionId(question.id)}
                        className="mt-2"
                      >
                        Add Answer
                      </Button>
                    )}
                  </div>
                ))}

                {selectedIntake.questions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No questions yet
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a question (type or use voice)..."
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuestion();
                        }
                      }}
                      className="flex-1"
                    />
                    <VoiceInput
                      onTranscript={(text, result) => {
                        setQuestionText(prev => prev ? `${prev} ${text}` : text);
                        if (result?.audioUrl) {
                          console.log('Question recording saved:', result.audioUrl);
                        }
                      }}
                      buttonSize="icon"
                      saveAudio
                    />
                  </div>
                  <Button
                    onClick={handleAddQuestion}
                    size="sm"
                    disabled={!questionText.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <StickyNote className="mr-2 h-5 w-5" />
                  Add Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIntake.notes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-secondary/50 rounded-md">
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {note.author.name} on {note.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {selectedIntake.notes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notes yet
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note (type or use voice)..."
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      className="flex-1"
                    />
                    <VoiceInput
                      onTranscript={(text, result) => {
                        setNoteContent(prev => prev ? `${prev} ${text}` : text);
                        if (result?.audioUrl) {
                          console.log('Note recording saved:', result.audioUrl);
                        }
                      }}
                      buttonSize="icon"
                      className="self-start"
                      saveAudio
                    />
                  </div>
                  <Button
                    onClick={handleAddNote}
                    size="sm"
                    disabled={!noteContent.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Interview Recording */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Interview Recording
                  </div>
                  <div className="flex items-center gap-2">
                    {savedTranscripts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {savedTranscripts.length} saved
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadSavedTranscripts(selectedIntake.id)}
                      disabled={isLoadingTranscripts}
                      title="Refresh saved recordings"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingTranscripts ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show saved transcripts with audio playback */}
                {savedTranscripts.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-3">
                      Saved Recordings ({savedTranscripts.length})
                    </p>
                    <div className="space-y-3">
                      {savedTranscripts.map((transcript) => {
                        const audioUrl = (transcript.metadata as { audio_url?: string })?.audio_url;
                        const duration = (transcript.metadata as { duration?: number })?.duration;
                        const isPlaying = playingAudioId === transcript.id;
                        const isEditing = editingTranscriptId === transcript.id;
                        const isDeleting = isDeletingTranscript === transcript.id;

                        return (
                          <div
                            key={transcript.id}
                            className="p-3 bg-white dark:bg-gray-900 rounded-md border border-green-100 dark:border-green-900"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-700 dark:text-green-300 truncate flex-1 mr-2">
                                {transcript.source_name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-500 dark:text-green-400 whitespace-nowrap">
                                  {new Date(transcript.created_at).toLocaleDateString()} {new Date(transcript.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {/* Edit button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingTranscriptId(null);
                                      setEditingTranscriptContent('');
                                    } else {
                                      setEditingTranscriptId(transcript.id);
                                      setEditingTranscriptContent(transcript.content);
                                    }
                                  }}
                                  title={isEditing ? 'Cancel editing' : 'Edit transcript'}
                                >
                                  {isEditing ? <X className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                                </Button>
                                {/* Delete button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                  onClick={() => handleDeleteTranscript(transcript.id)}
                                  disabled={isDeleting}
                                  title="Delete recording"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {audioUrl ? (
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                                  onClick={() => handlePlayAudio(transcript.id, audioUrl)}
                                >
                                  {isPlaying ? (
                                    <Pause className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  )}
                                </Button>

                                <div className="flex-1 flex items-center gap-2">
                                  {isPlaying && (
                                    <>
                                      <div className="flex-1 h-1 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-green-500 transition-all"
                                          style={{ width: `${audioDuration && audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-green-600 dark:text-green-400 min-w-[60px] text-right">
                                        {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                                      </span>
                                    </>
                                  )}
                                  {!isPlaying && (
                                    <span className="text-xs text-green-500 dark:text-green-400 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(duration)}
                                    </span>
                                  )}
                                </div>

                                <Volume2 className="h-4 w-4 text-green-400 dark:text-green-600" />
                              </div>
                            ) : (
                              <p className="text-xs text-green-500 dark:text-green-400 italic">
                                No audio file available
                              </p>
                            )}

                            {/* Show transcript content in SRT format */}
                            {isEditing ? (
                              <div className="mt-3 space-y-2">
                                <Textarea
                                  value={editingTranscriptContent}
                                  onChange={(e) => setEditingTranscriptContent(e.target.value)}
                                  className="text-xs min-h-[100px] font-mono"
                                  placeholder="Edit transcript content..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateTranscript(transcript.id, editingTranscriptContent)}
                                    className="h-7 text-xs"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTranscriptId(null);
                                      setEditingTranscriptContent('');
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3">
                                {transcript.speaker_segments && Array.isArray(transcript.speaker_segments) && transcript.speaker_segments.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-2 max-h-48 overflow-y-auto">
                                      {(expandedTranscriptId === transcript.id
                                        ? transcript.speaker_segments
                                        : transcript.speaker_segments.slice(0, 3)
                                      ).map((seg: SpeakerSegment, idx: number) => (
                                        <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                                          <div className="text-gray-400 dark:text-gray-500">
                                            {idx + 1}
                                          </div>
                                          <div className="text-blue-600 dark:text-blue-400">
                                            {formatSrtTime(seg.start_time)} --&gt; {formatSrtTime(seg.end_time)}
                                          </div>
                                          <div className="text-gray-700 dark:text-gray-300">
                                            {seg.text}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {transcript.speaker_segments.length > 3 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs w-full"
                                        onClick={() => setExpandedTranscriptId(
                                          expandedTranscriptId === transcript.id ? null : transcript.id
                                        )}
                                      >
                                        {expandedTranscriptId === transcript.id ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Show less
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Show all {transcript.speaker_segments.length} segments
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleDownloadSrt(transcript)}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download SRT
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleSummarizeTranscript(transcript)}
                                        disabled={summarizingTranscriptId === transcript.id}
                                      >
                                        {summarizingTranscriptId === transcript.id ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        {transcriptSummaries[transcript.id] ? 'Re-summarize' : 'Summarize'}
                                      </Button>
                                    </div>

                                    {transcriptSummaries[transcript.id] && (
                                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded text-xs">
                                        <p className="text-indigo-700 dark:text-indigo-300 font-medium mb-1">Summary:</p>
                                        <p className="text-indigo-900 dark:text-indigo-100 whitespace-pre-wrap">{transcriptSummaries[transcript.id]}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : transcript.content ? (
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                      {expandedTranscriptId === transcript.id
                                        ? transcript.content
                                        : transcript.content.length > 200
                                          ? `${transcript.content.substring(0, 200)}...`
                                          : transcript.content}
                                    </p>

                                    {transcript.content.length > 200 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs w-full"
                                        onClick={() => setExpandedTranscriptId(
                                          expandedTranscriptId === transcript.id ? null : transcript.id
                                        )}
                                      >
                                        {expandedTranscriptId === transcript.id ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Show less
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Show full transcript
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleDownloadSrt(transcript)}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleSummarizeTranscript(transcript)}
                                        disabled={summarizingTranscriptId === transcript.id}
                                      >
                                        {summarizingTranscriptId === transcript.id ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3 mr-1" />
                                        )}
                                        {transcriptSummaries[transcript.id] ? 'Re-summarize' : 'Summarize'}
                                      </Button>
                                    </div>

                                    {transcriptSummaries[transcript.id] && (
                                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded text-xs">
                                        <p className="text-indigo-700 dark:text-indigo-300 font-medium mb-1">Summary:</p>
                                        <p className="text-indigo-900 dark:text-indigo-100 whitespace-pre-wrap">{transcriptSummaries[transcript.id]}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <ConversationRecorder
                  onConversationUpdate={(segments) => {
                    // Update the selected intake's conversation
                    setIntakes(prev =>
                      prev.map(intake =>
                        intake.id === selectedIntake.id
                          ? { ...intake, conversation: segments }
                          : intake
                      )
                    );
                    // Also update selectedIntake
                    setSelectedIntake(prev =>
                      prev ? { ...prev, conversation: segments } : prev
                    );
                    // Refresh saved transcripts after update
                    setTimeout(() => loadSavedTranscripts(selectedIntake.id), 1000);
                  }}
                  initialSegments={selectedIntake.conversation}
                  saveAudio
                  sessionId={selectedIntake.id}
                  sourceName={`Interview - ${selectedIntake.clientName}`}
                />
              </CardContent>
            </Card>

            {/* Auto Summarization */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Auto Summarization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGeneratingSummary ? (
                  <div className="p-4 bg-secondary/50 rounded-md flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing transcription and generating summary...
                    </p>
                  </div>
                ) : selectedIntake.summary ? (
                  <div className="p-4 bg-secondary/50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedIntake.summary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No summary generated yet. Record an interview or add notes, then generate a summary.
                  </p>
                )}

                <Button
                  onClick={handleGenerateSummary}
                  variant="outline"
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {selectedIntake.summary ? 'Regenerate' : 'Generate'} Summary
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleConvertToCase}
                  className="w-full"
                  disabled={selectedIntake.status === 'CONVERTED'}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Create Matter
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => alert('Request Info action - would send email to client')}
                >
                  Request Info
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDraftEmail}
                  disabled={isGeneratingEmail}
                >
                  {isGeneratingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Draft Confirmation Email
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => alert('Send Document List - would prepare document list')}
                >
                  Send Document List
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>

      {/* New Intake Dialog */}
      <Dialog open={isNewIntakeDialogOpen} onOpenChange={setIsNewIntakeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Intake</DialogTitle>
            <DialogDescription>
              Enter the client information to create a new intake. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clientName">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientName"
                placeholder="John Smith"
                value={newIntakeClientName}
                onChange={(e) => setNewIntakeClientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newIntakeClientName.trim() && newIntakeClientEmail.trim()) {
                    e.preventDefault();
                    handleCreateNewIntake();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientEmail">
                Client Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="john.smith@email.com"
                value={newIntakeClientEmail}
                onChange={(e) => setNewIntakeClientEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newIntakeClientName.trim() && newIntakeClientEmail.trim()) {
                    e.preventDefault();
                    handleCreateNewIntake();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                type="tel"
                placeholder="555-0123"
                value={newIntakeClientPhone}
                onChange={(e) => setNewIntakeClientPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newIntakeClientName.trim() && newIntakeClientEmail.trim()) {
                    e.preventDefault();
                    handleCreateNewIntake();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Legal Category</Label>
              <Input
                id="category"
                placeholder="e.g., Family Law, Corporate Law, Real Estate"
                value={newIntakeCategory}
                onChange={(e) => setNewIntakeCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newIntakeClientName.trim() && newIntakeClientEmail.trim()) {
                    e.preventDefault();
                    handleCreateNewIntake();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewIntakeDialogOpen(false);
                setNewIntakeClientName('');
                setNewIntakeClientEmail('');
                setNewIntakeClientPhone('');
                setNewIntakeCategory('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewIntake}
              disabled={!newIntakeClientName.trim() || !newIntakeClientEmail.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Intake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Draft Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Draft Confirmation Email
            </DialogTitle>
            <DialogDescription>
              {selectedIntake && (
                <>To: <span className="font-medium">{selectedIntake.clientEmail}</span></>
              )}
            </DialogDescription>
          </DialogHeader>

          {isGeneratingEmail ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating email draft...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="emailSubject" className="text-sm font-medium">
                  Subject
                </Label>
                <Input
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBody" className="text-sm font-medium">
                  Body
                </Label>
                <Textarea
                  id="emailBody"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                  placeholder="Email body..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopyEmail}
              disabled={isGeneratingEmail || !emailBody}
              className="gap-2"
            >
              {emailCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenInEmail}
              disabled={isGeneratingEmail || !emailBody}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Open in Email Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
