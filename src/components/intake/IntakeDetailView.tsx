'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Star, Calendar, FileQuestion, StickyNote, Sparkles, ArrowRight } from 'lucide-react';
import {
  addIntakeSchedule,
  addIntakeNotice,
  addIntakeQuestion,
  addIntakeNote,
  generateIntakeSummary,
  convertIntakeToCase,
} from '@/app/actions/intake';

interface IntakeDetailViewProps {
  intake: any;
  allIntakes: any[];
}

export function IntakeDetailView({ intake, allIntakes }: IntakeDetailViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Form states
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleMeetingLink, setScheduleMeetingLink] = useState('');
  const [scheduleType, setScheduleType] = useState('zoom');

  const [noticeContent, setNoticeContent] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const handleIntakeClick = (id: string) => {
    router.push(`/${locale}/intake/${id}`);
  };

  const handleAddSchedule = () => {
    if (!scheduleTitle || !scheduleDate || !scheduleTime) return;

    startTransition(async () => {
      await addIntakeSchedule(intake.id, {
        title: scheduleTitle,
        date: new Date(scheduleDate),
        time: scheduleTime,
        meetingLink: scheduleMeetingLink,
        type: scheduleType,
      });
      setScheduleTitle('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleMeetingLink('');
      router.refresh();
    });
  };

  const handleAddNotice = () => {
    if (!noticeContent) return;

    startTransition(async () => {
      await addIntakeNotice(intake.id, { content: noticeContent });
      setNoticeContent('');
      router.refresh();
    });
  };

  const handleAddQuestion = () => {
    if (!questionText) return;

    startTransition(async () => {
      await addIntakeQuestion(intake.id, { question: questionText });
      setQuestionText('');
      router.refresh();
    });
  };

  const handleAddNote = () => {
    if (!noteContent) return;

    startTransition(async () => {
      await addIntakeNote(intake.id, { content: noteContent });
      setNoteContent('');
      router.refresh();
    });
  };

  const handleGenerateSummary = () => {
    startTransition(async () => {
      await generateIntakeSummary(intake.id);
      router.refresh();
    });
  };

  const handleConvertToCase = () => {
    startTransition(async () => {
      const newCase = await convertIntakeToCase(intake.id);
      router.push(`/${locale}/matter/${newCase.id}`);
    });
  };

  const filteredIntakes = allIntakes.filter(i =>
    i.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.intakeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Intake List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Intake Inbox</h1>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search intakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {filteredIntakes.map((item) => (
              <Card
                key={item.id}
                className={`p-3 cursor-pointer transition-colors ${
                  item.id === intake.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
                onClick={() => handleIntakeClick(item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{item.intakeNumber}</p>
                  </div>
                  <Badge variant={item.status === 'NEW' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                    {item.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Intake Detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header with Case Number and Tags */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold">{intake.intakeNumber}</h2>
              <Badge variant={intake.status === 'CONVERTED' ? 'default' : 'secondary'}>
                {intake.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {intake.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
              {intake.category && (
                <Badge variant="secondary">{intake.category}</Badge>
              )}
            </div>

            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <span className="flex items-center">
                <span className="mr-2">🔒</span>
                {intake.shareSettings}
              </span>
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
              {intake.schedules.map((schedule: any) => (
                <div key={schedule.id} className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium">{schedule.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(schedule.date).toLocaleDateString()} at {schedule.time}
                    </p>
                    {schedule.meetingLink && (
                      <a href={schedule.meetingLink} className="text-sm text-primary hover:underline">
                        {schedule.type === 'zoom' ? 'Zoom Link' : 'Meeting Link'}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Input
                  placeholder="Meeting title"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Meeting link (optional)"
                  value={scheduleMeetingLink}
                  onChange={(e) => setScheduleMeetingLink(e.target.value)}
                />
                <Button onClick={handleAddSchedule} size="sm" disabled={isPending}>
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
              {intake.notices.map((notice: any) => (
                <div key={notice.id} className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-md">
                  {notice.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  <p className="flex-1 text-sm">{notice.content}</p>
                </div>
              ))}

              <div className="space-y-2">
                <Textarea
                  placeholder="Add a notice..."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleAddNotice} size="sm" disabled={isPending}>
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
              {intake.questions.map((question: any, index: number) => (
                <div key={question.id} className="p-3 bg-secondary/50 rounded-md">
                  <p className="font-medium text-sm">{index + 1}. {question.question}</p>
                  {question.answer && (
                    <p className="text-sm text-muted-foreground mt-2">A: {question.answer}</p>
                  )}
                </div>
              ))}

              <div className="space-y-2">
                <Input
                  placeholder="Add a question..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                />
                <Button onClick={handleAddQuestion} size="sm" disabled={isPending}>
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
              {intake.notes.map((note: any) => (
                <div key={note.id} className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    By {note.author.name} on {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}

              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm" disabled={isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
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
              {intake.summary ? (
                <div className="p-4 bg-secondary/50 rounded-md">
                  <p className="text-sm">{intake.summary}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No summary generated yet</p>
              )}

              <Button onClick={handleGenerateSummary} variant="outline" disabled={isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                {intake.summary ? 'Regenerate' : 'Generate'} Summary
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
                disabled={isPending || intake.status === 'CONVERTED'}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Create Matter
              </Button>
              <Button variant="outline" className="w-full" disabled={isPending}>
                Request Info
              </Button>
              <Button variant="outline" className="w-full" disabled={isPending}>
                Draft Confirmation Email
              </Button>
              <Button variant="outline" className="w-full" disabled={isPending}>
                Send Document List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
