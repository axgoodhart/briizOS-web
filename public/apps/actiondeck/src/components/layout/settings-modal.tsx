'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { Project, TaskListItem } from '@/lib/types';
import { useSettings } from '@/context/settings-context';

type ExportShape = {
  projects: Project[];
  casualTasks: TaskListItem[];
};

export function SettingsModal({ open, onOpenChange }: {open: boolean;onOpenChange: (v: boolean) => void;}) {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState('');
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);
  const { settings, updateSettings, isReady } = useSettings();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
  }, [auth]);

  const example = useMemo(() => JSON.stringify({
    projects: [
    {
      id: 'proj-123',
      name: 'Example',
      description: '',
      deadline: '2025-12-31',
      importance: 5,
      size: 10,
      relevance: '',
      tasks: [],
      coverImage: '',
      status: 'active',
      tags: [],
      milestones: [],
      updatedAt: Date.now(),
      createdAt: Date.now()
    }],

    casualTasks: [
    { id: 'ctask-1', title: 'Sample task', completed: false }]

  } as ExportShape, null, 2), []);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);setBusy(true);
    try {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email.trim(), password);else
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Authentication failed');
    } finally {setBusy(false);}
  }

  async function handleExport() {
    if (!uid) {setError('Please log in first');return;}
    setBusy(true);setError(null);
    try {
      const projSnap = await getDocs(collection(db, 'users', uid, 'apps', 'actionDeck', 'projects'));
      const projects: Project[] = projSnap.docs.map((d) => d.data() as Project);
      const taskSnap = await getDocs(collection(db, 'users', uid, 'apps', 'actionDeck', 'casualTasks'));
      const casualTasks: TaskListItem[] = taskSnap.docs.map((d) => d.data() as TaskListItem);
      const payload: ExportShape = { projects, casualTasks };
      setExportData(JSON.stringify(payload, null, 2));
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {setBusy(false);}
  }

  async function handleImport() {
    if (!uid) {setError('Please log in first');return;}
    setBusy(true);setError(null);
    try {
      const parsed = JSON.parse(importText || '{}') as ExportShape;
      if (Array.isArray(parsed.projects)) {
        for (const p of parsed.projects) {
          await setDoc(doc(db, 'users', uid, 'apps', 'actionDeck', 'projects', p.id), p, { merge: true });
        }
      }
      if (Array.isArray(parsed.casualTasks)) {
        for (const t of parsed.casualTasks) {
          await setDoc(doc(db, 'users', uid, 'apps', 'actionDeck', 'casualTasks', t.id), t as any, { merge: true });
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Import failed — ensure JSON matches the example');
    } finally {setBusy(false);}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage account, and import/export your Action Deck data.</DialogDescription>
        </DialogHeader>

        <div id="el-136" className="grid md:grid-cols-2 gap-6">
          <div id="el-137" className="space-y-3">
            <div id="el-138" className="text-sm font-medium">Account</div>
            {uid ?
            <div id="el-139" className="space-y-2">
                <div id="el-140" className="text-sm text-muted-foreground">Signed in as: {uid}</div>
                <Button variant="secondary" onClick={() => signOut(auth)}>Log out</Button>
              </div> :

            <form id="el-141" onSubmit={handleAuthSubmit} className="space-y-2">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {error && <div id="el-142" className="text-sm text-destructive">{error}</div>}
                <div id="el-143" className="flex gap-2">
                  <Button type="submit" disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</Button>
                  <Button type="button" variant="outline" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? 'Need an account?' : 'Have an account?'}
                  </Button>
                </div>
              </form>
            }

            <div id="el-144" className="space-y-4 pt-4">
              <div id="el-145" className="text-sm font-medium">Behavior</div>
              <div id="el-146" className="flex items-start justify-between gap-4">
                <div id="el-147" className="text-sm">
                  <Label htmlFor="cloud">Save to cloud</Label>
                  <p id="el-148" className="text-muted-foreground">When off, the app is read-only. Any changes you make will not be saved and are lost on reload or page change unless you Export first.</p>
                </div>
                <Switch id="cloud" checked={!!settings.enableSync} disabled={!uid || !isReady} onCheckedChange={(v) => updateSettings({ enableSync: !!v })} />
              </div>
              <div id="el-149" className="flex items-start justify-between gap-4">
                <div id="el-150" className="text-sm">
                  <Label htmlFor="briizos">Import from briizOS</Label>
                  <p id="el-151" className="text-muted-foreground">When on, the Casual Task List shows briizOS organizer items (read-only). Import happens each time you open or refocus the Tasks page.</p>
                </div>
                <Switch id="briizos" checked={!!settings.importBriizOS} disabled={!uid || !isReady} onCheckedChange={(v) => updateSettings({ importBriizOS: !!v })} />
              </div>
            </div>
          </div>

          <div id="el-152" className="space-y-3">
            <div id="el-153" className="flex items-center justify-between">
              <div id="el-154" className="text-sm font-medium">Export</div>
              <Button size="sm" onClick={handleExport} disabled={busy}>Export now</Button>
            </div>
            <Textarea value={exportData} readOnly rows={10} placeholder="Click Export to generate JSON" />
          </div>
        </div>

        <div id="el-155" className="space-y-2 mt-6">
          <div id="el-156" className="text-sm font-medium">Import</div>
          <Textarea rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={example} />
          <div id="el-157" className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setImportText(example)}>Load example</Button>
            <Button onClick={handleImport} disabled={busy || !uid}>Import</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}