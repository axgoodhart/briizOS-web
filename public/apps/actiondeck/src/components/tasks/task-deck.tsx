'use client';
import React, { useState } from 'react';
import { TaskDeck as TaskDeckType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskDeckItem } from './task-deck-item';
import { cn } from '@/lib/utils';

interface TaskDeckProps {
  deck: TaskDeckType;
  onToggleTask: (taskId: string, deckId: string) => void;
}

export function TaskDeck({ deck, onToggleTask }: TaskDeckProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedTasks = deck.tasks.filter(t => t.completed).length;
  const allTasksCompleted = completedTasks === deck.tasks.length;

  const toggleExpansion = () => setIsExpanded(!isExpanded);

  return (
    <div className={cn("py-2", allTasksCompleted && 'opacity-50')}>
      <div className="flex items-center gap-2 mb-2">
         <Button
          variant="ghost"
          size="icon"
          onClick={toggleExpansion}
          className="h-7 w-7"
        >
          <Plus className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-45")} />
           <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} deck</span>
        </Button>

        <div className="flex-grow cursor-pointer" onClick={toggleExpansion}>
          <h3 
            className={cn(
              "font-semibold transition-all text-base",
              allTasksCompleted && 'line-through',
              isExpanded ? 'text-foreground' : 'text-muted-foreground'
            )} 
          >
            {deck.title}
          </h3>
        </div>
        
        <p className="text-xs text-muted-foreground">
            {completedTasks} / {deck.tasks.length}
        </p>

      </div>
      
      <div className={cn("task-deck pl-9")} data-state={isExpanded ? 'expanded' : 'collapsed'}>
        {deck.tasks.map((task, index) => (
          <div key={task.id} className="task-deck-item">
            <TaskDeckItem
              task={task}
              onToggle={() => onToggleTask(task.id, deck.id)}
              index={index + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
