import { PrioritizationForm } from '@/components/prioritize/prioritization-form';

export default function PrioritizePage() {
    return (
        <div className="space-y-2">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">AI Project Prioritizer</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Let AI help you decide what to work on next. Select projects from your dashboard, add your current goals, and get a prioritized list with clear reasoning.
                    </p>
                </div>
            </div>
            <div className="pt-4">
              <PrioritizationForm />
            </div>
        </div>
    );
}
