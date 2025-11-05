'use client'
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Project } from '@/lib/types';
import { ProjectModal } from './project-modal';
import { ProgressChart } from './progress-chart';

export function ProjectCard({ project }: { project: Project }) {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [formattedDate, setFormattedDate] = React.useState('');

    React.useEffect(() => {
        if (project.deadline) {
            setFormattedDate(new Date(project.deadline).toLocaleDateString());
        }
    }, [project.deadline]);

    const completedTasks = project.tasks.filter((task) => task.completed).length;
    const totalTasks = project.tasks.length;

    return (
        <>
            <Card className="project-card group relative flex flex-col h-full hover:shadow-accent/20 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                {project.coverImage && (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 opacity-100 group-hover:opacity-0"
                        style={{ backgroundImage: `url(${project.coverImage})` }}
                      />
                      <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
                    </>
                )}
                <div className={project.coverImage ? "relative z-10 flex flex-col h-full transition-opacity duration-300 opacity-0 group-hover:opacity-100" : "flex flex-col h-full"}>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                    <CardDescription className="h-10 line-clamp-2">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="text-xs text-muted-foreground">
                        Due: {formattedDate || <span className="animate-pulse">Loading date...</span>}
                    </div>
                    <div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                           <span>Progress</span>
                           <span>({completedTasks}/{totalTasks})</span>
                        </div>
                        <ProgressChart tasks={project.tasks} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="secondary" className="w-full" onClick={() => setIsModalOpen(true)}>View Details</Button>
                </CardFooter>
                </div>
            </Card>
            <ProjectModal project={project} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
    );
}
