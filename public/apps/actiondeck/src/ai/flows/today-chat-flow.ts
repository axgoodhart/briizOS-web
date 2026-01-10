'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema
const TodayChatInputSchema = z.object({
  message: z.string(),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  currentSchedule: z.array(z.object({
    id: z.string(),
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
  currentDate: z.string(),
  currentTimeMinute: z.number(),
});

// Output schema
const TodayChatOutputSchema = z.object({
  response: z.string(),
  suggestedActions: z.array(z.object({
    type: z.enum(['add_item', 'move_item', 'resize_item', 'remove_item', 'complete_item']),
    itemId: z.string().optional(),
    title: z.string().optional(),
    startMinute: z.number().optional(),
    durationMinutes: z.number().optional(),
  })).optional(),
});

export type TodayChatInput = z.infer<typeof TodayChatInputSchema>;
export type TodayChatOutput = z.infer<typeof TodayChatOutputSchema>;

// Helper to format minute to time string
function formatMinuteToTime(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const displayHour = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export const todayChatFlow = ai.defineFlow(
  {
    name: 'todayChatFlow',
    inputSchema: TodayChatInputSchema,
    outputSchema: TodayChatOutputSchema,
  },
  async (input) => {
    const currentTime = formatMinuteToTime(input.currentTimeMinute);

    // Build context about current schedule
    const scheduleContext = input.currentSchedule.length > 0
      ? input.currentSchedule.map((item) =>
          `- [${item.id}] ${item.title} (${formatMinuteToTime(item.startMinute)} - ${formatMinuteToTime(item.startMinute + item.durationMinutes)})${item.completed ? ' [COMPLETED]' : ''}`
        ).join('\n')
      : 'No items scheduled yet.';

    // Build context about available tasks
    const projectTasksContext = input.availableProjects
      .filter((p) => p.tasks.some((t) => !t.completed))
      .slice(0, 5) // Limit to 5 projects for context size
      .map((p) => {
        const undoneTasks = p.tasks.filter((t) => !t.completed).slice(0, 3);
        return `${p.name} (Due: ${p.deadline}, Priority: ${p.importance}/10): ${undoneTasks.map((t) => t.title).join(', ')}`;
      }).join('\n');

    // Build chat history context
    const historyContext = input.chatHistory.length > 0
      ? input.chatHistory.slice(-6).map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';

    const systemPrompt = `You are a helpful productivity assistant helping someone plan their day. You have access to their schedule and available tasks.

DATE: ${input.currentDate}
CURRENT TIME: ${currentTime}

TODAY'S SCHEDULE:
${scheduleContext}

AVAILABLE TASKS (from projects):
${projectTasksContext || 'No pending tasks.'}

${historyContext ? `CONVERSATION HISTORY:\n${historyContext}\n` : ''}

The user is now asking: "${input.message}"

Respond helpfully and concisely. You can:
- Answer questions about their schedule
- Suggest how to reorganize their day
- Recommend tasks to add based on priorities and deadlines
- Help them think through scheduling decisions

Keep responses brief and actionable. If you suggest schedule changes, be specific about times.`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: systemPrompt,
      output: { schema: TodayChatOutputSchema },
    });

    return output ?? {
      response: 'I apologize, but I was unable to process your request. Please try again.',
    };
  }
);

export async function chatAboutToday(input: TodayChatInput): Promise<TodayChatOutput> {
  return todayChatFlow(input);
}
