'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { handlePrioritization } from '@/lib/actions';
import { useProjects } from '@/context/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PrioritizationResult } from './prioritization-result';
import type { PrioritizeProjectsOutput } from '@/ai/flows/intelligent-project-prioritization';

const formSchema = z.object({
  projectIds: z.array(z.string()).min(1, 'Please select at least one project.'),
  userGoals: z.string().min(10, 'Please describe your goals in at least 10 characters.'),
  timing: z.string().min(10, 'Please describe the timing/context in at least 10 characters.')
});

export function PrioritizationForm() {
  const { projects } = useProjects();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PrioritizeProjectsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectIds: projects.map((p) => p.id),
      userGoals: 'I want to improve my skills and build something impressive for my portfolio.',
      timing: 'I want to decide what to focus on for the next quarter.'
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const selectedProjects = projects.filter((p) => values.projectIds.includes(p.id));

    try {
      const response = await handlePrioritization({
        projects: selectedProjects.map(({ name, deadline, importance, size, relevance }) => ({ name, deadline, importance, size, relevance })),
        userGoals: values.userGoals,
        timing: values.timing
      });
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'An unknown error occurred.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div id="el-158" className="grid md:grid-cols-2 gap-8 items-start">
            <Card id="prioritize-form-card">
                <CardHeader>
                    <CardTitle>Create Prioritization Request</CardTitle>
                    <CardDescription>Fill out the details below to get an AI-powered recommendation.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form id="prioritize-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                control={form.control}
                name="projectIds"
                render={() =>
                <FormItem>
                                        <div id="el-159" className="mb-4">
                                            <FormLabel className="text-base">Projects to Prioritize</FormLabel>
                                            <FormDescription>Select which of your projects to include in the analysis.</FormDescription>
                                        </div>
                                        <div id="prioritize-project-checkboxes" className="space-y-2">
                                            {projects.map((project) =>
                    <FormField
                      key={project.id}
                      control={form.control}
                      name="projectIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={project.id}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">

                                                                <FormControl>
                                                                    <Checkbox
                                checked={field.value?.includes(project.id)}
                                onCheckedChange={(checked) => {
                                  return checked ?
                                  field.onChange([...(field.value || []), project.id]) :
                                  field.onChange(
                                    field.value?.filter(
                                      (value) => value !== project.id
                                    ) || []
                                  );
                                }} />

                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    {project.name}
                                                                </FormLabel>
                                                            </FormItem>);

                      }} />

                    )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                } />

                            <FormField
                control={form.control}
                name="userGoals"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Your Goals</FormLabel>
                                        <FormControl>
                                            <Textarea id="prioritize-goals-input" placeholder="e.g., Learn a new skill for career growth, improve my health..." {...field} />
                                        </FormControl>
                                        <FormDescription>What are you trying to achieve right now?</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                } />

                            <FormField
                control={form.control}
                name="timing"
                render={({ field }) =>
                <FormItem>
                                        <FormLabel>Timing / Context</FormLabel>
                                        <FormControl>
                                            <Textarea id="prioritize-timing-input" placeholder="e.g., Planning for the next month, have extra free time on weekends..." {...field} />
                                        </FormControl>
                                        <FormDescription>Any relevant context about your current situation.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                } />

                            <Button id="prioritize-submit-btn" type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Prioritize My Projects
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <PrioritizationResult result={result} isLoading={isLoading} error={error} />
        </div>);

}