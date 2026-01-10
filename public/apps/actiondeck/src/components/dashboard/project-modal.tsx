'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Project, Task, Milestone } from '@/lib/types';
import { DomainProgressRing } from './progress-ring';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { PenSquare, Trash2, StickyNote, Clock } from 'lucide-react';
import { useProjects } from '@/context/project-context';
import { ProjectForm } from './project-form';
import { DomainBadge } from './domain-filter-bar';
import { StatusButtons } from './status-select';
import { TagsInput } from './tags-input';
import { MilestoneList } from './milestone-list';
import { DOMAINS } from '@/lib/domains';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
"@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";

export function ProjectModal({ project, isOpen, onOpenChange }: {project: Project;isOpen: boolean;onOpenChange: (isOpen: boolean) => void;}) {
  const { updateProject, deleteProject } = useProjects();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formattedDate, setFormattedDate] = React.useState('');
  const [lastUpdated, setLastUpdated] = React.useState('');
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [localNotes, setLocalNotes] = React.useState(project.notes || '');
  const [notesChanged, setNotesChanged] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (project.deadline) {
        setFormattedDate(new Date(project.deadline).toLocaleDateString());
      }
      if (project.updatedAt) {
        setLastUpdated(formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }));
      }
      setLocalNotes(project.notes || '');
      setNotesChanged(false);
    }
  }, [isOpen, project.deadline, project.updatedAt, project.notes]);

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    updateProject({ ...project, tasks: updatedTasks });
  };

  const completedTasks = project.tasks.filter((task) => task.completed).length;
  const totalTasks = project.tasks.length;
  const taskProgress = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;
  const progress = project.manualProgress !== undefined ? project.manualProgress : taskProgress;

  const domainConfig = project.domain ? DOMAINS[project.domain] : null;
  const progressColor = domainConfig?.color || 'hsl(165, 100%, 45%)';

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const newTask: Task = { id: `ptask-${Date.now()}`, title, completed: false };
    updateProject({ ...project, tasks: [newTask, ...project.tasks] });
    setNewTaskTitle('');
  };

  const handleStatusChange = (status: typeof project.status) => {
    updateProject({ ...project, status });
  };

  const handleTagsChange = (tags: string[]) => {
    updateProject({ ...project, tags });
  };

  const handleMilestonesChange = (milestones: Milestone[]) => {
    updateProject({ ...project, milestones });
  };

  const handleNotesBlur = () => {
    if (notesChanged && localNotes !== project.notes) {
      updateProject({ ...project, notes: localNotes || undefined });
      setNotesChanged(false);
    }
  };

  const handleManualProgressChange = (value: number[]) => {
    updateProject({ ...project, manualProgress: value[0] });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col modal-panel">
          <SheetHeader className="p-6 pb-2 modal-header">
            {/* Domain and Status Row */}
            <div id="el-86" className="flex items-center gap-2 mb-2">
              {project.domain &&
              <DomainBadge domain={project.domain} size="small" />
              }
            </div>

            <SheetTitle className="font-headline text-3xl text-primary">{project.name}</SheetTitle>
            <SheetDescription>{project.description}</SheetDescription>

            {/* Metadata badges */}
            <div id="el-87" className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline">Due: {formattedDate}</Badge>
              <Badge variant="outline">Importance: {project.importance}/10</Badge>
              <Badge variant="outline">Size: {project.size} hrs</Badge>
              {lastUpdated &&
              <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastUpdated}
                </Badge>
              }
            </div>

            {/* Status quick-change */}
            <div id="el-88" className="pt-3">
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <StatusButtons
                value={project.status}
                onChange={handleStatusChange} />

            </div>
          </SheetHeader>

          <div id="el-89" className="flex-grow overflow-y-auto p-6 space-y-6">
            {/* Progress Overview */}
            <div id="el-90" className="flex items-center justify-between">
              <div id="el-91">
                <div id="el-92" className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                  <h3 id="el-93" className="text-lg font-medium text-foreground">Progress</h3>
                </div>
                {project.manualProgress !== undefined ?
                <span id="el-94" className="text-sm text-muted-foreground">Manual: {Math.round(progress)}%</span> :

                <span id="el-95" className="text-sm text-muted-foreground">Tasks: {completedTasks}/{totalTasks}</span>
                }
              </div>
              <DomainProgressRing
                progress={progress}
                size={72}
                strokeWidth={6}
                color={progressColor}
                showLabel={true} />

            </div>

            {/* Manual Progress Override */}
            {project.manualProgress !== undefined &&
            <div id="el-96" className="space-y-2">
                <Label className="text-sm">Adjust Manual Progress</Label>
                <Slider
                value={[project.manualProgress]}
                onValueChange={handleManualProgressChange}
                min={0}
                max={100}
                step={1} />

              </div>
            }

            <Separator />

            {/* Tags */}
            <div id="el-97">
              <Label className="text-sm font-medium mb-2 block">Tags</Label>
              <TagsInput
                tags={project.tags}
                onChange={handleTagsChange} />

            </div>

            <Separator />

            {/* Accordion for organized sections */}
            <Accordion type="multiple" defaultValue={['milestones', 'tasks']} className="w-full">
              {/* Milestones Section */}
              <AccordionItem value="milestones">
                <AccordionTrigger>
                  Milestones ({project.milestones.filter((m) => m.completed).length}/{project.milestones.length})
                </AccordionTrigger>
                <AccordionContent>
                  <MilestoneList
                    milestones={project.milestones}
                    onChange={handleMilestonesChange} />

                </AccordionContent>
              </AccordionItem>

              {/* Tasks Section */}
              <AccordionItem value="tasks">
                <AccordionTrigger>
                  Tasks ({completedTasks}/{totalTasks})
                </AccordionTrigger>
                <AccordionContent>
                  <form id="el-98" onSubmit={handleAddTask} className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add task to this project..."
                      value={newTaskTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskTitle(e.target.value)} />

                    <Button type="submit" variant="secondary">Add</Button>
                  </form>
                  <div id="el-99" className="space-y-2 max-h-[300px] overflow-y-auto">
                    {project.tasks.length === 0 ?
                    <p id="el-100" className="text-sm text-muted-foreground text-center py-4">
                        No tasks yet. Add your first task above.
                      </p> :

                    project.tasks.map((task) =>
                    <div id="el-101" key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                          <Checkbox
                        id={`modal-task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(task.id)} />

                          <Label
                        htmlFor={`modal-task-${task.id}`}
                        className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}>

                            {task.title}
                          </Label>
                        </div>
                    )
                    }
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Notes Section */}
              <AccordionItem value="notes">
                <AccordionTrigger>
                  <div id="el-102" className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Notes
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    placeholder="Add freeform notes here..."
                    value={localNotes}
                    onChange={(e) => {
                      setLocalNotes(e.target.value);
                      setNotesChanged(true);
                    }}
                    onBlur={handleNotesBlur}
                    className="min-h-[120px]" />

                  {notesChanged &&
                  <p id="el-103" className="text-xs text-muted-foreground mt-1">
                      Notes will save when you click away
                    </p>
                  }
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <SheetFooter className='p-6 pt-0 grid grid-cols-2 gap-2 modal-footer'>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    project and all of its tasks and milestones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    deleteProject(project.id);
                    onOpenChange(false);
                  }}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" className="w-full btn-outline-glass" onClick={() => setIsFormOpen(true)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ProjectForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        projectToEdit={project} />

    </>);

}