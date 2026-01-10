'use client';
import React, { useState } from 'react';
import { Task, TaskDeck, TaskListItem } from '@/lib/types';
import { TaskItem } from './task-item';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { initialCasualTasks } from '@/lib/data';
import { subscribeCasualTasks, upsertCasualItem, removeCasualItem } from '@/lib/persistence';
import { fetchBriizOSSnapshot, mapBriizOSToTasks } from '@/lib/briizos';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/settings-context';
import { handleTaskBreakdown } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TaskDeck as TaskDeckComponent } from './task-deck';

export function TaskList() {
  const [tasks, setTasks] = useState<TaskListItem[]>(initialCasualTasks);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const { toast } = useToast();

  // State for conversational AI
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null);
  const [originalGoal, setOriginalGoal] = useState<string>('');
  const [context, setContext] = useState<string>('');

  const { settings } = useSettings();

  // Load/save casual tasks per settings; also re-fetch briizOS on focus.
  // Wait for Firebase auth, then subscribe and fetch. Also re-fetch briizOS on page focus.
  React.useEffect(() => {
    const auth = getAuth();

    const fetchFromBriizOS = () => {
      if (!settings.importBriizOS) return;
      console.log('[tasks] briizOS import enabled; attempting fetch…');
      fetchBriizOSSnapshot().
      then((snap) => {
        if (!snap) {
          console.log('[tasks] briizOS snapshot: null');
          return;
        }
        const imported = mapBriizOSToTasks(snap);
        console.log('[tasks] briizOS mapped tasks count:', imported.length);
        if (imported.length === 0) return;
        setTasks((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const merged: TaskListItem[] = [...prev];
          let added = 0;
          for (const t of imported) {
            if (!existingIds.has(t.id)) {merged.unshift(t);added++;}
          }
          console.log('[tasks] briizOS tasks merged; added:', added);
          return merged;
        });
      }).
      catch((e) => {console.error('[tasks] briizOS fetch error', e);});
    };

    let unsubPersist: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log('[tasks] onAuthStateChanged: no user');
        return;
      }
      console.log('[tasks] onAuthStateChanged: uid', user.uid);
      // Start Action Deck persistence subscription now that uid is ready
      unsubPersist = subscribeCasualTasks((remote) => setTasks(remote));

      // LocalStorage fallback when Firestore sync is disabled
      if (!settings.enableSync) {
        try {
          const stored = localStorage.getItem('action-deck-casual-tasks');
          if (stored) setTasks(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load casual tasks from localStorage', e);
        }
      }

      // Initial import and on focus/visibility
      fetchFromBriizOS();
      const onFocus = () => fetchFromBriizOS();
      const onVis = () => {if (document.visibilityState === 'visible') fetchFromBriizOS();};
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);

      // Cleanup focus listeners if auth changes away
      return () => {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVis);
      };
    });

    return () => {
      if (typeof unsubPersist === 'function') unsubPersist();
      unsubAuth();
    };
  }, [settings.enableSync, settings.importBriizOS]);

  React.useEffect(() => {
    if (settings.enableSync) return; // Firestore drives state when enabled
    try {
      localStorage.setItem('action-deck-casual-tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save casual tasks to localStorage', e);
    }
  }, [tasks, settings.enableSync]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      const newTask: Task = {
        id: `ctask-${Date.now()}`,
        title: newItemTitle.trim(),
        completed: false
      };
      setTasks((prev) => [newTask, ...prev]);
      upsertCasualItem(newTask).catch(() => {});
      setNewItemTitle('');
    }
  };

  const handleAiBreakdown = async () => {
    const goal = newItemTitle;
    if (!goal.trim()) return;

    setIsBreakingDown(true);
    setOriginalGoal(goal);
    setNewItemTitle('');

    const result = await handleTaskBreakdown({ goal });

    if (result.success) {
      if (result.data.isDone && result.data.tasks) {
        const newDeck: TaskDeck = {
          id: `deck-${Date.now()}`,
          title: goal,
          tasks: result.data.tasks.map((title, index) => ({
            id: `deck-task-${Date.now()}-${index}`,
            title,
            completed: false
          })),
          isDeck: true
        };
        setTasks((prev) => [newDeck, ...prev]);
        upsertCasualItem(newDeck).catch(() => {});
        toast({
          title: 'Task Deck Created',
          description: `AI broke down "${goal}" into a new deck.`
        });
        resetAiState();
      } else if (result.data.clarifyingQuestion) {
        setClarifyingQuestion(result.data.clarifyingQuestion);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error
      });
      setNewItemTitle(goal); // Restore input if AI fails
    }
    setIsBreakingDown(false);
  };

  const handleClarificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBreakingDown(true);

    const result = await handleTaskBreakdown({ goal: originalGoal, context: context });

    if (result.success) {
      if (result.data?.isDone && result.data.tasks) {
        const newDeck: TaskDeck = {
          id: `deck-${Date.now()}`,
          title: originalGoal,
          tasks: result.data.tasks.map((title, index) => ({
            id: `deck-task-${Date.now()}-${index}`,
            title,
            completed: false
          })),
          isDeck: true
        };
        setTasks((prev) => [newDeck, ...prev]);
        upsertCasualItem(newDeck).catch(() => {});
        toast({
          title: 'Task Deck Created',
          description: `AI broke down "${originalGoal}" into a new deck.`
        });
        resetAiState();
      } else if (result.data?.clarifyingQuestion) {
        setClarifyingQuestion(result.data.clarifyingQuestion);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'The AI was unable to generate tasks. Please try rephrasing your goal.'
        });
        setNewItemTitle(originalGoal);
        resetAiState();
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error
      });
      setNewItemTitle(originalGoal);
      resetAiState();
    }
    setIsBreakingDown(false);
  };

  const resetAiState = () => {
    setClarifyingQuestion(null);
    setOriginalGoal('');
    setContext('');
  };


  const toggleTask = (taskId: string, deckId?: string) => {
    setTasks((prevTasks) => {
      const next = prevTasks.map((item) => {
        if (deckId && 'isDeck' in item && item.id === deckId) {
          return {
            ...item,
            tasks: item.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
            )
          };
        }
        if (!deckId && !('isDeck' in item) && item.id === taskId) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });

      // Persist the changed item
      const changed = next.find((it) => {
        if (deckId) return 'isDeck' in it && it.id === deckId;
        return !('isDeck' in it) && it.id === taskId;
      });
      if (changed) {
        upsertCasualItem(changed as any).catch(() => {});
      }

      return next;
    });
  };

  const deleteTask = (taskId: string, deckId?: string) => {
    setTasks((prevTasks) => {
      // If deleting from a deck, remove the task from within the deck
      if (deckId) {
        return prevTasks.map((item) => {
          if ('isDeck' in item && item.id === deckId) {
            const updatedDeck = {
              ...item,
              tasks: item.tasks.filter((t) => t.id !== taskId)
            };
            // Persist the updated deck (or remove it if empty)
            if (updatedDeck.tasks.length === 0) {
              removeCasualItem(deckId).catch(() => {});
              return null; // Mark for removal
            }
            upsertCasualItem(updatedDeck).catch(() => {});
            return updatedDeck;
          }
          return item;
        }).filter(Boolean) as typeof prevTasks;
      }
      // Deleting a standalone task or entire deck
      removeCasualItem(taskId).catch(() => {});
      return prevTasks.filter((item) => item.id !== taskId);
    });
  };

  const pendingTasks = tasks.filter((item) => {
    if ('isDeck' in item) {
      return item.tasks.some((t) => !t.completed);
    }
    return !item.completed;
  });

  const completedTasks = tasks.filter((item) => {
    if ('isDeck' in item) {
      return item.tasks.every((t) => t.completed);
    }
    return item.completed;
  });

  return (
    <Card id="tasks-card" className="task-card">
            <CardHeader>
                <CardTitle>Casual Task List</CardTitle>
                <CardDescription>A simple place for your day-to-day tasks. Use the magic wand to break a larger goal into a collapsible task deck.</CardDescription>
            </CardHeader>
            <CardContent>
                {clarifyingQuestion ?
        <div id="el-189" className="mb-6 space-y-4 animate-in fade-in-50">
                        <Alert id="tasks-clarification-alert">
                            <Bot className="h-4 w-4" />
                            <AlertTitle>The AI needs more information:</AlertTitle>
                            <AlertDescription>{clarifyingQuestion}</AlertDescription>
                        </Alert>
                        <form id="el-190" onSubmit={handleClarificationSubmit} className="task-input-row">
                             <Input
              className="dashboard-input"
              placeholder="Your answer..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isBreakingDown}
              autoFocus />

                            <Button type="submit" disabled={isBreakingDown} className="dashboard-button-primary">
                                {isBreakingDown ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={resetAiState} disabled={isBreakingDown} className="btn-outline-glass">
                                Cancel
                            </Button>
                        </form>
                    </div> :

        <form id="tasks-input-form" onSubmit={handleAddItem} className="task-input-row">
                        <Input
            id="tasks-input-field"
            className="dashboard-input"
            placeholder="Add a task or use AI to create a task deck..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            disabled={isBreakingDown} />

                        <Button id="tasks-add-btn" type="submit" size="icon" aria-label="Add Task" disabled={isBreakingDown} className="dashboard-button-primary">
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button id="tasks-ai-breakdown-btn" type="button" size="icon" variant="outline" aria-label="Breakdown with AI" onClick={handleAiBreakdown} disabled={isBreakingDown} className="btn-outline-glass">
                            {isBreakingDown ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        </Button>
                    </form>
        }


                <div id="el-191" className="space-y-4">
                    <div id="tasks-pending-section" className="relative space-y-2">
                        {pendingTasks.length > 0 ?
            pendingTasks.map((item) =>
            'isDeck' in item ?
            <TaskDeckComponent key={item.id} deck={item} onToggleTask={toggleTask} onDeleteTask={deleteTask} /> :
            <TaskItem key={item.id} task={item} onToggle={() => toggleTask(item.id)} onDelete={() => deleteTask(item.id)} />
            ) :

            <p id="el-192" className="text-sm text-muted-foreground py-4 text-center">All done for now! 🎉</p>

            }
                    </div>

                    {completedTasks.length > 0 &&
          <div id="tasks-completed-section">
                            <Separator className="my-4" />
                            <h3 id="el-193" className="text-sm font-medium mb-2 text-muted-foreground">Completed</h3>
                            <div id="el-194" className="space-y-2">
                                {completedTasks.map((item) =>
              'isDeck' in item ?
              <TaskDeckComponent key={item.id} deck={item} onToggleTask={toggleTask} onDeleteTask={deleteTask} /> :
              <TaskItem key={item.id} task={item} onToggle={() => toggleTask(item.id)} onDelete={() => deleteTask(item.id)} />
              )}
                            </div>
                        </div>
          }
                </div>
            </CardContent>
        </Card>);

}