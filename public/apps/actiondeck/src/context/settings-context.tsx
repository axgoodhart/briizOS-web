"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';

type FilterSettings = {
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  sepia: number;
  invert: boolean;
  backgroundPanel: string;
};

type Settings = {
  enableSync: boolean;
  importBriizOS: boolean;
  filters?: FilterSettings;
  updatedAt?: unknown;
};

type SettingsContextType = {
  settings: Settings;
  isReady: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  uid: string | null;
};

const defaultSettings: Settings = { enableSync: true, importBriizOS: true };

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const stop = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
    });
    return () => stop();
  }, []);

  useEffect(() => {
    if (!uid) { setIsReady(true); return; }
    const db = getFirestore(app);
    const ref = doc(db, 'users', uid, 'apps', 'actionDeck', 'settings', 'main');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Settings;
        setSettings({ ...defaultSettings, ...data });
      } else {
        setSettings(defaultSettings);
      }
      setIsReady(true);
    }, () => setIsReady(true));
    return () => unsub();
  }, [uid]);

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!uid) return; // silently no-op until logged in
    const db = getFirestore(app);
    const ref = doc(db, 'users', uid, 'apps', 'actionDeck', 'settings', 'main');
    await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
  };

  const value = useMemo<SettingsContextType>(() => ({ settings, isReady, updateSettings, uid }), [settings, isReady, uid]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
