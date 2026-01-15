'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Plus } from 'lucide-react';

interface IntakeInboxViewProps {
  intakes: any[];
  currentFilter?: string;
}

export function IntakeInboxView({ intakes, currentFilter }: IntakeInboxViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { key: 'all', label: 'All', count: intakes.length },
    { key: 'new', label: 'New', count: intakes.filter(i => i.status === 'NEW').length },
    { key: 'processing', label: 'Processing', count: intakes.filter(i => i.status === 'PROCESSING').length },
    { key: 'needReview', label: 'Need Review', count: intakes.filter(i => i.status === 'NEED_REVIEW').length },
    { key: 'sent', label: 'Sent', count: intakes.filter(i => i.status === 'SENT').length },
    { key: 'archived', label: 'Archived', count: intakes.filter(i => i.status === 'ARCHIVED').length },
  ];

  const filteredIntakes = intakes.filter(intake =>
    intake.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intake.intakeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIntakeClick = (id: string) => {
    router.push(`/${locale}/intake/${id}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Intake Inbox</h1>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          {/* Search */}
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

        {/* Filters */}
        <div className="p-4 border-b border-border space-y-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => router.push(`/${locale}/intake?filter=${filter.key}`)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                currentFilter === filter.key || (!currentFilter && filter.key === 'all')
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
            <div className="p-4 text-center text-muted-foreground">
              <p>No intakes found</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredIntakes.map((intake) => (
                <Card
                  key={intake.id}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleIntakeClick(intake.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{intake.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(intake.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{intake.intakeNumber}</p>
                    </div>
                    <Badge variant={intake.status === 'NEW' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {intake.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Empty State */}
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Select an intake</h2>
          <p className="text-muted-foreground">
            Choose an intake from the list to view details
          </p>
        </div>
      </div>
    </div>
  );
}
