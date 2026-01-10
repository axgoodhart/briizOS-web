'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, FolderInput, Sparkles, AlertCircle, CheckCircle2, FileWarning, Inbox, FileText, HelpCircle } from 'lucide-react';
import { scanAndAnalyzeFiles, GeneratedProject } from '@/lib/actions';
import { useProjects } from '@/context/project-context';
import { DOMAINS } from '@/lib/domains';
import { parseInboxText, inboxItemsToProjects } from '@/lib/inbox-parser';
import type { Project, Task } from '@/lib/types';

// Type for inbox-parsed projects (simpler than AI-generated)
type InboxProject = {
  name: string;
  description: string;
  domain?: Project['domain'];
  tags: string[];
  tasks: Task[];
};

export default function ImportPage() {
  // File scan state
  const [pathsInput, setPathsInput] = useState('');
  const [userContext, setUserContext] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    projects: GeneratedProject[];
    skipped: {path: string;reason: string;}[];
  } | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());

  // Inbox state
  const [inboxInput, setInboxInput] = useState('');
  const [inboxProjects, setInboxProjects] = useState<InboxProject[] | null>(null);
  const [selectedInboxProjects, setSelectedInboxProjects] = useState<Set<number>>(new Set());
  const [isImportingInbox, setIsImportingInbox] = useState(false);

  const { projects: existingProjects, addProject } = useProjects();

  const handleScan = async () => {
    setError(null);
    setScanResult(null);
    setSelectedProjects(new Set());
    setIsScanning(true);

    try {
      const paths = pathsInput.
      split('\n').
      map((p) => p.trim()).
      filter((p) => p.length > 0);

      if (paths.length === 0) {
        setError('Please enter at least one file path');
        return;
      }

      const result = await scanAndAnalyzeFiles({
        filePaths: paths,
        existingProjectNames: existingProjects.map((p) => p.name),
        userContext: userContext || undefined
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setScanResult(result.data);
      // Select all by default
      setSelectedProjects(new Set(result.data.projects.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    if (!scanResult) return;

    setIsImporting(true);
    setError(null);

    try {
      const projectsToImport = scanResult.projects.filter((_, i) => selectedProjects.has(i));

      for (const genProject of projectsToImport) {
        const project: Omit<Project, 'id' | 'updatedAt' | 'createdAt'> = {
          name: genProject.name,
          description: genProject.description,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks out
          importance: genProject.importance,
          size: genProject.size,
          relevance: genProject.relevance,
          domain: genProject.domain,
          status: 'active',
          tags: genProject.tags,
          tasks: genProject.tasks,
          milestones: [],
          sourcePaths: genProject.sourcePaths
        };

        addProject(project);
      }

      // Clear form after successful import
      setPathsInput('');
      setUserContext('');
      setScanResult(null);
      setSelectedProjects(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import projects');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleProject = (index: number) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProjects(newSelected);
  };

  const toggleAll = () => {
    if (!scanResult) return;
    if (selectedProjects.size === scanResult.projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(scanResult.projects.map((_, i) => i)));
    }
  };

  // Inbox handlers
  const handleParseInbox = () => {
    setError(null);
    const items = parseInboxText(inboxInput);
    if (items.length === 0) {
      setError('No valid items found. Use format: "- Task @domain #tag"');
      return;
    }
    const result = inboxItemsToProjects(items);
    setInboxProjects(result.projects);
    setSelectedInboxProjects(new Set(result.projects.map((_, i) => i)));
  };

  const handleImportInbox = async () => {
    if (!inboxProjects) return;
    setIsImportingInbox(true);
    setError(null);

    try {
      const toImport = inboxProjects.filter((_, i) => selectedInboxProjects.has(i));

      for (const p of toImport) {
        const project: Omit<Project, 'id' | 'updatedAt' | 'createdAt'> = {
          name: p.name,
          description: p.description,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          importance: 5,
          size: 4,
          relevance: '',
          domain: p.domain,
          status: 'active',
          tags: p.tags,
          tasks: p.tasks,
          milestones: []
        };
        addProject(project);
      }

      setInboxInput('');
      setInboxProjects(null);
      setSelectedInboxProjects(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import');
    } finally {
      setIsImportingInbox(false);
    }
  };

  const toggleInboxProject = (index: number) => {
    const newSelected = new Set(selectedInboxProjects);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedInboxProjects(newSelected);
  };

  return (
    <div id="el-220" className="space-y-6 max-w-4xl mx-auto">
      <div id="el-221" className="flex items-center justify-between">
        <div id="el-222" className="flex items-center gap-3">
          <div id="el-223" className="p-2 rounded-lg bg-primary/10">
            <FolderInput className="h-6 w-6 text-primary" />
          </div>
          <div id="el-224">
            <h1 id="el-225" className="text-2xl font-bold tracking-tight">AI Import</h1>
            <p id="el-226" className="text-muted-foreground">
              Analyze files and create projects automatically using AI
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              How it works
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Import Guide</DialogTitle>
              <DialogDescription>
                Two ways to quickly create projects from your files and ideas
              </DialogDescription>
            </DialogHeader>

            <div id="el-227" className="space-y-6 mt-4">
              {/* Scan Files Section */}
              <div id="el-228" className="space-y-3">
                <h3 id="el-229" className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Scan Files
                </h3>
                <p id="el-230" className="text-sm text-muted-foreground">
                  Point the AI at files on your computer. It reads the content and creates projects with relevant tasks, tags, and domain categorization.
                </p>

                <div id="el-231" className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p id="el-232" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Example file paths:</p>
                  <pre id="el-233" className="text-sm font-mono bg-background rounded p-3 overflow-x-auto">{`/Users/you/Documents/album-concept.md
/Users/you/Code/my-app/README.md
/Users/you/Writing/poem-draft.txt
~/Desktop/project-notes.md`}</pre>
                </div>

                <div id="el-234" className="text-sm space-y-2">
                  <p id="el-235" className="font-medium">The AI will automatically detect:</p>
                  <ul id="el-236" className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li id="el-237"><strong id="el-238">Domain</strong> from file type (.ly → music, .py → coding, etc.)</li>
                    <li id="el-239"><strong id="el-240">Tasks</strong> from TODOs, action items, or logical next steps</li>
                    <li id="el-241"><strong id="el-242">Tags</strong> from keywords in the content</li>
                    <li id="el-243"><strong id="el-244">Priority</strong> based on urgency cues in the text</li>
                  </ul>
                </div>

                <div id="el-245" className="bg-muted/50 rounded-lg p-4">
                  <p id="el-246" className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Domain detection by file type:</p>
                  <div id="el-247" className="grid grid-cols-2 gap-2 text-sm">
                    <div id="el-248"><code id="el-249" className="text-xs">.ly .midi .wav</code> → Music</div>
                    <div id="el-250"><code id="el-251" className="text-xs">.ts .js .py .rs</code> → Coding</div>
                    <div id="el-252"><code id="el-253" className="text-xs">.script</code> → Theatre</div>
                    <div id="el-254"><code id="el-255" className="text-xs">.psd .sketch .fig</code> → Visual Art</div>
                    <div id="el-256"><code id="el-257" className="text-xs">.md .txt</code> → (analyzed by content)</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Add Section */}
              <div id="el-258" className="space-y-3">
                <h3 id="el-259" className="font-semibold flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-primary" />
                  Quick Add (Inbox Format)
                </h3>
                <p id="el-260" className="text-sm text-muted-foreground">
                  Dump ideas quickly using a simple text format. No AI call needed—instant parsing.
                </p>

                <div id="el-261" className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p id="el-262" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Example inbox text:</p>
                  <pre id="el-263" className="text-sm font-mono bg-background rounded p-3 overflow-x-auto">{`- [ ] Finish album cover design @visual-art #urgent
- Record vocals for track 3 @music #studio
- Fix authentication bug @coding #backend
- Schedule dentist appointment @health
- Research Baroque counterpoint @theory @music
- Outline new screenplay @theatre #draft`}</pre>
                </div>

                <div id="el-264" className="text-sm space-y-2">
                  <p id="el-265" className="font-medium">Format syntax:</p>
                  <ul id="el-266" className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li id="el-267"><code id="el-268" className="text-xs bg-muted px-1 rounded">- [ ]</code> or <code id="el-269" className="text-xs bg-muted px-1 rounded">-</code> starts a new item</li>
                    <li id="el-270"><code id="el-271" className="text-xs bg-muted px-1 rounded">@domain</code> assigns a domain (music, coding, health, etc.)</li>
                    <li id="el-272"><code id="el-273" className="text-xs bg-muted px-1 rounded">#tag</code> adds tags (can use multiple)</li>
                    <li id="el-274">Items are grouped by domain into projects</li>
                  </ul>
                </div>

                <div id="el-275" className="bg-muted/50 rounded-lg p-4">
                  <p id="el-276" className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Available domains:</p>
                  <div id="el-277" className="flex flex-wrap gap-2">
                    {Object.entries(DOMAINS).map(([key, config]) =>
                    <Badge key={key} variant="outline" style={{ borderColor: config.color, color: config.color }}>
                        @{key}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tips Section */}
              <div id="el-278" className="space-y-3">
                <h3 id="el-279" className="font-semibold">Tips</h3>
                <ul id="el-280" className="text-sm space-y-2 text-muted-foreground">
                  <li id="el-281" className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span id="el-282">Add <strong id="el-283">context</strong> in the Scan Files tab to help the AI understand your goals</span>
                  </li>
                  <li id="el-284" className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span id="el-285">Projects track their <strong id="el-286">source files</strong>, so you can re-scan to update them later</span>
                  </li>
                  <li id="el-287" className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span id="el-288">Use Quick Add for <strong id="el-289">brain dumps</strong>—type fast, organize later</span>
                  </li>
                  <li id="el-290" className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span id="el-291">Review and <strong id="el-292">deselect</strong> any projects you don't want before importing</span>
                  </li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Scan Files
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Quick Add
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Paths</CardTitle>
              <CardDescription>
                Enter file paths to analyze (one per line). The AI will read each file and suggest projects.
              </CardDescription>
            </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
                placeholder={`/Users/you/Documents/project-idea.md
/Users/you/Music/new-song.ly
/Users/you/Code/app/README.md`}
                value={pathsInput}
                onChange={(e) => setPathsInput(e.target.value)}
                rows={6}
                className="font-mono text-sm" />


          <div id="el-293">
            <label id="el-294" className="text-sm font-medium mb-2 block">Context (optional)</label>
            <Textarea
                  placeholder="Add context about your goals or preferences to help the AI..."
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  rows={2} />

          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleScan} disabled={isScanning || !pathsInput.trim()}>
            {isScanning ?
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </> :

                <>
                <Sparkles className="mr-2 h-4 w-4" />
                Scan Files
              </>
                }
          </Button>
        </CardFooter>
      </Card>

      {scanResult &&
          <>
          {scanResult.skipped.length > 0 &&
            <Alert>
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Skipped Files ({scanResult.skipped.length})</AlertTitle>
              <AlertDescription>
                <ul id="el-295" className="mt-2 space-y-1 text-sm">
                  {scanResult.skipped.map((s, i) =>
                  <li id="el-296" key={i} className="font-mono">
                      <span id="el-297" className="text-muted-foreground">{s.path}:</span> {s.reason}
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
            }

          {scanResult.projects.length > 0 ?
            <Card>
              <CardHeader>
                <div id="el-298" className="flex items-center justify-between">
                  <div id="el-299">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Generated Projects ({scanResult.projects.length})
                    </CardTitle>
                    <CardDescription>
                      Review and select projects to import
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedProjects.size === scanResult.projects.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div id="el-300" className="space-y-4">
                    {scanResult.projects.map((project, index) => {
                      const domainConfig = project.domain ? DOMAINS[project.domain] : null;
                      const isSelected = selectedProjects.has(index);

                      return (
                        <div id="el-301"
                        key={index}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'}`
                        }
                        onClick={() => toggleProject(index)}>

                          <div id="el-302" className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProject(index)}
                              onClick={(e) => e.stopPropagation()} />

                            <div id="el-303" className="flex-1 min-w-0">
                              <div id="el-304" className="flex items-center gap-2 flex-wrap">
                                <h3 id="el-305" className="font-semibold">{project.name}</h3>
                                {domainConfig &&
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: domainConfig.color,
                                    color: domainConfig.color
                                  }}>

                                    {domainConfig.label}
                                  </Badge>
                                }
                                <Badge variant="secondary">
                                  {project.importance}/10 priority
                                </Badge>
                                <Badge variant="secondary">
                                  ~{project.size}h
                                </Badge>
                              </div>
                              <p id="el-306" className="text-sm text-muted-foreground mt-1">
                                {project.description}
                              </p>
                              {project.tags.length > 0 &&
                              <div id="el-307" className="flex gap-1 mt-2 flex-wrap">
                                  {project.tags.map((tag, i) =>
                                <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                )}
                                </div>
                              }
                              {project.tasks.length > 0 &&
                              <div id="el-308" className="mt-3">
                                  <p id="el-309" className="text-xs text-muted-foreground mb-1">
                                    Tasks ({project.tasks.length}):
                                  </p>
                                  <ul id="el-310" className="text-sm space-y-1">
                                    {project.tasks.slice(0, 3).map((task, i) =>
                                  <li id="el-311" key={i} className="flex items-center gap-2">
                                        <span id="el-312" className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                        {task.title}
                                      </li>
                                  )}
                                    {project.tasks.length > 3 &&
                                  <li id="el-313" className="text-muted-foreground text-xs">
                                        +{project.tasks.length - 3} more tasks
                                      </li>
                                  }
                                  </ul>
                                </div>
                              }
                              <p id="el-314" className="text-xs text-muted-foreground mt-2 font-mono truncate">
                                Source: {project.sourcePaths.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>);

                    })}
                  </div>
                </ScrollArea>
              </CardContent>
              <Separator />
              <CardFooter className="pt-4">
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedProjects.size === 0}
                  className="w-full">

                  {isImporting ?
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </> :

                  <>
                      Import {selectedProjects.size} Project{selectedProjects.size !== 1 ? 's' : ''}
                    </>
                  }
                </Button>
              </CardFooter>
            </Card> :

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Projects Generated</AlertTitle>
              <AlertDescription>
                The AI didn't find any files suitable for conversion to projects.
                Try different files or add more context.
              </AlertDescription>
            </Alert>
            }
        </>
          }
        </TabsContent>

        <TabsContent value="inbox" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Add</CardTitle>
              <CardDescription>
                Paste or type items in inbox format. Use @domain and #tags to categorize.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`- [ ] Finish album artwork @visual-art #urgent
- Schedule dentist @health
- Fix login bug @coding #actiondeck
- Build new synth patch @music
- Research color theory @theory @visual-art`}
                value={inboxInput}
                onChange={(e) => setInboxInput(e.target.value)}
                rows={8}
                className="font-mono text-sm" />

              <div id="el-315" className="text-xs text-muted-foreground space-y-1">
                <p id="el-316"><strong id="el-317">Format:</strong> Lines starting with - or - [ ] become items</p>
                <p id="el-318"><strong id="el-319">@domain:</strong> music, poetry, theatre, theory, coding, visual-art, health, home</p>
                <p id="el-320"><strong id="el-321">#tag:</strong> Add any tags you want</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleParseInbox} disabled={!inboxInput.trim()}>
                <Inbox className="mr-2 h-4 w-4" />
                Parse Items
              </Button>
            </CardFooter>
          </Card>

          {inboxProjects && inboxProjects.length > 0 &&
          <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Parsed Projects ({inboxProjects.length})
                </CardTitle>
                <CardDescription>
                  Review and import your items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div id="el-322" className="space-y-3">
                  {inboxProjects.map((project, index) => {
                  const domainConfig = project.domain ? DOMAINS[project.domain] : null;
                  const isSelected = selectedInboxProjects.has(index);

                  return (
                    <div id="el-323"
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'}`
                    }
                    onClick={() => toggleInboxProject(index)}>

                        <div id="el-324" className="flex items-start gap-3">
                          <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleInboxProject(index)}
                          onClick={(e) => e.stopPropagation()} />

                          <div id="el-325" className="flex-1">
                            <div id="el-326" className="flex items-center gap-2 flex-wrap">
                              <span id="el-327" className="font-medium">{project.name}</span>
                              {domainConfig &&
                            <Badge
                              variant="outline"
                              style={{ borderColor: domainConfig.color, color: domainConfig.color }}>

                                  {domainConfig.label}
                                </Badge>
                            }
                              {project.tags.map((tag, i) =>
                            <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                            )}
                            </div>
                            {project.tasks.length > 0 &&
                          <p id="el-328" className="text-sm text-muted-foreground mt-1">
                                {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
                              </p>
                          }
                          </div>
                        </div>
                      </div>);

                })}
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="pt-4">
                <Button
                onClick={handleImportInbox}
                disabled={isImportingInbox || selectedInboxProjects.size === 0}
                className="w-full">

                  {isImportingInbox ?
                <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </> :

                <>
                      Import {selectedInboxProjects.size} Project{selectedInboxProjects.size !== 1 ? 's' : ''}
                    </>
                }
                </Button>
              </CardFooter>
            </Card>
          }
        </TabsContent>
      </Tabs>

      {error &&
      <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      }
    </div>);

}