
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Project, ProjectFormData, Domain, ProjectStatus } from '@/lib/types';
import { useProjects } from '@/context/project-context';
import { DOMAIN_LIST, STATUS_CONFIG } from '@/lib/domains';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  description: z.string().min(1, 'Description is required.'),
  deadline: z.date({ required_error: 'Deadline is required.' }),
  importance: z.coerce.number().min(1).max(10),
  size: z.coerce.number().min(0),
  relevance: z.string().min(1, 'Relevance is required.'),
  coverImage: z.string().url().optional().or(z.literal('')),
  domain: z.string().optional(),
  status: z.enum(['active', 'paused', 'done', 'archived']),
  tags: z.string(),
  notes: z.string().optional(),
  manualProgress: z.number().min(0).max(100).optional(),
  useManualProgress: z.boolean()
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
    defaultValues: isEditMode ?
    {
      ...projectToEdit,
      deadline: new Date(projectToEdit.deadline),
      tags: projectToEdit.tags?.join(', ') || '',
      useManualProgress: projectToEdit.manualProgress !== undefined,
      manualProgress: projectToEdit.manualProgress ?? 0
    } : {
      name: '',
      description: '',
      deadline: new Date(),
      importance: 5,
      size: 10,
      relevance: '',
      coverImage: '',
      domain: undefined,
      status: 'active' as ProjectStatus,
      tags: '',
      notes: '',
      manualProgress: 0,
      useManualProgress: false
    }
  });

  const useManualProgress = form.watch('useManualProgress');

  React.useEffect(() => {
    if (isOpen && projectToEdit) {
      form.reset({
        ...projectToEdit,
        deadline: new Date(projectToEdit.deadline),
        tags: projectToEdit.tags?.join(', ') || '',
        useManualProgress: projectToEdit.manualProgress !== undefined,
        manualProgress: projectToEdit.manualProgress ?? 0
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
        domain: undefined,
        status: 'active' as ProjectStatus,
        tags: '',
        notes: '',
        manualProgress: 0,
        useManualProgress: false
      });
    }
  }, [isOpen, projectToEdit, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Parse tags from comma-separated string
    const parsedTags = values.tags.
    split(',').
    map((t) => t.trim().toLowerCase()).
    filter((t) => t.length > 0);

    const projectData: ProjectFormData = {
      name: values.name,
      description: values.description,
      deadline: format(values.deadline, 'yyyy-MM-dd'),
      importance: values.importance,
      size: values.size,
      relevance: values.relevance,
      coverImage: values.coverImage || undefined,
      domain: values.domain as Domain | undefined,
      status: values.status,
      tags: parsedTags,
      notes: values.notes || undefined,
      manualProgress: values.useManualProgress ? values.manualProgress : undefined
    };

    if (isEditMode) {
      updateProject({
        ...projectToEdit,
        ...projectData
      });
    } else {
      addProject(projectData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Project' : 'Create Project'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update the details of your project." : "Add a new project to your dashboard."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="el-61" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
              control={form.control}
              name="name"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., My Awesome Project" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
              } />


                        <div id="el-62" className="grid grid-cols-2 gap-4">
                            <FormField
                control={form.control}
                name="domain"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Domain</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select domain" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {DOMAIN_LIST.map((domain) => {
                        const Icon = domain.icon;
                        return (
                          <SelectItem key={domain.value} value={domain.value}>
                                                            <div id="el-63" className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4" style={{ color: domain.color }} />
                                                                {domain.label}
                                                            </div>
                                                        </SelectItem>);

                      })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                } />


                            <FormField
                control={form.control}
                name="status"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(STATUS_CONFIG).map(([key, config]) =>
                      <SelectItem key={key} value={key}>
                                                        <div id="el-64" className="flex items-center gap-2">
                                                            <div id="el-65"
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }} />

                                                            {config.label}
                                                        </div>
                                                    </SelectItem>
                      )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                } />

                        </div>

                        <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Cover Image URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://images.unsplash.com/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
              } />


                        <FormField
              control={form.control}
              name="description"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="What is this project about?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
              } />


                        <FormField
              control={form.control}
              name="tags"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Tags</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., frontend, urgent, v2" {...field} />
                                    </FormControl>
                                    <FormDescription>Comma-separated tags for filtering</FormDescription>
                                    <FormMessage />
                                </FormItem>
              } />


                        <FormField
              control={form.control}
              name="deadline"
              render={({ field }) =>
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
                        )}>

                                                    {field.value ?
                        format(field.value, "PPP") :

                        <span id="el-66">Pick a date</span>
                        }
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
                      initialFocus />

                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
              } />


                        <div id="el-67" className="grid grid-cols-2 gap-4">
                            <FormField
                control={form.control}
                name="importance"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Importance (1-10)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" max="10" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                } />

                            <FormField
                control={form.control}
                name="size"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Size (hours)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                } />

                        </div>

                        <FormField
              control={form.control}
              name="relevance"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Relevance</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Career goals" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
              } />


                        <FormField
              control={form.control}
              name="notes"
              render={({ field }) =>
              <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                    placeholder="Freeform notes about this project..."
                    className="min-h-[80px]"
                    {...field} />

                                    </FormControl>
                                    <FormDescription>Additional notes separate from description</FormDescription>
                                    <FormMessage />
                                </FormItem>
              } />


                        <div id="el-68" className="space-y-4 p-4 rounded-lg border border-border/50 bg-muted/20">
                            <FormField
                control={form.control}
                name="useManualProgress"
                render={({ field }) =>
                <FormItem className="flex flex-row items-center justify-between">
                                        <div id="el-69" className="space-y-0.5">
                                            <FormLabel>Manual Progress Override</FormLabel>
                                            <FormDescription>
                                                Set progress manually instead of auto-calculating from tasks
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange} />

                                        </FormControl>
                                    </FormItem>
                } />


                            {useManualProgress &&
              <FormField
                control={form.control}
                name="manualProgress"
                render={({ field }) =>
                <FormItem>
                                            <div id="el-70" className="flex justify-between items-center">
                                                <FormLabel>Progress: {field.value}%</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Slider
                      value={[field.value || 0]}
                      onValueChange={(values) => field.onChange(values[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full" />

                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                } />

              }
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Project'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>);

}