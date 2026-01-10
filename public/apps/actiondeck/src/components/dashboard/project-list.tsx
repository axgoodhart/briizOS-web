'use client';

import React, { useState, useMemo } from 'react';
import { ProjectCard } from './project-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, PlusCircle, WifiOff, CloudOff } from 'lucide-react';
import { useProjects } from '@/context/project-context';
import { ProjectForm } from './project-form';
import { SearchBar } from './search-bar';
import { DomainFilterBar } from './domain-filter-bar';
import type { Domain, ProjectStatus } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/domains';
import { Badge } from '@/components/ui/badge';

type StatusFilter = ProjectStatus | 'all';

export function ProjectList() {
  const { projects, isOffline, hasPendingChanges } = useProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<Domain | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filter projects based on search, domain, and status
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter - check title, description, and tags
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = project.name.toLowerCase().includes(query);
        const matchesDescription = project.description.toLowerCase().includes(query);
        const matchesTags = project.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Domain filter
      if (domainFilter && project.domain !== domainFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, domainFilter, statusFilter]);

  // Count projects by status for badge display
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const status of Object.keys(STATUS_CONFIG)) {
      counts[status] = projects.filter((p) => p.status === status).length;
    }
    return counts;
  }, [projects]);

  const handleExport = () => {
    if (projects.length === 0) {
      alert("There are no projects to export.");
      return;
    }
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'action-deck-projects.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDomainFilter(null);
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || domainFilter || statusFilter !== 'all';

  return (
    <div id="dashboard-project-list" className="space-y-4">
      {/* Offline/Sync Status Indicator */}
      {(isOffline || hasPendingChanges) &&
      <div id="el-71" className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
          {isOffline ?
        <>
              <WifiOff className="h-4 w-4" />
              <span id="el-72" className="text-sm">
                Offline mode - Changes saved locally and will sync when online
              </span>
            </> :
        hasPendingChanges ?
        <>
              <CloudOff className="h-4 w-4" />
              <span id="el-73" className="text-sm">
                Syncing pending changes...
              </span>
            </> :
        null}
        </div>
      }

      {/* Toolbar */}
      <div id="dashboard-toolbar" className="project-toolbar flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <SearchBar
          id="dashboard-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search projects, descriptions, tags..."
          className="flex-1" />


        {/* Actions */}
        <div id="el-74" className="flex gap-2">
          <Button id="dashboard-export-btn" variant="outline" onClick={handleExport} className="btn-outline-glass export-json">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button id="dashboard-new-project-btn" className="btn-primary-glass new-project" onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Tabs id="dashboard-status-tabs" value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
            All
            <Badge variant="secondary" className="ml-2 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          {Object.entries(STATUS_CONFIG).map(([key, config]) =>
          <TabsTrigger
            key={key}
            value={key}
            className="data-[state=active]:bg-primary/20">

              <span id="el-75"
            className="h-2 w-2 rounded-full mr-2"
            style={{ backgroundColor: config.color }} />

              {config.label}
              {statusCounts[key] > 0 &&
            <Badge variant="secondary" className="ml-2 text-xs">
                  {statusCounts[key]}
                </Badge>
            }
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Active Filters Summary */}
      {hasActiveFilters &&
      <div id="el-76" className="flex items-center gap-2 text-sm text-muted-foreground">
          <span id="el-77">
            Showing {filteredProjects.length} of {projects.length} projects
          </span>
          <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-xs h-6">

            Clear filters
          </Button>
        </div>
      }

      {/* Project Grid */}
      {filteredProjects.length > 0 ?
      <div id="dashboard-project-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) =>
        <ProjectCard key={project.id} project={project} />
        )}
        </div> :
      projects.length > 0 ?
      <div id="el-78" className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 id="el-79" className="text-xl font-semibold text-muted-foreground">No Matching Projects</h3>
          <p id="el-80" className="text-muted-foreground mt-2">
            Try adjusting your search or filters
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear All Filters
          </Button>
        </div> :

      <div id="el-81" className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 id="el-82" className="text-xl font-semibold text-muted-foreground">No Projects Yet</h3>
          <p id="el-83" className="text-muted-foreground mt-2">Click "New Project" to get started.</p>
          <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Project
          </Button>
        </div>
      }

      {/* Domain Filter Bar at bottom */}
      <div id="el-84" className="fixed bottom-0 left-0 right-0 sm:left-14 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4 px-4 z-20">
        <DomainFilterBar
          selectedDomain={domainFilter}
          onDomainChange={setDomainFilter} />

      </div>

      {/* Spacer for fixed domain bar */}
      <div id="el-85" className="h-20" />

      <ProjectForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>);

}