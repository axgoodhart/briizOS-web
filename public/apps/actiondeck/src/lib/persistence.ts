import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit as firestoreLimit,
  getDoc,
} from 'firebase/firestore';
import type { Project, TaskListItem, DailySchedule } from './types';

// Opt-in guard via env to avoid interfering with briizOS
export const FIRESTORE_SYNC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FIRESTORE_SYNC === 'true';

// Remove undefined values from objects before persisting to Firestore
// Firestore doesn't accept undefined - fields must be omitted or set to null
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

function userPath(uid: string) {
  // Namespaced under users/{uid}/apps/actionDeck/* to avoid collisions
  return {
    projectsCol: collection(db, 'users', uid, 'apps', 'actionDeck', 'projects'),
    casualCol: collection(db, 'users', uid, 'apps', 'actionDeck', 'casualTasks'),
    schedulesCol: collection(db, 'users', uid, 'apps', 'actionDeck', 'dailySchedules'),
  } as const;
}

export function subscribeProjects(cb: (projects: Project[]) => void) {
  if (!FIRESTORE_SYNC_ENABLED) return () => {};
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) { console.log('[persist] subscribeProjects: no uid'); return () => {} }

  const { projectsCol } = userPath(uid);
  console.log('[persist] subscribeProjects path:', projectsCol.path);
  return onSnapshot(projectsCol, (snap) => {
    const list: Project[] = [];
    snap.forEach((doc) => list.push(doc.data() as Project));
    console.log('[persist] subscribeProjects snapshot size:', snap.size);
    cb(list);
  });
}

export async function upsertProject(project: Project) {
  if (!FIRESTORE_SYNC_ENABLED) return;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { projectsCol } = userPath(uid);
  console.log('[persist] upsertProject path:', projectsCol.path, 'id:', project.id);
  const cleanedProject = removeUndefined({ ...project, updatedAt: serverTimestamp() });
  await setDoc(doc(projectsCol, project.id), cleanedProject, { merge: true });
}

export async function removeProject(projectId: string) {
  if (!FIRESTORE_SYNC_ENABLED) return;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { projectsCol } = userPath(uid);
  console.log('[persist] removeProject path:', projectsCol.path, 'id:', projectId);
  await deleteDoc(doc(projectsCol, projectId));
}

export function subscribeCasualTasks(cb: (items: TaskListItem[]) => void) {
  if (!FIRESTORE_SYNC_ENABLED) return () => {};
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) { console.log('[persist] subscribeCasualTasks: no uid'); return () => {} }
  const { casualCol } = userPath(uid);
  console.log('[persist] subscribeCasualTasks path:', casualCol.path);
  return onSnapshot(casualCol, (snap) => {
    const list: TaskListItem[] = [];
    snap.forEach((doc) => list.push(doc.data() as TaskListItem));
    console.log('[persist] subscribeCasualTasks snapshot size:', snap.size);
    cb(list);
  });
}

export async function upsertCasualItem(item: TaskListItem) {
  if (!FIRESTORE_SYNC_ENABLED) return;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { casualCol } = userPath(uid);
  console.log('[persist] upsertCasualItem path:', casualCol.path, 'id:', item.id);
  const cleanedItem = removeUndefined({ ...item, updatedAt: serverTimestamp() });
  await setDoc(doc(casualCol, item.id), cleanedItem, { merge: true });
}

export async function removeCasualItem(id: string) {
  if (!FIRESTORE_SYNC_ENABLED) return;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const { casualCol } = userPath(uid);
  console.log('[persist] removeCasualItem path:', casualCol.path, 'id:', id);
  await deleteDoc(doc(casualCol, id));
}

// ============================================
// Daily Schedule Persistence
// ============================================

export function subscribeDailySchedule(date: string, cb: (schedule: DailySchedule | null) => void) {
  if (!FIRESTORE_SYNC_ENABLED) return () => {};
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) { console.log('[persist] subscribeDailySchedule: no uid'); return () => {}; }

  const { schedulesCol } = userPath(uid);
  const scheduleRef = doc(schedulesCol, date);
  console.log('[persist] subscribeDailySchedule path:', scheduleRef.path);

  return onSnapshot(scheduleRef, (snap) => {
    if (snap.exists()) {
      cb(snap.data() as DailySchedule);
    } else {
      cb(null);
    }
  });
}

export async function getDailySchedule(date: string): Promise<DailySchedule | null> {
  if (!FIRESTORE_SYNC_ENABLED) return null;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const { schedulesCol } = userPath(uid);
  const scheduleRef = doc(schedulesCol, date);
  const snap = await getDoc(scheduleRef);

  if (snap.exists()) {
    return snap.data() as DailySchedule;
  }
  return null;
}

export async function upsertDailySchedule(schedule: DailySchedule) {
  if (!FIRESTORE_SYNC_ENABLED) return;
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const { schedulesCol } = userPath(uid);
  console.log('[persist] upsertDailySchedule path:', schedulesCol.path, 'id:', schedule.id);
  const cleanedSchedule = removeUndefined({ ...schedule, updatedAt: serverTimestamp() });
  await setDoc(doc(schedulesCol, schedule.id), cleanedSchedule, { merge: true });
}

export function subscribeScheduleHistory(historyLimit: number, cb: (schedules: DailySchedule[]) => void) {
  if (!FIRESTORE_SYNC_ENABLED) return () => {};
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) { console.log('[persist] subscribeScheduleHistory: no uid'); return () => {}; }

  const { schedulesCol } = userPath(uid);
  const historyQuery = query(
    schedulesCol,
    orderBy('date', 'desc'),
    firestoreLimit(historyLimit)
  );

  console.log('[persist] subscribeScheduleHistory path:', schedulesCol.path);
  return onSnapshot(historyQuery, (snap) => {
    const list: DailySchedule[] = [];
    snap.forEach((doc) => list.push(doc.data() as DailySchedule));
    console.log('[persist] subscribeScheduleHistory snapshot size:', snap.size);
    cb(list);
  });
}
