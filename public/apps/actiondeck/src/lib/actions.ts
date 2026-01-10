'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { prioritizeProjects, PrioritizeProjectsInput, PrioritizeProjectsOutput } from '@/ai/flows/intelligent-project-prioritization';
import { breakdownTask, BreakdownTaskInput, BreakdownTaskOutput } from '@/ai/flows/breakdown-task-flow';
import { analyzeFiles, AnalyzeFilesInput, AnalyzeFilesOutput } from '@/ai/flows/analyze-files-flow';
import { recommendToday, RecommendTodayInput, RecommendTodayOutput } from '@/ai/flows/recommend-today-flow';
import { chatAboutToday, TodayChatInput, TodayChatOutput } from '@/ai/flows/today-chat-flow';
import type { Project, Task } from '@/lib/types';

type ActionResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};

// Maximum file size to read (50KB)
const MAX_FILE_SIZE = 50 * 1024;
// Maximum content length to send to AI (10k chars)
const MAX_CONTENT_LENGTH = 10000;

export type ScanFilesInput = {
    filePaths: string[];
    existingProjectNames?: string[];
    userContext?: string;
};

export type GeneratedProject = {
    name: string;
    description: string;
    domain?: Project['domain'];
    tags: string[];
    tasks: Task[];
    relevance: string;
    importance: number;
    size: number;
    sourcePaths: string[];
};

export type ScanFilesOutput = {
    projects: GeneratedProject[];
    skipped: { path: string; reason: string }[];
};

/**
 * Read a file and prepare it for AI analysis
 */
async function readFileForAnalysis(filePath: string) {
    try {
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
            return { error: 'Not a file' };
        }

        if (stats.size > MAX_FILE_SIZE) {
            return { error: `File too large (${Math.round(stats.size / 1024)}KB > ${MAX_FILE_SIZE / 1024}KB limit)` };
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const truncatedContent = content.length > MAX_CONTENT_LENGTH
            ? content.slice(0, MAX_CONTENT_LENGTH) + '\n\n... (truncated)'
            : content;

        return {
            path: filePath,
            name: path.basename(filePath),
            extension: path.extname(filePath),
            content: truncatedContent,
            modifiedAt: stats.mtime.toISOString(),
            sizeBytes: stats.size,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to read: ${message}` };
    }
}

/**
 * Scan files and generate project suggestions using AI
 */
export async function scanAndAnalyzeFiles(input: ScanFilesInput): Promise<ActionResult<ScanFilesOutput>> {
    try {
        const { filePaths, existingProjectNames = [], userContext } = input;

        if (!filePaths || filePaths.length === 0) {
            return { success: false, error: 'No file paths provided' };
        }

        // Read all files
        const fileResults = await Promise.all(filePaths.map(readFileForAnalysis));

        const validFiles: AnalyzeFilesInput['files'] = [];
        const skipped: ScanFilesOutput['skipped'] = [];

        for (let i = 0; i < fileResults.length; i++) {
            const result = fileResults[i];
            const filePath = filePaths[i] ?? `file-${i}`;
            if ('error' in result) {
                skipped.push({ path: filePath, reason: result.error ?? 'Unknown error' });
            } else {
                validFiles.push(result);
            }
        }

        if (validFiles.length === 0) {
            return {
                success: true,
                data: { projects: [], skipped },
            };
        }

        // Call AI to analyze files
        const aiResult = await analyzeFiles({
            files: validFiles,
            existingProjectNames,
            userContext,
        });

        // Merge AI skipped files with read errors
        const allSkipped = [
            ...skipped,
            ...aiResult.skipped,
        ];

        // Convert AI output to our format (add task IDs if missing)
        const projects: GeneratedProject[] = aiResult.projects.map((p) => ({
            ...p,
            tasks: p.tasks.map((t, idx) => ({
                ...t,
                id: t.id || `task-${Date.now()}-${idx}`,
            })),
        }));

        return {
            success: true,
            data: { projects, skipped: allSkipped },
        };
    } catch (error) {
        console.error('Error in file analysis:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to analyze files: ${message}` };
    }
}

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

export async function handleTodayRecommend(input: RecommendTodayInput): Promise<ActionResult<RecommendTodayOutput>> {
    try {
        const result = await recommendToday(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in today recommend flow:', error);
        return { success: false, error: 'Failed to get recommendations from AI.' };
    }
}

export async function handleTodayChat(input: TodayChatInput): Promise<ActionResult<TodayChatOutput>> {
    try {
        const result = await chatAboutToday(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in today chat flow:', error);
        return { success: false, error: 'Failed to get response from AI.' };
    }
}
