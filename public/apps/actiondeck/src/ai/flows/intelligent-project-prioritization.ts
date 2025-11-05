// src/ai/flows/intelligent-project-prioritization.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for intelligent project prioritization.
 *
 * The flow analyzes projects based on deadline, importance, size, and relevance, and provides a
 * prioritized list with a clear explanation of the reasoning in markdown format.
 *
 * - prioritizeProjects - A function that handles the project prioritization process.
 * - PrioritizeProjectsInput - The input type for the prioritizeProjects function.
 * - PrioritizeProjectsOutput - The return type for the prioritizeProjects function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProjectSchema = z.object({
  name: z.string().describe('The name of the project.'),
  deadline: z.string().describe('The deadline of the project (YYYY-MM-DD).'),
  importance: z.number().describe('The importance of the project (1-10).'),
  size: z.number().describe('The size of the project (estimated hours).'),
  relevance: z.string().describe('The relevance of the project to user goals.'),
});

const PrioritizeProjectsInputSchema = z.object({
  projects: z.array(ProjectSchema).describe('An array of projects to prioritize.'),
  userGoals: z.string().describe('The user’s overall goals.'),
  timing: z.string().describe('Information about the timing or context of the prioritization.'),
});
export type PrioritizeProjectsInput = z.infer<typeof PrioritizeProjectsInputSchema>;

const PrioritizeProjectsOutputSchema = z.object({
  prioritizedList: z.array(z.string()).describe('A prioritized list of project names.'),
  reasoning: z.string().describe('The reasoning behind the prioritization in markdown format.'),
});
export type PrioritizeProjectsOutput = z.infer<typeof PrioritizeProjectsOutputSchema>;

export async function prioritizeProjects(input: PrioritizeProjectsInput): Promise<PrioritizeProjectsOutput> {
  return prioritizeProjectsFlow(input);
}

const prioritizeProjectsPrompt = ai.definePrompt({
  name: 'prioritizeProjectsPrompt',
  input: {schema: PrioritizeProjectsInputSchema},
  output: {schema: PrioritizeProjectsOutputSchema},
  prompt: `You are an AI assistant designed to help users prioritize their personal projects.

You will receive a list of projects, along with information about their deadlines, importance, size, and relevance to the user's goals. You will also receive information about the user's goals and the timing/context of the prioritization.

Based on this information, you will generate a prioritized list of projects and explain your reasoning in markdown format.

Here is the project information:

User Goals: {{{userGoals}}}
Timing/Context: {{{timing}}}

{{#each projects}}
Project Name: {{{name}}}
Deadline: {{{deadline}}}
Importance: {{{importance}}}
Size: {{{size}}}
Relevance: {{{relevance}}}
{{/each}}

Prioritized List:`,
});

const prioritizeProjectsFlow = ai.defineFlow(
  {
    name: 'prioritizeProjectsFlow',
    inputSchema: PrioritizeProjectsInputSchema,
    outputSchema: PrioritizeProjectsOutputSchema,
  },
  async input => {
    const {output} = await prioritizeProjectsPrompt(input);
    return output!;
  }
);
