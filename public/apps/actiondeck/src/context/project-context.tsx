
'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project, ProjectFormData, Task } from '@/lib/types';
import { subscribeProjects, upsertProject, removeProject } from '@/lib/persistence';
import { initialProjects } from '@/lib/data';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/settings-context';

interface ProjectContextType {
    projects: Project[];
    addProject: (projectData: ProjectFormData) => void;
    updateProject: (updatedProject: Project) => void;
    deleteProject: (projectId: string) => void;
    toggleTask: (projectId: string, taskId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [authedUid, setAuthedUid] = useState<string | null>(null);
    const { settings } = useSettings();
    const canPersist = Boolean(authedUid && settings.enableSync);

    useEffect(() => {
        const auth = getAuth();
        const stopAuth = onAuthStateChanged(auth, (u) => {
            setAuthedUid(u?.uid || null);
        });
        return () => stopAuth();
    }, []);

    useEffect(() => {
        let stopSub: undefined | (() => void);

        if (canPersist) {
            // Cloud source of truth
            stopSub = subscribeProjects((remote) => {
                setProjects(remote);
                setIsLoaded(true);
            });
        } else {
            // Read-only offline: load once from local cache if present
            try {
                const storedProjects = localStorage.getItem('action-deck-projects');
                if (storedProjects) {
                    setProjects(JSON.parse(storedProjects));
                } else {
                    setProjects(initialProjects);
                }
            } catch (error) {
                console.error('Failed to parse projects from localStorage', error);
                setProjects(initialProjects);
            }
            setIsLoaded(true);
        }

        return () => {
            if (typeof stopSub === 'function') stopSub();
        };
    }, [canPersist]);

    // Do NOT write to localStorage on change; offline mode is read-only

    const addProject = (projectData: ProjectFormData) => {
        if (!canPersist) {
            console.warn('[projects] read-only mode: cannot add project while offline');
            return;
        }
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            tasks: [],
            ...projectData,
        };
        setProjects(prevProjects => [newProject, ...prevProjects]);
        upsertProject(newProject).catch(() => {});
    };

    const updateProject = (updatedProject: Project) => {
        if (!canPersist) {
            console.warn('[projects] read-only mode: cannot update project while offline');
            return;
        }
        setProjects(prevProjects =>
            prevProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
        );
        upsertProject(updatedProject).catch(() => {});
    };

    const deleteProject = (projectId: string) => {
        if (!canPersist) {
            console.warn('[projects] read-only mode: cannot delete project while offline');
            return;
        }
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        removeProject(projectId).catch(() => {});
    };

    const toggleTask = (projectId: string, taskId: string) => {
        if (!canPersist) {
            console.warn('[projects] read-only mode: cannot toggle task while offline');
            return;
        }
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === projectId) {
                    return {
                        ...p,
                        tasks: p.tasks.map(t =>
                            t.id === taskId ? { ...t, completed: !t.completed } : t
                        ),
                    };
                }
                return p;
            })
        );
    };

    return (
        <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, toggleTask }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
