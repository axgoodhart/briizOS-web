'use client';

import { useParams, notFound } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useProjects } from '@/context/project-context';
import { DOMAINS, DOMAIN_LIST, STATUS_CONFIG } from '@/lib/domains';
import type { Domain, ProjectStatus } from '@/lib/types';
import { ProjectCard } from '@/components/dashboard/project-card';
import { ProjectForm } from '@/components/dashboard/project-form';
import { SearchBar } from '@/components/dashboard/search-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type StatusFilter = ProjectStatus | 'all';

export default function DomainPage() {
  const params = useParams();
  const domainParam = params.domain as string;
  const { projects } = useProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Validate domain
  const isValidDomain = DOMAIN_LIST.some((d) => d.value === domainParam);
  if (!isValidDomain) {
    notFound();
  }

  const domain = domainParam as Domain;
  const domainConfig = DOMAINS[domain];
  const Icon = domainConfig.icon;

  // Filter projects for this domain
  const domainProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.domain !== domain) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.name.toLowerCase().includes(query);
        const matchesDescription = p.description.toLowerCase().includes(query);
        const matchesTags = p.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [projects, domain, searchQuery, statusFilter]);

  // Statistics for this domain
  const stats = useMemo(() => {
    const domainAll = projects.filter((p) => p.domain === domain);
    const totalTasks = domainAll.flatMap((p) => p.tasks).length;
    const completedTasks = domainAll.flatMap((p) => p.tasks).filter((t) => t.completed).length;
    const statusCounts: Record<string, number> = { all: domainAll.length };
    for (const status of Object.keys(STATUS_CONFIG)) {
      statusCounts[status] = domainAll.filter((p) => p.status === status).length;
    }
    return { totalProjects: domainAll.length, totalTasks, completedTasks, statusCounts };
  }, [projects, domain]);

  return (
    <div id="el-197" className="space-y-6">
      {/* Domain Header */}
      <div id="el-198"
      className="rounded-xl p-6 relative overflow-hidden"
      style={{ background: domainConfig.bgGradient }}>

        <div id="el-199" className="relative z-10">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4 text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div id="el-200" className="flex items-center gap-4">
            <div id="el-201" className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
              <Icon className="h-10 w-10 text-white" />
            </div>
            <div id="el-202">
              <h1 id="el-203" className="text-3xl font-headline text-white">{domainConfig.label}</h1>
              <p id="el-204" className="text-white/80">
                {stats.totalProjects} projects, {stats.completedTasks}/{stats.totalTasks} tasks completed
              </p>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div id="el-205" className="absolute top-0 right-0 opacity-10">
          <Icon className="h-64 w-64 -translate-y-10 translate-x-10" />
        </div>
      </div>

      {/* Stats Cards */}
      <div id="el-206" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="dashboard-metrics-card">
          <CardHeader className="p-4">
            <CardTitle className="text-sm text-muted-foreground">Total Projects</CardTitle>
            <p id="el-207" className="text-2xl font-bold" style={{ color: domainConfig.color }}>
              {stats.totalProjects}
            </p>
          </CardHeader>
        </Card>
        <Card className="dashboard-metrics-card">
          <CardHeader className="p-4">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
            <p id="el-208" className="text-2xl font-bold text-green-400">
              {stats.statusCounts.active || 0}
            </p>
          </CardHeader>
        </Card>
        <Card className="dashboard-metrics-card">
          <CardHeader className="p-4">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            <p id="el-209" className="text-2xl font-bold text-blue-400">
              {stats.statusCounts.done || 0}
            </p>
          </CardHeader>
        </Card>
        <Card className="dashboard-metrics-card">
          <CardHeader className="p-4">
            <CardTitle className="text-sm text-muted-foreground">Tasks Done</CardTitle>
            <p id="el-210" className="text-2xl font-bold text-cyan-400">
              {stats.completedTasks}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div id="el-211" className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`Search ${domainConfig.label.toLowerCase()} projects...`}
          className="flex-1" />

        <Button
          className="btn-primary-glass"
          onClick={() => setIsFormOpen(true)}>

          <PlusCircle className="mr-2 h-4 w-4" />
          New {domainConfig.label} Project
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
            All
            <Badge variant="secondary" className="ml-2 text-xs">
              {stats.statusCounts.all}
            </Badge>
          </TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([key, config]) =>
          <TabsTrigger
            key={key}
            value={key}
            className="data-[state=active]:bg-primary/20">

              <span id="el-212"
            className="h-2 w-2 rounded-full mr-2"
            style={{ backgroundColor: config.color }} />

              {config.label}
              {(stats.statusCounts[key] || 0) > 0 &&
            <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.statusCounts[key]}
                </Badge>
            }
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Project Grid */}
      {domainProjects.length > 0 ?
      <div id="el-213" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {domainProjects.map((project) =>
        <ProjectCard key={project.id} project={project} />
        )}
        </div> :
      stats.totalProjects > 0 ?
      <div id="el-214" className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 id="el-215" className="text-xl font-semibold text-muted-foreground">No Matching Projects</h3>
          <p id="el-216" className="text-muted-foreground mt-2">
            Try adjusting your search or status filter
          </p>
        </div> :

      <div id="el-217" className="text-center py-16 border-2 border-dashed rounded-lg">
          <Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 id="el-218" className="text-xl font-semibold text-muted-foreground">
            No {domainConfig.label} Projects Yet
          </h3>
          <p id="el-219" className="text-muted-foreground mt-2">
            Create your first {domainConfig.label.toLowerCase()} project to get started.
          </p>
          <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create {domainConfig.label} Project
          </Button>
        </div>
      }

      <ProjectForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>);

}