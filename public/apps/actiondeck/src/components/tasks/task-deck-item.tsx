import { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Trash2 } from 'lucide-react';

export function TaskDeckItem({ task, onToggle, onDelete, index }: {task: Task; onToggle: (id: string) => void; onDelete?: () => void; index: number;}) {
  return (
    <div id="el-179" className={cn(
      "group flex items-center space-x-3 p-3 rounded-lg transition-colors border",
      task.completed ? 'bg-background/50 border-border/20' : 'border-accent/80',
      index % 2 !== 0 && !task.completed ? 'bg-accent/20' : 'bg-background',
      'hover:bg-accent/30'
    )}>
            <Checkbox
        id={`task-item-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        aria-labelledby={`task-label-${task.id}`} />

            <Label
        id={`task-label-${task.id}`}
        htmlFor={`task-item-${task.id}`}
        className={`flex-1 cursor-pointer transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>

                {task.title}
            </Label>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label="Delete task">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}

            <Badge
        variant={task.completed ? 'secondary' : 'default'}
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold",
          task.completed ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
        )}>

                {index}
            </Badge>
        </div>);

}
