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
};

export type ProjectFormData = Omit<Project, 'id' | 'tasks'>;
