import { PrioritizationForm } from '@/components/prioritize/prioritization-form';

export default function PrioritizePage() {
  return (
    <div id="el-332" className="space-y-2">
             <div id="el-333" className="flex items-center justify-between">
                <div id="el-334" className="space-y-1">
                    <h1 id="el-335" className="text-2xl font-bold tracking-tight">AI Project Prioritizer</h1>
                    <p id="el-336" className="text-muted-foreground max-w-2xl">
                        Let AI help you decide what to work on next. Select projects from your dashboard, add your current goals, and get a prioritized list with clear reasoning.
                    </p>
                </div>
            </div>
            <div id="el-337" className="pt-4">
              <PrioritizationForm />
            </div>
        </div>);

}