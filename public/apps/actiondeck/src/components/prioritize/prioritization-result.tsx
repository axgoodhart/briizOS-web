import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BotMessageSquare } from 'lucide-react';
import type { PrioritizeProjectsOutput } from '@/ai/flows/intelligent-project-prioritization';
import { cn } from '@/lib/utils';

interface PrioritizationResultProps {
  result: PrioritizeProjectsOutput | null;
  isLoading: boolean;
  error: string | null;
}

function BasicMarkdown({ text, className }: {text: string;className?: string;}) {
  return (
    <div id="el-160" className={cn("space-y-4 text-sm", className)}>
            {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 id="el-161" key={i} className="font-semibold text-lg mt-4 border-b pb-1">{line.substring(4)}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p id="el-162" key={i} className="font-bold">{line.substring(2, line.length - 2)}</p>;
        }
        if (line.startsWith('* ')) {
          return <div id="el-163" key={i} className="flex gap-2"><span id="el-164" className="text-muted-foreground">&bull;</span><p id="el-165">{line.substring(2)}</p></div>;
        }
        if (line.match(/^\d+\. /)) {
          return <div id="el-166" key={i} className="flex gap-2"><span id="el-167" className="font-medium">{line.substring(0, line.indexOf(' ') + 1)}</span><p id="el-168">{line.substring(line.indexOf(' ') + 1)}</p></div>;
        }
        if (line.trim() === '') {
          return null;
        }
        return <p id="el-169" key={i}>{line}</p>;
      })}
        </div>);

}


export function PrioritizationResult({ result, isLoading, error }: PrioritizationResultProps) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div id="el-170" className="space-y-4 p-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                </div>);

    }

    if (error) {
      return (
        <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>);

    }

    if (result) {
      return (
        <div id="prioritize-result-content" className="animate-in fade-in-50">
                    <h3 id="el-171" className="font-bold text-lg mb-2">Prioritized List</h3>
                    <ol id="el-172" className="list-decimal list-inside space-y-1 mb-6 rounded-md border p-4">
                        {result.prioritizedList.map((project, index) =>
            <li id="el-173" key={index} className="pl-2 font-medium">{project}</li>
            )}
                    </ol>
                    <h3 id="el-174" className="font-bold text-lg mb-2">Reasoning</h3>
                    <div id="el-175" className="p-4 rounded-md border bg-muted/20">
                        <BasicMarkdown text={result.reasoning} />
                    </div>
                </div>);

    }

    return (
      <div id="el-176" className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <BotMessageSquare className="h-12 w-12 mb-4" />
                <p id="el-177" className="text-lg font-medium">AI Analysis</p>
                <p id="el-178">Your AI-powered project priority list will appear here.</p>
            </div>);

  };

  return (
    <Card id="prioritize-result-card" className="min-h-[400px]">
            <CardHeader>
                <CardTitle>AI Recommendation</CardTitle>
                 <CardDescription>Here's what the AI suggests based on your input.</CardDescription>
            </CardHeader>
            <CardContent id="prioritize-result">
                {renderContent()}
            </CardContent>
        </Card>);

}