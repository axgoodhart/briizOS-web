'use client';

import { useEffect, useRef, useState } from 'react';
import { useToday, getCurrentMinute } from '@/context/today-context';
import { Card, CardContent } from '@/components/ui/card';
import { TimelineItem } from './timeline-item';
import { cn } from '@/lib/utils';

// Timeline configuration
const START_HOUR = 6;  // 6 AM
const END_HOUR = 23;   // 11 PM
const PIXELS_PER_HOUR = 64;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIMELINE_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR;

// Convert minute to pixel position
export function minuteToPixel(minute: number): number {
  const adjustedMinute = minute - (START_HOUR * 60);
  return (adjustedMinute / 60) * PIXELS_PER_HOUR;
}

// Convert pixel position to minute
export function pixelToMinute(pixel: number): number {
  const minute = (pixel / PIXELS_PER_HOUR) * 60 + (START_HOUR * 60);
  // Snap to 15-minute intervals
  return Math.round(minute / 15) * 15;
}

export function TimelineView() {
  const { items, isLoading, isToday } = useToday();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  // Update current time indicator
  useEffect(() => {
    const updateCurrentTime = () => {
      if (isToday) {
        const minute = getCurrentMinute();
        if (minute >= START_HOUR * 60 && minute <= END_HOUR * 60) {
          setCurrentTimePosition(minuteToPixel(minute));
        } else {
          setCurrentTimePosition(null);
        }
      } else {
        setCurrentTimePosition(null);
      }
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isToday]);

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current && currentTimePosition !== null) {
      const scrollTo = Math.max(0, currentTimePosition - 100);
      containerRef.current.scrollTop = scrollTo;
    }
  }, [currentTimePosition]);

  // Generate hour markers
  const hourMarkers = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const displayHour = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    hourMarkers.push(
      <div
        key={hour}
        className="today-hour-marker absolute left-0 right-0 flex items-start"
        style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR }}
      >
        <span className="w-16 text-xs text-muted-foreground pr-2 text-right flex-shrink-0">
          {displayHour} {ampm}
        </span>
        <div className="flex-1 border-t border-border/30 mt-2" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card className="today-timeline-card flex-1">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="today-timeline-card flex-1 overflow-hidden">
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="today-timeline-scroll overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 320px)' }}
        >
          <div
            className="today-timeline relative ml-16"
            style={{ height: TIMELINE_HEIGHT, minHeight: TIMELINE_HEIGHT }}
          >
            {/* Hour markers */}
            <div className="absolute inset-0 -ml-16">
              {hourMarkers}
            </div>

            {/* Current time indicator */}
            {currentTimePosition !== null && (
              <div
                className="today-current-time-indicator absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="relative">
                  <div className="absolute -left-16 -top-2 w-3 h-3 rounded-full bg-destructive" />
                  <div className="h-0.5 bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
              </div>
            )}

            {/* Schedule items */}
            <div className="absolute inset-0 pr-4">
              {items.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </div>

            {/* Empty state */}
            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p className="text-center">
                  No items scheduled.<br />
                  <span className="text-sm">Add something above or pull from your tasks.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
