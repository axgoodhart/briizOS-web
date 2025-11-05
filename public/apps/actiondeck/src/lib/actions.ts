'use server';

import { prioritizeProjects, PrioritizeProjectsInput, PrioritizeProjectsOutput } from '@/ai/flows/intelligent-project-prioritization';
import { breakdownTask, BreakdownTaskInput, BreakdownTaskOutput } from '@/ai/flows/breakdown-task-flow';

type ActionResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

export async function handlePrioritization(input: PrioritizeProjectsInput): Promise<ActionResult<PrioritizeProjectsOutput>> {
    try {
        const result = await prioritizeProjects(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in prioritization flow:', error);
        return { success: false, error: 'Failed to get prioritization from AI.' };
    }
}

export async function handleTaskBreakdown(input: BreakdownTaskInput): Promise<ActionResult<BreakdownTaskOutput>> {
    try {
        const result = await breakdownTask(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in task breakdown flow:', error);
        return { success: false, error: 'Failed to get task breakdown from AI.' };
    }
}
