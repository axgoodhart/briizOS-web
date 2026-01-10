'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Task } from '@/lib/types';
import React, { useEffect, useState } from 'react';

export function ProgressChart({ tasks }: {tasks: Task[];}) {
  const [isClient, setIsClient] = useState(false);
  const [chartColors, setChartColors] = useState({ completed: '', pending: '' });

  useEffect(() => {
    setIsClient(true);
    // This is safe because it's in a useEffect, which only runs on the client.
    const computedStyle = getComputedStyle(document.documentElement);
    setChartColors({
      completed: `hsl(${computedStyle.getPropertyValue('--primary').trim()})`,
      pending: `hsl(${computedStyle.getPropertyValue('--muted').trim()})`
    });
  }, []);

  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.length - completed;

  const data = [
  { name: 'Tasks', completed: completed, pending: pending }];


  if (!isClient) {
    return <div id="el-37" className="h-[24px] w-full animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div id="el-38" style={{ width: '100%', height: '24px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
          layout="vertical"
          data={data}
          stackOffset="expand"
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>

                    <XAxis hide type="number" />
                    <YAxis hide type="category" dataKey="name" />
                    <Tooltip
            cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
            contentStyle={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)'
            }}
            formatter={(value, name) => {
              const label = String(name);
              return [`${value} tasks`, label.charAt(0).toUpperCase() + label.slice(1)];
            }} />

                    <Bar dataKey="completed" fill={chartColors.completed} stackId="a" radius={[5, 0, 0, 5]} />
                    <Bar dataKey="pending" fill={chartColors.pending} stackId="a" radius={[0, 5, 5, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>);

}