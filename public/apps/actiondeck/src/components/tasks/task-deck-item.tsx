import { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

export function TaskDeckItem({ task, onToggle, index }: { task: Task; onToggle: (id: string) => void; index: number}) {
    return (
        <div className={cn(
            "flex items-center space-x-3 p-3 rounded-lg transition-colors border",
             task.completed ? 'bg-background/50 border-border/20' : 'border-accent/80',
             index % 2 !== 0 && !task.completed ? 'bg-accent/20' : 'bg-background',
             'hover:bg-accent/30'
        )}>
            <Checkbox
                id={`task-item-${task.id}`}
                checked={task.completed}
                onCheckedChange={() => onToggle(task.id)}
                aria-labelledby={`task-label-${task.id}`}
            />
            <Label
                id={`task-label-${task.id}`}
                htmlFor={`task-item-${task.id}`}
                className={`flex-1 cursor-pointer transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
                {task.title}
            </Label>
            <Badge 
                variant={task.completed ? 'secondary' : 'default'}
                className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold",
                     task.completed ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                )}
            >
                {index}
            </Badge>
        </div>
    );
}
