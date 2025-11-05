'use client'

import React from 'react';
import { ProjectCard } from './project-card';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { useProjects } from '@/context/project-context';
import { ProjectForm } from './project-form';

export function ProjectList() {
    const { projects } = useProjects();
    const [isFormOpen, setIsFormOpen] = React.useState(false);

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

    return (
        <div className="space-y-4">
            <div className="project-toolbar">
                <Button variant="outline" onClick={handleExport} className="btn-outline-glass export-json">
                    <Download className="mr-2 h-4 w-4" />
                    Export JSON
                </Button>
                <Button className="btn-primary-glass new-project" onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Project
                </Button>
            </div>
            {projects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold text-muted-foreground">No Projects Yet</h3>
                    <p className="text-muted-foreground mt-2">Click "New Project" to get started.</p>
                    <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Your First Project
                    </Button>
                </div>
            )}
            <ProjectForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
        </div>
    );
}
