'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/context/settings-context';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';

// Force dynamic rendering to prevent build-time prerendering
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const { settings, isReady, updateSettings, uid } = useSettings();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const stop = onAuthStateChanged(getAuth(), (u) => setAuthed(!!u));
    return () => stop();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Configure Action Deck behavior. These settings are saved to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!authed &&
        <div id="el-338" className="text-sm text-muted-foreground">Sign in on the Login page to change settings.</div>
        }
        <div id="el-339" className="flex items-center justify-between">
          <div id="el-340">
            <Label htmlFor="sync">Save to cloud</Label>
            <p id="el-341" className="text-sm text-muted-foreground">When on, projects and tasks save to your Firestore under users/&lt;uid&gt;/apps/actionDeck/…</p>
          </div>
          <Switch id="sync" checked={!!settings.enableSync} disabled={!authed || !isReady} onCheckedChange={(v) => updateSettings({ enableSync: !!v })} />
        </div>
        <div id="el-342" className="flex items-center justify-between">
          <div id="el-343">
            <Label htmlFor="import">Import from briizOS</Label>
            <p id="el-344" className="text-sm text-muted-foreground">Show briizOS organizer items in the Casual Task List (read-only).</p>
          </div>
          <Switch id="import" checked={!!settings.importBriizOS} disabled={!authed || !isReady} onCheckedChange={(v) => updateSettings({ importBriizOS: !!v })} />
        </div>
      </CardContent>
    </Card>);

}