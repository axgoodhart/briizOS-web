import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Project, TaskListItem } from './types';

// Opt-in guard via env to avoid interfering with briizOS
export const FIRESTORE_SYNC_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FIRESTORE_SYNC === 'true';

function userPath(uid: string) {
  // Namespaced under users/{uid}/apps/actionDeck/* to avoid collisions
  return {
    projectsCol: collection(db, 'users', uid, 'apps', 'actionDeck', 'projects'),
    casualCol: collection(db, 'users', uid, 'apps', 'actionDeck', 'casualTasks'),
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
  await setDoc(doc(projectsCol, project.id), { ...project, updatedAt: serverTimestamp() }, { merge: true });
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
  await setDoc(doc(casualCol, item.id), { ...item, updatedAt: serverTimestamp() }, { merge: true });
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
