
'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Project, ProjectFormData, Task } from '@/lib/types';
import { subscribeProjects, upsertProject, removeProject } from '@/lib/persistence';
import { initialProjects } from '@/lib/data';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/settings-context';

const STORAGE_KEY = 'action-deck-projects';
const PENDING_KEY = 'action-deck-pending';
const DELETED_KEY = 'action-deck-deleted';

interface ProjectContextType {
    projects: Project[];
    addProject: (projectData: ProjectFormData) => void;
    updateProject: (updatedProject: Project) => void;
    deleteProject: (projectId: string) => void;
    toggleTask: (projectId: string, taskId: string) => void;
    isOffline: boolean;
    hasPendingChanges: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Convert Firestore Timestamp or other date formats to milliseconds
function toMillis(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    if (value && typeof value === 'object' && 'seconds' in value) {
        return (value as { seconds: number }).seconds * 1000;
    }
    return undefined;
}

// Migrate old projects to include new required fields
function migrateProject(project: Partial<Project>): Project {
    const now = Date.now();
    return {
        id: project.id || `proj-${now}`,
        name: project.name || '',
        description: project.description || '',
        deadline: project.deadline || new Date().toISOString().split('T')[0],
        importance: project.importance ?? 5,
        size: project.size ?? 10,
        relevance: project.relevance || '',
        coverImage: project.coverImage,
        tasks: project.tasks || [],
        // New fields with defaults
        domain: project.domain,
        status: project.status || 'active',
        tags: project.tags || [],
        milestones: project.milestones || [],
        notes: project.notes,
        manualProgress: project.manualProgress,
        // AI import source tracking
        sourcePaths: project.sourcePaths,
        updatedAt: toMillis(project.updatedAt) || now,
        createdAt: toMillis(project.createdAt) || now,
    };
}

// Smart merge: prefer the version with the more recent updatedAt
function smartMerge(local: Project, remote: Project): Project {
    if (local.updatedAt > remote.updatedAt) {
        return local;
    }
    if (remote.updatedAt > local.updatedAt) {
        return remote;
    }
    // If timestamps are equal, merge with local taking precedence for ties
    return { ...remote, ...local };
}

// Merge two project arrays using smart merge
function mergeProjectArrays(local: Project[], remote: Project[]): Project[] {
    const merged = new Map<string, Project>();

    // Add all remote projects first
    for (const p of remote) {
        merged.set(p.id, migrateProject(p));
    }

    // Merge local projects (local wins if newer)
    for (const p of local) {
        const migrated = migrateProject(p);
        const existing = merged.get(p.id);
        if (existing) {
            merged.set(p.id, smartMerge(migrated, existing));
        } else {
            merged.set(p.id, migrated);
        }
    }

    return Array.from(merged.values());
}

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [pendingChanges, setPendingChanges] = useState<Map<string, Project>>(new Map());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);
    const [authedUid, setAuthedUid] = useState<string | null>(null);
    const { settings } = useSettings();
    const canPersist = Boolean(authedUid && settings.enableSync);
    const syncingRef = useRef(false);

    // Load pending changes and deleted IDs from localStorage on mount
    useEffect(() => {
        try {
            const pendingData = localStorage.getItem(PENDING_KEY);
            if (pendingData) {
                const parsed = JSON.parse(pendingData) as Record<string, Project>;
                setPendingChanges(new Map(Object.entries(parsed)));
            }
            const deletedData = localStorage.getItem(DELETED_KEY);
            if (deletedData) {
                setDeletedIds(new Set(JSON.parse(deletedData)));
            }
        } catch (e) {
            console.error('[projects] Failed to load pending changes:', e);
        }
    }, []);

    // Save pending changes to localStorage whenever they change
    useEffect(() => {
        if (pendingChanges.size > 0) {
            localStorage.setItem(PENDING_KEY, JSON.stringify(Object.fromEntries(pendingChanges)));
        } else {
            localStorage.removeItem(PENDING_KEY);
        }
    }, [pendingChanges]);

    // Save deleted IDs to localStorage
    useEffect(() => {
        if (deletedIds.size > 0) {
            localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deletedIds)));
        } else {
            localStorage.removeItem(DELETED_KEY);
        }
    }, [deletedIds]);

    useEffect(() => {
        const auth = getAuth();
        const stopAuth = onAuthStateChanged(auth, (u) => {
            setAuthedUid(u?.uid || null);
        });
        return () => stopAuth();
    }, []);

    // Sync pending changes when coming online
    const syncPendingChanges = useCallback(async () => {
        if (syncingRef.current || pendingChanges.size === 0 && deletedIds.size === 0) return;
        syncingRef.current = true;

        try {
            // Sync pending updates/creates
            for (const [id, project] of pendingChanges) {
                await upsertProject(project);
            }
            setPendingChanges(new Map());

            // Sync pending deletes
            for (const id of deletedIds) {
                await removeProject(id);
            }
            setDeletedIds(new Set());

            console.log('[projects] Successfully synced pending changes');
        } catch (e) {
            console.error('[projects] Failed to sync pending changes:', e);
        } finally {
            syncingRef.current = false;
        }
    }, [pendingChanges, deletedIds]);

    useEffect(() => {
        let stopSub: undefined | (() => void);

        if (canPersist) {
            // Cloud source of truth - subscribe to real-time updates
            stopSub = subscribeProjects((remote) => {
                const migratedRemote = remote.map(migrateProject);

                // If we have pending changes, merge them with remote
                if (pendingChanges.size > 0) {
                    const pendingArray = Array.from(pendingChanges.values());
                    const merged = mergeProjectArrays(pendingArray, migratedRemote);
                    // Filter out deleted items
                    const filtered = merged.filter(p => !deletedIds.has(p.id));
                    setProjects(filtered);
                } else {
                    // No pending changes, just use remote (filtered)
                    const filtered = migratedRemote.filter(p => !deletedIds.has(p.id));
                    setProjects(filtered);
                }

                setIsLoaded(true);

                // Sync pending changes after initial load
                syncPendingChanges();
            });
        } else {
            // Offline mode: load from localStorage with full read/write
            try {
                const storedProjects = localStorage.getItem(STORAGE_KEY);
                if (storedProjects) {
                    const parsed = JSON.parse(storedProjects) as Project[];
                    setProjects(parsed.map(migrateProject));
                } else {
                    setProjects(initialProjects.map(migrateProject));
                }
            } catch (error) {
                console.error('Failed to parse projects from localStorage', error);
                setProjects(initialProjects.map(migrateProject));
            }
            setIsLoaded(true);
        }

        return () => {
            if (typeof stopSub === 'function') stopSub();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canPersist]);

    // Save to localStorage whenever projects change (for offline access)
    useEffect(() => {
        if (isLoaded && projects.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        }
    }, [projects, isLoaded]);

    const addProject = (projectData: ProjectFormData) => {
        const now = Date.now();
        const newProject: Project = migrateProject({
            id: `proj-${now}`,
            tasks: [],
            milestones: [],
            ...projectData,
            createdAt: now,
            updatedAt: now,
        });

        setProjects(prevProjects => [newProject, ...prevProjects]);

        if (canPersist) {
            upsertProject(newProject).catch((e) => {
                console.error('[projects] Failed to persist new project:', e);
                // Add to pending changes for later sync
                setPendingChanges(prev => new Map(prev).set(newProject.id, newProject));
            });
        } else {
            // Offline: track as pending change for later sync
            setPendingChanges(prev => new Map(prev).set(newProject.id, newProject));
        }
    };

    const updateProject = (updatedProject: Project) => {
        const now = Date.now();
        const projectWithTimestamp = { ...updatedProject, updatedAt: now };

        setProjects(prevProjects =>
            prevProjects.map(p => (p.id === projectWithTimestamp.id ? projectWithTimestamp : p))
        );

        if (canPersist) {
            upsertProject(projectWithTimestamp).catch((e) => {
                console.error('[projects] Failed to persist updated project:', e);
                setPendingChanges(prev => new Map(prev).set(projectWithTimestamp.id, projectWithTimestamp));
            });
        } else {
            // Offline: track as pending change
            setPendingChanges(prev => new Map(prev).set(projectWithTimestamp.id, projectWithTimestamp));
        }
    };

    const deleteProject = (projectId: string) => {
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        // Remove from pending changes if it was there
        setPendingChanges(prev => {
            const next = new Map(prev);
            next.delete(projectId);
            return next;
        });

        if (canPersist) {
            removeProject(projectId).catch((e) => {
                console.error('[projects] Failed to delete project:', e);
                setDeletedIds(prev => new Set(prev).add(projectId));
            });
        } else {
            // Offline: track deletion for later sync
            setDeletedIds(prev => new Set(prev).add(projectId));
        }
    };

    const toggleTask = (projectId: string, taskId: string) => {
        const now = Date.now();
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === projectId) {
                    const updated = {
                        ...p,
                        tasks: p.tasks.map(t =>
                            t.id === taskId ? { ...t, completed: !t.completed } : t
                        ),
                        updatedAt: now,
                    };
                    // Also update persistence
                    if (canPersist) {
                        upsertProject(updated).catch(() => {
                            setPendingChanges(prev => new Map(prev).set(updated.id, updated));
                        });
                    } else {
                        setPendingChanges(prev => new Map(prev).set(updated.id, updated));
                    }
                    return updated;
                }
                return p;
            })
        );
    };

    const isOffline = !canPersist;
    const hasPendingChanges = pendingChanges.size > 0 || deletedIds.size > 0;

    return (
        <ProjectContext.Provider value={{
            projects,
            addProject,
            updateProject,
            deleteProject,
            toggleTask,
            isOffline,
            hasPendingChanges,
        }}>
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
