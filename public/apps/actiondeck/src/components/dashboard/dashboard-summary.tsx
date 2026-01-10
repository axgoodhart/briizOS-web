
'use client';

import { useProjects } from '@/context/project-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import React, { useState, useEffect } from 'react';
import { ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, addDays } from 'date-fns';

export function DashboardSummary() {
  const { projects, updateProject, addProject } = useProjects();
  const [isClient, setIsClient] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickMode, setQuickMode] = useState<string>('new');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalProjects = projects.length;
  const allTasks = projects.flatMap((p) => p.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  const chartData = [
  { name: 'Pending', value: pendingTasks, fill: 'hsl(var(--chart-3))' },
  { name: 'Completed', value: completedTasks, fill: 'hsl(var(--chart-1))' }];


  const totalCompleted = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const handleQuickSubmit = () => {
    const text = quickText.trim();
    if (!text) return;
    if (quickMode === 'new') {
      // Create minimal project
      const twoWeeks = addDays(new Date(), 14);
      addProject({
        name: text,
        description: '',
        deadline: format(twoWeeks, 'yyyy-MM-dd'),
        importance: 5,
        size: 10,
        relevance: '',
        coverImage: '' as any
      } as any);
    } else {
      const proj = projects.find((p) => p.id === quickMode);
      if (proj) {
        const newTask = { id: `ptask-${Date.now()}`, title: text, completed: false };
        updateProject({ ...proj, tasks: [newTask, ...proj.tasks] });
      }
    }
    setQuickText('');
  };


  return (
    <Card className="dashboard-card shadow-lg neon-glow">
      <CardHeader>
        <div id="el-0" className="flex items-center justify-between">
          <div id="el-1" className="space-y-1 dashboard-header">
            <h1 id="el-2" className="text-2xl font-bold tracking-tight">Smart Dashboard</h1>
          </div>
        </div>
      </CardHeader>
      <CardContent>
      <div id="el-3" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left side: Summary Cards and Filter */}
        <div id="el-4" className="md:col-span-1 space-y-4">
          <div id="el-5" className="grid grid-cols-3 gap-4">
              <Card className="dashboard-metrics-card">
                <CardHeader className="p-4 flex flex-col items-center justify-center space-y-2 text-teal-100">
                   <CardTitle className="text-3xl font-bold">{totalProjects}</CardTitle>
                   <ListTodo className="h-5 w-5 text-cyan-200/80" />
                </CardHeader>
              </Card>
              <Card className="dashboard-metrics-card">
                <CardHeader className="p-4 flex flex-col items-center justify-center space-y-2 text-teal-100">
                   <CardTitle className="text-3xl font-bold">{completedTasks}</CardTitle>
                   <CheckCircle2 className="h-5 w-5 text-cyan-200/80" />
                </CardHeader>
              </Card>
              <Card className="dashboard-metrics-card">
                <CardHeader className="p-4 flex flex-col items-center justify-center space-y-2 text-teal-100">
                   <CardTitle className="text-3xl font-bold">{pendingTasks}</CardTitle>
                   <Circle className="h-5 w-5 text-cyan-200/80" />
                </CardHeader>
              </Card>
          </div>
          <Select defaultValue="7">
            <SelectTrigger className="dashboard-input dashboard-select">
              <SelectValue placeholder="Select a time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="3">Last 3 days</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right side: Chart */}
        <div id="el-6" className="md:col-span-2">
            <Card className="h-full flex items-center justify-center p-4 dashboard-chart-card">
                 {isClient ?
              <div id="el-7" className="w-full h-full flex items-center justify-center">
                        <ChartContainer config={{}} className="mx-auto aspect-square max-h-[160px]">
                            <RadialBarChart
                    data={chartData}
                    innerRadius="60%"
                    outerRadius="110%"
                    startAngle={90}
                    endAngle={-270}>

                                <PolarAngleAxis type="number" domain={[0, totalCompleted]} tick={false} />
                                <RadialBar background={{ fill: 'rgba(255,255,255,0.1)' }} dataKey="value" cornerRadius={10} />
                                 <text id="el-8"
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white text-2xl font-bold">

                                    {totalTasks}
                                </text>
                            </RadialBarChart>
                        </ChartContainer>
                        <div id="el-9" className="ml-8 space-y-2 text-sm text-teal-100">
                            <div id="el-10" className="flex items-center gap-2">
                                <div id="el-11" className="h-3 w-3 rounded-full bg-[hsl(var(--chart-3))]"></div>
                                <span id="el-12">{pendingTasks} Pending</span>
                            </div>
                            <div id="el-13" className="flex items-center gap-2">
                                <div id="el-14" className="h-3 w-3 rounded-full bg-[hsl(var(--chart-1))]"></div>
                                <span id="el-15">{completedTasks} Complete</span>
                            </div>
                        </div>
                    </div> :

              <div id="el-16" className="h-[160px] w-full flex items-center justify-center">
                        <p id="el-17">Loading chart...</p>
                    </div>
              }
            </Card>
        </div>
      </div>
      <div id="el-18" className="dashboard-quick-row">
        <Input
            placeholder="Quick: create project or add task"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            className="dashboard-input" />

        <Select value={quickMode} onValueChange={setQuickMode}>
          <SelectTrigger className="dashboard-input dashboard-select">
            <SelectValue placeholder="Choose action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Create new project</SelectItem>
            {projects.map((p) =>
              <SelectItem key={p.id} value={p.id}>Add task to: {p.name}</SelectItem>
              )}
          </SelectContent>
        </Select>
        <Button onClick={handleQuickSubmit} className="dashboard-button-primary">Go</Button>
      </div>
      </CardContent>
    </Card>);

}