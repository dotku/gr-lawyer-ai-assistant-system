'use client';

import { useState, useEffect } from 'react';
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

  const handleGenerateSummary = () => {
    if (!selectedIntake) return;

    const summary = `Client ${selectedIntake.clientName} has contacted regarding ${
      selectedIntake.category || 'legal matters'
    }. Initial intake completed with ${selectedIntake.questions.length} questions addressed and ${
      selectedIntake.schedules.length
    } meetings scheduled.`;

    setIntakes(prev =>
      prev.map(i => (i.id === selectedIntake.id ? { ...i, summary } : i))
    );

    setSelectedIntake((prev) => prev ? ({ ...prev, summary }) : null);
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
                <CardTitle className="flex items-center text-lg">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Interview Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  }}
                  initialSegments={selectedIntake.conversation}
                  speakerALabel="Lawyer"
                  speakerBLabel="Client"
                  saveAudio
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
                {selectedIntake.summary ? (
                  <div className="p-4 bg-secondary/50 rounded-md">
                    <p className="text-sm">{selectedIntake.summary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No summary generated yet
                  </p>
                )}

                <Button onClick={handleGenerateSummary} variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
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
                  onClick={() =>
                    alert('Draft Confirmation Email - would open email composer')
                  }
                >
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
    </div>
  );
}
