'use client';

import { useToday, getTodayDateString } from '@/context/today-context';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

export function DateNavigator() {
  const { currentDate, setCurrentDate, goToToday, isToday } = useToday();

  const parsedDate = parseISO(currentDate);
  const displayDate = format(parsedDate, 'EEEE, MMMM d, yyyy');

  const navigateDay = (offset: number) => {
    const newDate = addDays(parsedDate, offset);
    setCurrentDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateDay(-1)}
        title="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[200px] justify-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{displayDate}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateDay(1)}
        title="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="ml-2"
        >
          Today
        </Button>
      )}
    </div>
  );
}
