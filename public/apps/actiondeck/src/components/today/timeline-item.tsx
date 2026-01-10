'use client';

import { useState, useRef, useCallback } from 'react';
import { useToday } from '@/context/today-context';
import type { TodayItem } from '@/lib/types';
import { minuteToPixel, pixelToMinute } from './timeline-view';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const PIXELS_PER_HOUR = 64;
const MIN_DURATION = 15; // minutes

interface TimelineItemProps {
  item: TodayItem;
}

export function TimelineItem({ item }: TimelineItemProps) {
  const { updateItem, deleteItem, toggleItemComplete } = useToday();
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragState, setDragState] = useState({ startY: 0, startMinute: 0 });
  const [resizeState, setResizeState] = useState({ startY: 0, startDuration: 0 });

  const top = minuteToPixel(item.startMinute);
  const height = (item.durationMinutes / 60) * PIXELS_PER_HOUR;

  // Format time for display
  const formatTime = (minute: number) => {
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    const displayHour = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const startTime = formatTime(item.startMinute);
  const endTime = formatTime(item.startMinute + item.durationMinutes);

  // Drag handlers
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragState({
      startY: e.clientY,
      startMinute: item.startMinute,
    });
  }, [item.startMinute, isResizing]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaY = e.clientY - dragState.startY;
    const deltaMinutes = Math.round((deltaY / PIXELS_PER_HOUR) * 60 / 15) * 15;
    const newStartMinute = Math.max(0, Math.min(1440 - item.durationMinutes, dragState.startMinute + deltaMinutes));

    if (newStartMinute !== item.startMinute) {
      updateItem({ ...item, startMinute: newStartMinute });
    }
  }, [isDragging, dragState, item, updateItem]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }, [isDragging]);

  // Resize handlers (bottom edge)
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
    setResizeState({
      startY: e.clientY,
      startDuration: item.durationMinutes,
    });
  }, [item.durationMinutes]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    e.preventDefault();

    const deltaY = e.clientY - resizeState.startY;
    const deltaMinutes = Math.round((deltaY / PIXELS_PER_HOUR) * 60 / 15) * 15;
    const newDuration = Math.max(MIN_DURATION, resizeState.startDuration + deltaMinutes);

    if (newDuration !== item.durationMinutes) {
      updateItem({ ...item, durationMinutes: newDuration });
    }
  }, [isResizing, resizeState, item, updateItem]);

  const handleResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizing(false);
  }, [isResizing]);

  // Get source indicator color
  const getSourceColor = () => {
    if (item.color) return item.color;
    switch (item.source.type) {
      case 'project': return 'hsl(var(--primary))';
      case 'casual': return 'hsl(var(--secondary))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <div
      ref={itemRef}
      className={cn(
        'today-time-block absolute left-0 right-0 rounded-lg border p-2 group transition-shadow',
        isDragging && 'shadow-xl z-30 opacity-90',
        isResizing && 'z-30',
        item.completed && 'opacity-50'
      )}
      style={{
        top,
        height: Math.max(height, 24),
        borderLeftWidth: 3,
        borderLeftColor: getSourceColor(),
        background: item.completed
          ? 'linear-gradient(to bottom, hsla(210, 20%, 25%, 0.3), hsla(210, 20%, 20%, 0.2))'
          : 'linear-gradient(to bottom, hsla(165, 100%, 45%, 0.15), hsla(165, 100%, 35%, 0.08))',
      }}
    >
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex items-start gap-2 pl-5 pr-8">
        <Checkbox
          checked={item.completed}
          onCheckedChange={() => toggleItemComplete(item.id)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className={cn(
            'font-medium text-sm truncate',
            item.completed && 'line-through text-muted-foreground'
          )}>
            {item.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {startTime} - {endTime}
          </div>
        </div>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={() => deleteItem(item.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      {/* Resize handle (bottom) */}
      <div
        className="absolute left-2 right-2 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      >
        <div className="w-8 h-1 bg-muted-foreground/50 rounded mx-auto mt-0.5" />
      </div>
    </div>
  );
}
