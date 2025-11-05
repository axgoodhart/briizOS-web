'use client'

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Project, Task } from '@/lib/types';
import { ProgressChart } from './progress-chart';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { Input } from '@/components/ui/input';
import { PenSquare, Trash2 } from 'lucide-react';
import { useProjects } from '@/context/project-context';
import { ProjectForm } from './project-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ProjectModal({ project, isOpen, onOpenChange }: { project: Project; isOpen: boolean, onOpenChange: (isOpen: boolean) => void; }) {
    const { updateProject, deleteProject } = useProjects();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [formattedDate, setFormattedDate] = React.useState('');
    const [newTaskTitle, setNewTaskTitle] = React.useState('');

    React.useEffect(() => {
        if (isOpen && project.deadline) {
            setFormattedDate(new Date(project.deadline).toLocaleDateString());
        }
    }, [isOpen, project.deadline]);

    const handleToggleTask = (taskId: string) => {
        const updatedTasks = project.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        updateProject({ ...project, tasks: updatedTasks });
    };

    const completedTasks = project.tasks.filter((task) => task.completed).length;
    const totalTasks = project.tasks.length;

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        const title = newTaskTitle.trim();
        if (!title) return;
        const newTask: Task = { id: `ptask-${Date.now()}`, title, completed: false };
        updateProject({ ...project, tasks: [newTask, ...project.tasks] });
        setNewTaskTitle('');
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col modal-panel">
                    <SheetHeader className="p-6 pb-2 modal-header">
                        <SheetTitle className="font-headline text-3xl text-primary">{project.name}</SheetTitle>
                        <SheetDescription>{project.description}</SheetDescription>
                        <div className="flex gap-2 pt-2">
                            <Badge variant="outline">Due: {formattedDate}</Badge>
                            <Badge variant="outline">Importance: {project.importance}/10</Badge>
                            <Badge variant="outline">Size: {project.size} hrs</Badge>
                        </div>
                    </SheetHeader>
                    <div className="flex-grow overflow-y-auto p-6 space-y-6">
                        <div>
                             <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                                <h3 className="text-lg font-medium text-foreground">Progress Overview</h3>
                                <span>({completedTasks}/{totalTasks})</span>
                            </div>
                            <ProgressChart tasks={project.tasks} />
                        </div>
                        <Separator />
                        <div>
                            <h3 className="text-lg font-medium mb-4">Tasks</h3>
                            <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
                                <Input placeholder="Add task to this project…" value={newTaskTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskTitle(e.target.value)} />
                                <Button type="submit" variant="secondary">Add</Button>
                            </form>
                            <div className="space-y-3">
                                {project.tasks.map(task => (
                                    <div key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`modal-task-${task.id}`}
                                            checked={task.completed}
                                            onCheckedChange={() => handleToggleTask(task.id)}
                                        />
                                        <Label htmlFor={`modal-task-${task.id}`} className={`flex-1 cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {task.title}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                    project and all of its tasks.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteProject(project.id)}>
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
                projectToEdit={project}
            />
        </>
    );
}
