import { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function TaskItem({ task, onToggle }: { task: Task; onToggle: (id: string) => void; }) {
    return (
        <div className="flex items-center space-x-3 p-3 rounded-lg transition-colors bg-background hover:bg-muted/50 border">
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
        </div>
    );
}
