'use client';

import { useState } from 'react';
import { useToday, getCurrentMinute } from '@/context/today-context';
import { useProjects } from '@/context/project-context';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, Loader2, Plus, X } from 'lucide-react';
import { handleTodayRecommend } from '@/lib/actions';
import { cn } from '@/lib/utils';

type Recommendation = {
  title: string;
  suggestedStartMinute: number;
  suggestedDurationMinutes: number;
  reasoning: string;
  sourceType: 'project' | 'casual' | 'new';
  sourceId?: string;
};

export function AIRecommendButton() {
  const { items, addItem, isChatOpen } = useToday();
  const { projects } = useProjects();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setRecommendations([]);
    setSummary('');

    try {
      const result = await handleTodayRecommend({
        currentSchedule: items.map((i) => ({
          title: i.title,
          startMinute: i.startMinute,
          durationMinutes: i.durationMinutes,
          completed: i.completed,
        })),
        availableProjects: projects.map((p) => ({
          name: p.name,
          deadline: p.deadline,
          importance: p.importance,
          tasks: p.tasks.map((t) => ({ title: t.title, completed: t.completed })),
        })),
        casualTasks: [], // TODO: Add casual tasks
        currentTimeMinute: getCurrentMinute(),
      });

      if (result.success && result.data) {
        setRecommendations(result.data.recommendations || []);
        setSummary(result.data.overallSuggestion || '');
      }
    } catch (error) {
      console.error('[recommend] Error:', error);
      setSummary('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecommendation = (rec: Recommendation) => {
    addItem({
      title: rec.title,
      startMinute: rec.suggestedStartMinute,
      durationMinutes: rec.suggestedDurationMinutes,
      source: rec.sourceType === 'project' && rec.sourceId
        ? { type: 'project', projectId: rec.sourceId }
        : { type: 'manual' },
      completed: false,
    });

    // Remove from recommendations
    setRecommendations((prev) => prev.filter((r) => r.title !== rec.title));
  };

  const formatTime = (minute: number) => {
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    const displayHour = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  // Don't show if chat is open (to avoid cluttering)
  if (isChatOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          onClick={() => {
            setIsOpen(true);
            if (recommendations.length === 0 && !isLoading) {
              handleGetRecommendations();
            }
          }}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Recommendations
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {summary && (
            <p className="text-sm text-muted-foreground mt-2">{summary}</p>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recommendations available.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleGetRecommendations}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{rec.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(rec.suggestedStartMinute)} ({rec.suggestedDurationMinutes} min)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {rec.reasoning}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleAddRecommendation(rec)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleGetRecommendations}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Recommendations'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
