'use client';

import { TodayProvider } from '@/context/today-context';
import { QuickEntryPanel } from './quick-entry-panel';
import { TimelineView } from './timeline-view';
import { AIChatPanel } from './ai-chat-panel';
import { AIRecommendButton } from './ai-recommend-button';
import { DateNavigator } from './date-navigator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TodayPageContent() {
  return (
    <TodayProvider>
      <div className="today-page flex flex-col gap-4 relative">
        {/* Header with date navigation */}
        <Card className="today-header-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-headline">Today</CardTitle>
                <CardDescription>Plan your day, get AI recommendations</CardDescription>
              </div>
              <DateNavigator />
            </div>
          </CardHeader>
        </Card>

        {/* Main content area */}
        <div className="flex gap-4 flex-1">
          {/* Left column: Entry + Timeline */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Quick entry panel */}
            <QuickEntryPanel />

            {/* Timeline */}
            <TimelineView />
          </div>

          {/* Right column: AI Chat (collapsible) */}
          <AIChatPanel />
        </div>

        {/* Floating AI recommend button */}
        <AIRecommendButton />
      </div>
    </TodayProvider>
  );
}
