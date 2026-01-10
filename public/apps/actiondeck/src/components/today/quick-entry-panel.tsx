'use client';

import { useState } from 'react';
import { useToday, getCurrentMinute } from '@/context/today-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo } from 'lucide-react';
import { ItemSourcePicker } from './item-source-picker';

const DEFAULT_DURATION = 30; // minutes - user can resize on timeline

export function QuickEntryPanel() {
  const { addItem, items } = useToday();
  const [title, setTitle] = useState('');
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  // Find the next available time slot (after the last item or current time)
  const getNextAvailableStart = (): number => {
    const currentMinute = getCurrentMinute();

    if (items.length === 0) {
      // Round up to next 15-minute mark
      return Math.ceil(currentMinute / 15) * 15;
    }

    // Find the end of the last scheduled item
    const sortedItems = [...items].sort((a, b) => a.startMinute - b.startMinute);
    const lastItem = sortedItems[sortedItems.length - 1];
    const lastEndTime = lastItem.startMinute + lastItem.durationMinutes;

    // Use whichever is later: current time or last item end
    const startAfter = Math.max(currentMinute, lastEndTime);
    return Math.ceil(startAfter / 15) * 15;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startMinute = getNextAvailableStart();

    addItem({
      title: title.trim(),
      startMinute,
      durationMinutes: DEFAULT_DURATION,
      source: { type: 'manual' },
      completed: false,
    });

    setTitle('');
  };

  return (
    <>
      <Card className="today-entry-card">
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Input
              placeholder="What's on your plate today?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!title.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowSourcePicker(true)}
              title="Pull from existing tasks"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <ItemSourcePicker
        open={showSourcePicker}
        onOpenChange={setShowSourcePicker}
      />
    </>
  );
}
