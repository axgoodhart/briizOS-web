'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { TodayItem, DailySchedule, ChatMessage } from '@/lib/types';
import { subscribeDailySchedule, upsertDailySchedule } from '@/lib/persistence';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSettings } from '@/context/settings-context';

const STORAGE_KEY = 'action-deck-today';

// Helper to get today's date as YYYY-MM-DD
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get current time in minutes from midnight
export function getCurrentMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

interface TodayContextType {
  // Current date being viewed
  currentDate: string;
  setCurrentDate: (date: string) => void;
  goToToday: () => void;
  isToday: boolean;

  // Schedule data
  schedule: DailySchedule | null;
  items: TodayItem[];
  isLoading: boolean;

  // Item CRUD
  addItem: (item: Omit<TodayItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (item: TodayItem) => void;
  deleteItem: (itemId: string) => void;
  toggleItemComplete: (itemId: string) => void;

  // Chat
  chatHistory: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;

  // UI state
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const TodayContext = createContext<TodayContextType | undefined>(undefined);

function createEmptySchedule(date: string): DailySchedule {
  const now = Date.now();
  return {
    id: date,
    date,
    items: [],
    chatHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function TodayProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDateState] = useState<string>(getTodayDateString());
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authedUid, setAuthedUid] = useState<string | null>(null);
  const [isChatOpen, setChatOpen] = useState(false);

  const { settings } = useSettings();
  const canPersist = Boolean(authedUid && settings.enableSync);

  const isToday = currentDate === getTodayDateString();

  // Auth state tracking
  useEffect(() => {
    const auth = getAuth();
    const stopAuth = onAuthStateChanged(auth, (u) => {
      setAuthedUid(u?.uid || null);
    });
    return () => stopAuth();
  }, []);

  // Subscribe to schedule changes
  useEffect(() => {
    let stopSub: (() => void) | undefined;

    if (canPersist) {
      setIsLoading(true);
      stopSub = subscribeDailySchedule(currentDate, (remote) => {
        if (remote) {
          setSchedule(remote);
        } else {
          // No schedule for this date yet - create empty one
          setSchedule(createEmptySchedule(currentDate));
        }
        setIsLoading(false);
      });
    } else {
      // Offline mode: load from localStorage
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY}-${currentDate}`);
        if (stored) {
          setSchedule(JSON.parse(stored));
        } else {
          setSchedule(createEmptySchedule(currentDate));
        }
      } catch (e) {
        console.error('[today] Failed to load from localStorage:', e);
        setSchedule(createEmptySchedule(currentDate));
      }
      setIsLoading(false);
    }

    return () => {
      if (stopSub) stopSub();
    };
  }, [canPersist, currentDate]);

  // Save to localStorage when schedule changes (for offline access)
  useEffect(() => {
    if (schedule) {
      try {
        localStorage.setItem(`${STORAGE_KEY}-${currentDate}`, JSON.stringify(schedule));
      } catch (e) {
        console.error('[today] Failed to save to localStorage:', e);
      }
    }
  }, [schedule, currentDate]);

  // Persist schedule changes
  const persistSchedule = useCallback((updatedSchedule: DailySchedule) => {
    setSchedule(updatedSchedule);
    if (canPersist) {
      upsertDailySchedule(updatedSchedule).catch((e) => {
        console.error('[today] Failed to persist schedule:', e);
      });
    }
  }, [canPersist]);

  const setCurrentDate = useCallback((date: string) => {
    setCurrentDateState(date);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDateState(getTodayDateString());
  }, []);

  const addItem = useCallback((itemData: Omit<TodayItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!schedule) return;

    const now = Date.now();
    const newItem: TodayItem = {
      ...itemData,
      id: `item-${now}`,
      createdAt: now,
      updatedAt: now,
    };

    const updatedSchedule: DailySchedule = {
      ...schedule,
      items: [...schedule.items, newItem],
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const updateItem = useCallback((item: TodayItem) => {
    if (!schedule) return;

    const now = Date.now();
    const updatedSchedule: DailySchedule = {
      ...schedule,
      items: schedule.items.map((i) =>
        i.id === item.id ? { ...item, updatedAt: now } : i
      ),
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const deleteItem = useCallback((itemId: string) => {
    if (!schedule) return;

    const now = Date.now();
    const updatedSchedule: DailySchedule = {
      ...schedule,
      items: schedule.items.filter((i) => i.id !== itemId),
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const toggleItemComplete = useCallback((itemId: string) => {
    if (!schedule) return;

    const now = Date.now();
    const updatedSchedule: DailySchedule = {
      ...schedule,
      items: schedule.items.map((i) =>
        i.id === itemId ? { ...i, completed: !i.completed, updatedAt: now } : i
      ),
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!schedule) return;

    const now = Date.now();
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${now}`,
      timestamp: now,
    };

    const updatedSchedule: DailySchedule = {
      ...schedule,
      chatHistory: [...(schedule.chatHistory || []), newMessage],
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const clearChatHistory = useCallback(() => {
    if (!schedule) return;

    const now = Date.now();
    const updatedSchedule: DailySchedule = {
      ...schedule,
      chatHistory: [],
      updatedAt: now,
    };

    persistSchedule(updatedSchedule);
  }, [schedule, persistSchedule]);

  const items = schedule?.items || [];
  const chatHistory = schedule?.chatHistory || [];

  const value = useMemo<TodayContextType>(() => ({
    currentDate,
    setCurrentDate,
    goToToday,
    isToday,
    schedule,
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    toggleItemComplete,
    chatHistory,
    addChatMessage,
    clearChatHistory,
    isChatOpen,
    setChatOpen,
  }), [
    currentDate, setCurrentDate, goToToday, isToday, schedule, items, isLoading,
    addItem, updateItem, deleteItem, toggleItemComplete,
    chatHistory, addChatMessage, clearChatHistory, isChatOpen
  ]);

  return (
    <TodayContext.Provider value={value}>
      {children}
    </TodayContext.Provider>
  );
}

export function useToday() {
  const context = useContext(TodayContext);
  if (!context) {
    throw new Error('useToday must be used within a TodayProvider');
  }
  return context;
}
