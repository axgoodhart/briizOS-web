import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Task, TaskListItem } from './types';

// Opt-in flag: only read when explicitly enabled
export const READ_BRIIzOS = process.env.NEXT_PUBLIC_READ_BRIIzOS === 'true';

type BriizOSSnapshot = {
  panels?: Record<string, unknown>;
  organizer?: Record<string, any>;
  thoughtstream?: unknown[];
  calendar?: Record<string, unknown>;
  chatThreads?: Record<string, { lastTs?: number; count?: number }>;
  stats?: Record<string, unknown>;
  clientTs?: number;
};

export async function fetchBriizOSSnapshot(): Promise<BriizOSSnapshot | null> {
  if (!READ_BRIIzOS) return null;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.log('[briizOS] No currentUser; skip fetch');
    return null;
  }
  const db = getFirestore(app);
  const ref = doc(db, `users/${uid}/snapshots/app`);
  console.log('[briizOS] Fetching snapshots/app for uid:', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log('[briizOS] snapshots/app does not exist for uid:', uid);
    return null;
  }
  const data = snap.data() as BriizOSSnapshot;
  const orgLen = Array.isArray((data as any).organizer) ? (data as any).organizer.length : 0;
  console.log('[briizOS] Fetched snapshots/app organizer length:', orgLen);
  return data;
}

export function mapBriizOSToTasks(snapshot: BriizOSSnapshot): Task[] {
  const out: Task[] = [];
  const items = snapshot.organizer || {};
  for (const [, item] of Object.entries(items)) {
    const id: string = item.id || `org-${Math.random().toString(36).slice(2)}`;
    const name: string = item.name || item.title || '';
    if (!name) continue;
    // Completed inference: if present, use; otherwise default false
    const completed: boolean = Boolean(item.completed);
    out.push({ id, title: name, completed });
  }
  return out;
}
