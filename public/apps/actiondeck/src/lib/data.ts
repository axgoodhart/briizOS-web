import type { Project, Task, TaskListItem } from './types';

export const initialProjects: Project[] = [];


export const initialCasualTasks: TaskListItem[] = [
    { id: 'ctask-1', title: 'Buy groceries', completed: false },
    { id: 'ctask-2', title: 'Call mom', completed: true },
    { id: 'ctask-3', title: 'Schedule dentist appointment', completed: false },
];
