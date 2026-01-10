import { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function TaskItem({ task, onToggle, onDelete }: {task: Task; onToggle: (id: string) => void; onDelete?: () => void;}) {
  return (
    <div id="el-188" className="tasks-item group flex items-center space-x-3 p-3 rounded-lg transition-colors bg-background hover:bg-muted/50 border">
            <Checkbox
        id={`task-item-${task.id}`}
        className="tasks-item-checkbox"
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        aria-labelledby={`task-label-${task.id}`} />

            <Label
        id={`task-label-${task.id}`}
        htmlFor={`task-item-${task.id}`}
        className={`tasks-item-label flex-1 cursor-pointer transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>

                {task.title}
            </Label>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label="Delete task">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
        </div>);

}
