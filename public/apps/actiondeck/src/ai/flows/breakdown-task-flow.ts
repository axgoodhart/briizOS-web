'use server';

/**
 * @fileOverview This file defines a Genkit flow for breaking down a high-level goal into smaller, actionable tasks.
 * It will ask a clarifying question if the initial goal is too ambiguous.
 *
 * - breakdownTask - A function that handles the task breakdown process.
 * - BreakdownTaskInput - The input type for the breakdownTask function.
 * - BreakdownTaskOutput - The return type for the breakdownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakdownTaskInputSchema = z.object({
  goal: z.string().describe('The high-level goal to be broken down into tasks.'),
  // The context can be used to provide more information from previous turns.
  context: z.string().optional().describe('Additional context or answers to clarifying questions.'),
});
export type BreakdownTaskInput = z.infer<typeof BreakdownTaskInputSchema>;

const BreakdownTaskOutputSchema = z.object({
  tasks: z.array(z.string()).optional().describe('An array of small, actionable task titles. This is returned when the AI has enough information.'),
  clarifyingQuestion: z.string().optional().describe('A question to ask the user to get more details before breaking down the task. This is returned when the AI needs more information.'),
  isDone: z.boolean().describe('Set to true if tasks were generated, false if a clarifying question is being asked.'),
});
export type BreakdownTaskOutput = z.infer<typeof BreakdownTaskOutputSchema>;

export async function breakdownTask(input: BreakdownTaskInput): Promise<BreakdownTaskOutput> {
  return breakdownTaskFlow(input);
}

const breakdownTaskPrompt = ai.definePrompt({
  name: 'breakdownTaskPrompt',
  input: {schema: BreakdownTaskInputSchema},
  output: {schema: BreakdownTaskOutputSchema},
  prompt: `You are an expert project manager. A user will provide a high-level goal. Your job is to break that goal down into a list of small, actionable tasks.

Evaluate the user's goal.
- If the goal is straightforward and you have enough information (e.g., "organize my garage", "plan a birthday party"), break it down into a list of tasks and set isDone to true.
- If the goal is ambiguous, emotionally complex, or requires more specific details (e.g., "reconcile with mom", "get a new job"), you MUST ask one single clarifying question to get the necessary information. Do not generate tasks yet. Set isDone to false and populate the clarifyingQuestion field.

{{#if context}}
The user has provided the following context to your previous question:
{{{context}}}
Use this information to generate the tasks.
{{/if}}

User Goal: {{{goal}}}
`,
});

const breakdownTaskFlow = ai.defineFlow(
  {
    name: 'breakdownTaskFlow',
    inputSchema: BreakdownTaskInputSchema,
    outputSchema: BreakdownTaskOutputSchema,
  },
  async input => {
    const {output} = await breakdownTaskPrompt(input);
    return output!;
  }
);
