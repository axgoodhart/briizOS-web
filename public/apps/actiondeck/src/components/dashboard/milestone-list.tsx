'use client';

import React, { useState } from 'react';
import type { Milestone } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown, Trash2, Plus, Milestone as MilestoneIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneListProps {
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
  readOnly?: boolean;
}

export function MilestoneList({ milestones, onChange, readOnly = false }: MilestoneListProps) {
  const [newMilestoneName, setNewMilestoneName] = useState('');

  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMilestoneName.trim();
    if (!name) return;

    const newMilestone: Milestone = {
      id: `ms-${Date.now()}`,
      name,
      completed: false,
      order: milestones.length
    };

    onChange([...milestones, newMilestone]);
    setNewMilestoneName('');
  };

  const handleToggle = (id: string) => {
    onChange(
      milestones.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m
      )
    );
  };

  const handleDelete = (id: string) => {
    const filtered = milestones.filter((m) => m.id !== id);
    // Re-order remaining milestones
    const reordered = filtered.map((m, index) => ({ ...m, order: index }));
    onChange(reordered);
  };

  const handleMoveUp = (id: string) => {
    const index = sortedMilestones.findIndex((m) => m.id === id);
    if (index <= 0) return;

    const updated = sortedMilestones.map((m, i) => {
      if (i === index) return { ...m, order: m.order - 1 };
      if (i === index - 1) return { ...m, order: m.order + 1 };
      return m;
    });

    onChange(updated);
  };

  const handleMoveDown = (id: string) => {
    const index = sortedMilestones.findIndex((m) => m.id === id);
    if (index >= sortedMilestones.length - 1) return;

    const updated = sortedMilestones.map((m, i) => {
      if (i === index) return { ...m, order: m.order + 1 };
      if (i === index + 1) return { ...m, order: m.order - 1 };
      return m;
    });

    onChange(updated);
  };

  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div id="el-26" className="space-y-4">
      <div id="el-27" className="flex items-center justify-between">
        <div id="el-28" className="flex items-center gap-2">
          <MilestoneIcon className="h-5 w-5 text-primary" />
          <h3 id="el-29" className="text-lg font-medium">Milestones</h3>
        </div>
        <span id="el-30" className="text-sm text-muted-foreground">
          {completedCount}/{milestones.length} complete
        </span>
      </div>

      {!readOnly &&
      <form id="el-31" onSubmit={handleAddMilestone} className="flex gap-2">
          <Input
          placeholder="Add a milestone..."
          value={newMilestoneName}
          onChange={(e) => setNewMilestoneName(e.target.value)}
          className="flex-1" />

          <Button type="submit" variant="secondary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </form>
      }

      <div id="el-32" className="space-y-2">
        {sortedMilestones.length === 0 ?
        <p id="el-33" className="text-sm text-muted-foreground text-center py-4">
            No milestones yet. Add your first project phase above.
          </p> :

        sortedMilestones.map((milestone, index) =>
        <div id="el-34"
        key={milestone.id}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
          milestone.completed ?
          'bg-primary/5 border-primary/20' :
          'bg-muted/30 border-border/50 hover:border-border'
        )}>

              <Checkbox
            id={`milestone-${milestone.id}`}
            checked={milestone.completed}
            onCheckedChange={() => !readOnly && handleToggle(milestone.id)}
            disabled={readOnly} />

              <Label
            htmlFor={`milestone-${milestone.id}`}
            className={cn(
              'flex-1 cursor-pointer font-medium',
              milestone.completed && 'line-through text-muted-foreground'
            )}>

                <span id="el-35" className="text-xs text-muted-foreground mr-2">
                  Phase {index + 1}:
                </span>
                {milestone.name}
              </Label>

              {!readOnly &&
          <div id="el-36" className="flex items-center gap-1">
                  <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMoveUp(milestone.id)}
              disabled={index === 0}
              className="h-7 w-7 p-0">

                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMoveDown(milestone.id)}
              disabled={index === sortedMilestones.length - 1}
              className="h-7 w-7 p-0">

                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(milestone.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive">

                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
          }
            </div>
        )
        }
      </div>
    </div>);

}