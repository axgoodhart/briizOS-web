import type { Domain, Task } from '@/lib/types';

export type ParsedInboxItem = {
  title: string;
  domain?: Domain;
  tags: string[];
  isTask: boolean; // true if it's a simple task, false if it should be a project
};

const DOMAIN_MAP: Record<string, Domain> = {
  music: 'music',
  poetry: 'poetry',
  theatre: 'theatre',
  theater: 'theatre',
  theory: 'theory',
  coding: 'coding',
  code: 'coding',
  dev: 'coding',
  'visual-art': 'visual-art',
  art: 'visual-art',
  design: 'visual-art',
  health: 'health',
  fitness: 'health',
  home: 'home',
  house: 'home',
};

/**
 * Parse inbox-style text into structured items.
 *
 * Format:
 * - [ ] Task with checkbox @domain #tag1 #tag2
 * - Task without checkbox @music
 * Simple line without prefix becomes a project idea
 *
 * @domain - Assigns a domain (music, coding, etc.)
 * @#tag - Adds a tag
 * Lines starting with # are treated as section headers and ignored
 */
export function parseInboxText(text: string): ParsedInboxItem[] {
  const lines = text.split('\n');
  const items: ParsedInboxItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and headers
    if (!line || line.startsWith('# ') || line.startsWith('## ')) {
      continue;
    }

    // Extract the core text, removing list prefixes
    let content = line;
    let isTask = false;

    // Check for checkbox format: - [ ] or - [x]
    const checkboxMatch = content.match(/^-\s*\[[ x]?\]\s*/i);
    if (checkboxMatch) {
      content = content.slice(checkboxMatch[0].length);
      isTask = true;
    } else if (content.startsWith('- ')) {
      // Simple list item
      content = content.slice(2);
      isTask = true;
    } else if (content.startsWith('* ')) {
      content = content.slice(2);
      isTask = true;
    }

    // Extract @domain
    let domain: Domain | undefined;
    const domainMatch = content.match(/@(\S+)/);
    if (domainMatch) {
      const domainKey = domainMatch[1].toLowerCase();
      domain = DOMAIN_MAP[domainKey];
      content = content.replace(domainMatch[0], '').trim();
    }

    // Extract #tags
    const tags: string[] = [];
    const tagMatches = content.matchAll(/#(\S+)/g);
    for (const match of tagMatches) {
      tags.push(match[1]);
    }
    content = content.replace(/#\S+/g, '').trim();

    // Clean up multiple spaces
    content = content.replace(/\s+/g, ' ').trim();

    if (content) {
      items.push({
        title: content,
        domain,
        tags,
        isTask,
      });
    }
  }

  return items;
}

/**
 * Convert parsed inbox items to projects.
 * Simple tasks are grouped, while longer items become individual projects.
 */
export function inboxItemsToProjects(items: ParsedInboxItem[]): {
  projects: Array<{
    name: string;
    description: string;
    domain?: Domain;
    tags: string[];
    tasks: Task[];
  }>;
} {
  // Group tasks by domain
  const tasksByDomain = new Map<Domain | 'none', ParsedInboxItem[]>();

  const projects: Array<{
    name: string;
    description: string;
    domain?: Domain;
    tags: string[];
    tasks: Task[];
  }> = [];

  for (const item of items) {
    if (item.isTask && item.title.length < 100) {
      // Short tasks get grouped
      const key = item.domain || 'none';
      if (!tasksByDomain.has(key)) {
        tasksByDomain.set(key, []);
      }
      tasksByDomain.get(key)!.push(item);
    } else {
      // Longer items or non-tasks become individual projects
      projects.push({
        name: item.title.slice(0, 50) + (item.title.length > 50 ? '...' : ''),
        description: item.title,
        domain: item.domain,
        tags: item.tags,
        tasks: [],
      });
    }
  }

  // Create grouped projects from tasks
  for (const [domainKey, tasks] of tasksByDomain) {
    const domain = domainKey === 'none' ? undefined : domainKey;
    const allTags = [...new Set(tasks.flatMap((t) => t.tags))];

    projects.push({
      name: domain ? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Tasks` : 'Inbox Tasks',
      description: `Quick tasks imported from inbox (${tasks.length} items)`,
      domain,
      tags: allTags,
      tasks: tasks.map((t, i) => ({
        id: `task-${Date.now()}-${i}`,
        title: t.title,
        completed: false,
      })),
    });
  }

  return { projects };
}
