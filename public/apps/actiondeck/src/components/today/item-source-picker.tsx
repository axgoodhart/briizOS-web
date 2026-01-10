'use client';

import { useState, useMemo } from 'react';
import { useToday, getCurrentMinute } from '@/context/today-context';
import { useProjects } from '@/context/project-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import type { Task } from '@/lib/types';

interface ItemSourcePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SelectableTask = Task & {
  projectId?: string;
  projectName?: string;
  sourceType: 'project' | 'casual';
};

export function ItemSourcePicker({ open, onOpenChange }: ItemSourcePickerProps) {
  const { addItem, items } = useToday();
  const { projects } = useProjects();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get all uncompleted tasks from projects
  const projectTasks = useMemo(() => {
    const tasks: SelectableTask[] = [];
    for (const project of projects) {
      for (const task of project.tasks) {
        if (!task.completed) {
          tasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
            sourceType: 'project',
          });
        }
      }
    }
    return tasks;
  }, [projects]);

  // Filter tasks by search
  const filteredProjectTasks = useMemo(() => {
    if (!search.trim()) return projectTasks;
    const lower = search.toLowerCase();
    return projectTasks.filter(
      (t) => t.title.toLowerCase().includes(lower) ||
             t.projectName?.toLowerCase().includes(lower)
    );
  }, [projectTasks, search]);

  // Find next available start time
  const getNextAvailableStart = (): number => {
    const currentMinute = getCurrentMinute();

    if (items.length === 0) {
      return Math.ceil(currentMinute / 15) * 15;
    }

    const sortedItems = [...items].sort((a, b) => a.startMinute - b.startMinute);
    const lastItem = sortedItems[sortedItems.length - 1];
    const lastEndTime = lastItem.startMinute + lastItem.durationMinutes;

    const startAfter = Math.max(currentMinute, lastEndTime);
    return Math.ceil(startAfter / 15) * 15;
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAddSelected = () => {
    let startMinute = getNextAvailableStart();

    // Add all selected tasks
    for (const task of filteredProjectTasks) {
      if (selectedIds.has(task.id)) {
        addItem({
          title: task.title,
          startMinute,
          durationMinutes: 60, // Default 1 hour
          source: task.sourceType === 'project'
            ? { type: 'project', projectId: task.projectId!, taskId: task.id }
            : { type: 'casual', taskId: task.id },
          completed: false,
        });
        startMinute += 60; // Stack items
      }
    }

    setSelectedIds(new Set());
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from Existing Tasks</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="projects" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">From Projects</TabsTrigger>
            <TabsTrigger value="casual" disabled>Casual Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {filteredProjectTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No uncompleted tasks found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredProjectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleSelection(task.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={() => toggleSelection(task.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {task.projectName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="casual">
            <p className="text-center text-muted-foreground py-8">
              Casual task import coming soon
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
          >
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
