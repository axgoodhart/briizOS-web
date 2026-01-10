'use server';

/**
 * @fileOverview Genkit flow for analyzing files and generating ActionDeck projects.
 *
 * This flow takes file content and metadata, uses AI to understand the content,
 * and generates Project objects that match the ActionDeck import schema.
 *
 * - analyzeFiles - Main function to analyze files and generate projects
 * - AnalyzeFilesInput - Input type with file array and context
 * - AnalyzeFilesOutput - Output type with generated projects and skipped files
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for file metadata
const FileInfoSchema = z.object({
  path: z.string().describe('Absolute file path'),
  name: z.string().describe('File name with extension'),
  extension: z.string().describe('File extension (e.g., .md, .ts, .ly)'),
  content: z.string().describe('File content (truncated to ~10k chars)'),
  modifiedAt: z.string().describe('Last modified timestamp (ISO format)'),
  sizeBytes: z.number().describe('File size in bytes'),
});

const AnalyzeFilesInputSchema = z.object({
  files: z.array(FileInfoSchema).describe('Array of files to analyze'),
  existingProjectNames: z.array(z.string()).describe('Names of existing projects to avoid duplicates'),
  userContext: z.string().optional().describe('Optional context about user goals or preferences'),
});
export type AnalyzeFilesInput = z.infer<typeof AnalyzeFilesInputSchema>;

// Task schema for generated tasks
const GeneratedTaskSchema = z.object({
  id: z.string().describe('Unique task ID (format: task-{timestamp}-{index})'),
  title: z.string().describe('Task title'),
  completed: z.boolean().describe('Whether task is completed (usually false for new)'),
});

// Domain enum matching ActionDeck's 8 domains
const DomainSchema = z.enum([
  'music',
  'poetry',
  'theatre',
  'theory',
  'coding',
  'visual-art',
  'health',
  'home',
]).describe('Project domain category');

// Generated project schema
const GeneratedProjectSchema = z.object({
  name: z.string().describe('Project name - concise but descriptive'),
  description: z.string().describe('Brief description (1-2 sentences)'),
  domain: DomainSchema.optional().describe('Inferred domain based on file type and content'),
  tags: z.array(z.string()).describe('Relevant tags/keywords (3-5 recommended)'),
  tasks: z.array(GeneratedTaskSchema).describe('Actionable tasks extracted from content'),
  relevance: z.string().describe('Why this project matters / what it aims to achieve'),
  importance: z.number().min(1).max(10).describe('Inferred importance (1-10)'),
  size: z.number().describe('Estimated hours to complete'),
  sourcePaths: z.array(z.string()).describe('Source file path(s) this project was generated from'),
});

const SkippedFileSchema = z.object({
  path: z.string().describe('File path that was skipped'),
  reason: z.string().describe('Why the file was not converted to a project'),
});

const AnalyzeFilesOutputSchema = z.object({
  projects: z.array(GeneratedProjectSchema).describe('Generated project objects'),
  skipped: z.array(SkippedFileSchema).describe('Files that were skipped with reasons'),
});
export type AnalyzeFilesOutput = z.infer<typeof AnalyzeFilesOutputSchema>;

export async function analyzeFiles(input: AnalyzeFilesInput): Promise<AnalyzeFilesOutput> {
  return analyzeFilesFlow(input);
}

const analyzeFilesPrompt = ai.definePrompt({
  name: 'analyzeFilesPrompt',
  input: { schema: AnalyzeFilesInputSchema },
  output: { schema: AnalyzeFilesOutputSchema },
  prompt: `You are an AI assistant that analyzes files and converts them into ActionDeck projects.

## Your Task
Analyze each file and determine if it should become a project in ActionDeck. For files that warrant a project, generate a complete project object. Skip files that are trivial, temporary, or don't represent meaningful work.

## Domain Mapping Guide
Use these heuristics to assign domains:
- **music**: .ly (LilyPond), .midi, .wav, .mp3, .aiff, music notation, chord progressions, lyrics
- **poetry**: .verse, poems, verses, literary writing, prose drafts
- **theatre**: .script, screenplays, stage directions, dialogue, performance notes
- **theory**: Academic writing, research, philosophy, analysis, essays (often .md or .tex)
- **coding**: .ts, .js, .py, .rs, .go, .java, programming projects, technical docs
- **visual-art**: .psd, .ai, .sketch, .fig, art concepts, design briefs
- **health**: Fitness plans, medical notes, wellness tracking, diet plans
- **home**: Household tasks, home improvement, organization, family planning

## Project Generation Rules
1. **Name**: Create a clear, actionable project name (not just the filename)
2. **Description**: Summarize what this project is about in 1-2 sentences
3. **Tasks**: Extract TODOs, action items, or create logical next steps (3-7 tasks)
4. **Tags**: Add relevant keywords for filtering (3-5 tags)
5. **Importance**: Rate 1-10 based on apparent priority/urgency in content
6. **Size**: Estimate hours needed based on complexity
7. **sourcePaths**: Always include the file path that generated this project

## Skip Criteria
Skip files that are:
- Configuration files (.json, .yaml for build tools)
- Lock files (package-lock.json, yarn.lock)
- Minified/compiled output
- Empty or near-empty
- Binary files without meaningful project context
- Temporary or backup files

## Existing Projects
Avoid creating projects with names too similar to: {{#each existingProjectNames}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}

{{#if userContext}}
## User Context
{{userContext}}
{{/if}}

## Files to Analyze

{{#each files}}
### File {{@index}}: {{name}}
- **Path**: {{path}}
- **Extension**: {{extension}}
- **Modified**: {{modifiedAt}}
- **Size**: {{sizeBytes}} bytes

**Content:**
\`\`\`
{{{content}}}
\`\`\`

---
{{/each}}

Now analyze these files and generate appropriate projects:`,
});

const analyzeFilesFlow = ai.defineFlow(
  {
    name: 'analyzeFilesFlow',
    inputSchema: AnalyzeFilesInputSchema,
    outputSchema: AnalyzeFilesOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeFilesPrompt(input);
    return output!;
  }
);
