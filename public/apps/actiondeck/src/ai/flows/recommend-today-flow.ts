'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema
const RecommendTodayInputSchema = z.object({
  currentSchedule: z.array(z.object({
    title: z.string(),
    startMinute: z.number(),
    durationMinutes: z.number(),
    completed: z.boolean(),
  })),
  availableProjects: z.array(z.object({
    name: z.string(),
    deadline: z.string(),
    importance: z.number(),
    tasks: z.array(z.object({
      title: z.string(),
      completed: z.boolean(),
    })),
  })),
  casualTasks: z.array(z.object({
    title: z.string(),
    completed: z.boolean(),
  })),
  currentTimeMinute: z.number(),
  userContext: z.string().optional(),
});

// Output schema
const RecommendTodayOutputSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    suggestedStartMinute: z.number(),
    suggestedDurationMinutes: z.number(),
    reasoning: z.string(),
    sourceType: z.enum(['project', 'casual', 'new']),
    sourceId: z.string().optional(),
  })),
  overallSuggestion: z.string(),
});

export type RecommendTodayInput = z.infer<typeof RecommendTodayInputSchema>;
export type RecommendTodayOutput = z.infer<typeof RecommendTodayOutputSchema>;

// Helper to format minute to time string
function formatMinuteToTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const displayHour = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export const recommendTodayFlow = ai.defineFlow(
  {
    name: 'recommendTodayFlow',
    inputSchema: RecommendTodayInputSchema,
    outputSchema: RecommendTodayOutputSchema,
  },
  async (input) => {
    const currentTime = formatMinuteToTime(input.currentTimeMinute);

    // Build context about current schedule
    const scheduleContext = input.currentSchedule.length > 0
      ? input.currentSchedule.map((item) =>
          `- ${item.title} (${formatMinuteToTime(item.startMinute)} - ${formatMinuteToTime(item.startMinute + item.durationMinutes)})${item.completed ? ' [DONE]' : ''}`
        ).join('\n')
      : 'No items scheduled yet.';

    // Build context about available tasks
    const projectTasksContext = input.availableProjects
      .filter((p) => p.tasks.some((t) => !t.completed))
      .map((p) => {
        const undoneTasks = p.tasks.filter((t) => !t.completed);
        return `Project: ${p.name} (Deadline: ${p.deadline}, Importance: ${p.importance}/10)\n  Tasks: ${undoneTasks.map((t) => t.title).join(', ')}`;
      }).join('\n\n');

    const casualTasksContext = input.casualTasks
      .filter((t) => !t.completed)
      .map((t) => `- ${t.title}`)
      .join('\n') || 'None';

    const prompt = `You are a productivity assistant helping plan someone's day.

Current time: ${currentTime}

CURRENT SCHEDULE:
${scheduleContext}

AVAILABLE PROJECT TASKS:
${projectTasksContext || 'No project tasks available.'}

CASUAL TASKS:
${casualTasksContext}

${input.userContext ? `USER CONTEXT: ${input.userContext}` : ''}

Based on the current time and what's already scheduled, recommend 2-4 tasks that the user should consider adding to their schedule. For each recommendation:
1. Choose from available project tasks or casual tasks (prefer tasks from high-importance projects with upcoming deadlines)
2. Suggest a specific start time that doesn't conflict with existing schedule
3. Suggest an appropriate duration (30-120 minutes)
4. Provide brief reasoning

Also provide an overall suggestion about how to approach the rest of the day.

IMPORTANT:
- Don't recommend completed tasks
- Don't overlap with existing scheduled items
- Consider the current time (don't suggest past times)
- Prioritize based on deadlines and importance`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: RecommendTodayOutputSchema },
    });

    return output ?? {
      recommendations: [],
      overallSuggestion: 'Unable to generate recommendations at this time.',
    };
  }
);

export async function recommendToday(input: RecommendTodayInput): Promise<RecommendTodayOutput> {
  return recommendTodayFlow(input);
}
