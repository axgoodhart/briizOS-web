
'use client'

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Project, ProjectFormData } from '@/lib/types';
import { useProjects } from '@/context/project-context';

const formSchema = z.object({
    name: z.string().min(1, 'Project name is required.'),
    description: z.string().min(1, 'Description is required.'),
    deadline: z.date({ required_error: 'Deadline is required.' }),
    importance: z.coerce.number().min(1).max(10),
    size: z.coerce.number().min(0),
    relevance: z.string().min(1, 'Relevance is required.'),
    coverImage: z.string().url().optional().or(z.literal('')),
});


interface ProjectFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    projectToEdit?: Project;
}

export function ProjectForm({ isOpen, onOpenChange, projectToEdit }: ProjectFormProps) {
    const { addProject, updateProject } = useProjects();
    const isEditMode = !!projectToEdit;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: isEditMode
            ? {
                ...projectToEdit,
                deadline: new Date(projectToEdit.deadline),
            } : {
                name: '',
                description: '',
                deadline: new Date(),
                importance: 5,
                size: 10,
                relevance: '',
                coverImage: '',
            },
    });

    React.useEffect(() => {
        if (isOpen && projectToEdit) {
            form.reset({
                ...projectToEdit,
                deadline: new Date(projectToEdit.deadline),
            });
        }
        if (isOpen && !projectToEdit) {
            form.reset({
                name: '',
                description: '',
                deadline: new Date(),
                importance: 5,
                size: 10,
                relevance: '',
                coverImage: '',
            });
        }
    }, [isOpen, projectToEdit, form]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        const projectData = {
            ...values,
            deadline: format(values.deadline, 'yyyy-MM-dd'),
            coverImage: values.coverImage || undefined,
        };

        if (isEditMode) {
            updateProject({
                ...projectToEdit,
                ...projectData,
            });
        } else {
            addProject(projectData);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Project' : 'Create Project'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update the details of your project." : "Add a new project to your dashboard."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., My Awesome Project" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="coverImage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cover Image URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://images.unsplash.com/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="What is this project about?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="deadline"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Deadline</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="importance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Importance (1-10)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="1" max="10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="size"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estimated Size (hours)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="relevance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Relevance</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Career goals" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Project'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
