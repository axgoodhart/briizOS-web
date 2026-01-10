export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskDeck = {
  id: string;
  title: string;
  tasks: Task[];
  isDeck: true;
}

export type TaskListItem = Task | TaskDeck;

// 8 Distinct Domains for project categorization
export type Domain =
  | 'music'
  | 'poetry'
  | 'theatre'
  | 'theory'
  | 'coding'
  | 'visual-art'
  | 'health'
  | 'home';

// 4-State Project Status workflow
export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';

// Named Milestones - distinct from flat tasks, representing project phases
export type Milestone = {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  order: number;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  importance: number; // 1-10
  size: number; // hours
  relevance: string;
  coverImage?: string;
  tasks: Task[];
  // Domain categorization
  domain?: Domain;
  // Project workflow status
  status: ProjectStatus;
  // Freeform tags for filtering
  tags: string[];
  // Named milestones (project phases)
  milestones: Milestone[];
  // Separate freeform notes field
  notes?: string;
  // Manual progress override (0-100), bypasses task-based calculation
  manualProgress?: number;
  // Source file paths for AI-imported projects (many-to-many: project can have multiple sources)
  sourcePaths?: string[];
  // Timestamps for smart merge and display
  updatedAt: number;
  createdAt: number;
};

export type ProjectFormData = Omit<Project, 'id' | 'tasks' | 'milestones' | 'updatedAt' | 'createdAt'>;

// ============================================
// Today Page Types
// ============================================

// Source reference for pulling in existing items
export type TodayItemSource =
  | { type: 'manual' }
  | { type: 'project'; projectId: string; taskId?: string }
  | { type: 'casual'; taskId: string };

// Individual time block on the Today timeline
export type TodayItem = {
  id: string;
  title: string;
  description?: string;
  startMinute: number;      // 0-1440 (minutes from midnight)
  durationMinutes: number;  // e.g., 60 = 1 hour
  color?: string;           // Optional custom color
  source: TodayItemSource;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

// Chat message for AI panel
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

// A saved daily schedule
export type DailySchedule = {
  id: string;               // Format: YYYY-MM-DD
  date: string;             // ISO date string YYYY-MM-DD
  items: TodayItem[];
  chatHistory?: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};
