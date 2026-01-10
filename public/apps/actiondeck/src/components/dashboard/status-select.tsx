'use client';

import React from 'react';
import type { ProjectStatus } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/domains';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { cn } from '@/lib/utils';
import { Play, Pause, CheckCircle2, Archive } from 'lucide-react';

const STATUS_ICONS: Record<ProjectStatus, React.ComponentType<{className?: string;}>> = {
  active: Play,
  paused: Pause,
  done: CheckCircle2,
  archived: Archive
};

interface StatusSelectProps {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  className?: string;
}

export function StatusSelect({ value, onChange, className }: StatusSelectProps) {
  const config = STATUS_CONFIG[value];
  const Icon = STATUS_ICONS[value];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ProjectStatus)}>
      <SelectTrigger className={cn('w-[140px]', className)}>
        <SelectValue>
          <div id="el-105" className="flex items-center gap-2" style={{ color: config.color }}>
            <Icon className="h-4 w-4" />
            <span id="el-106">{config.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => {
          const statusConfig = STATUS_CONFIG[status];
          const StatusIcon = STATUS_ICONS[status];
          return (
            <SelectItem key={status} value={status}>
              <div id="el-107" className="flex items-center gap-2" style={{ color: statusConfig.color }}>
                <StatusIcon className="h-4 w-4" />
                <span id="el-108">{statusConfig.label}</span>
              </div>
            </SelectItem>);

        })}
      </SelectContent>
    </Select>);

}

// Badge version for display on cards
export function StatusBadge({
  status,
  size = 'default',
  className




}: {status: ProjectStatus;size?: 'small' | 'default';className?: string;}) {
  const config = STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];

  return (
    <div id="el-109"
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      className
    )}
    style={{
      backgroundColor: config.bgColor,
      color: config.color
    }}>

      <Icon className={size === 'small' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </div>);

}

// Quick status buttons for modal
export function StatusButtons({
  value,
  onChange,
  className
}: StatusSelectProps) {
  return (
    <div id="el-110" className={cn('flex gap-2 flex-wrap', className)}>
      {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = STATUS_ICONS[status];
        const isActive = value === status;

        return (
          <button id="el-111"
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            'border',
            isActive ?
            'border-transparent' :
            'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50'
          )}
          style={
          isActive ?
          {
            backgroundColor: config.bgColor,
            color: config.color,
            borderColor: config.color
          } :
          undefined
          }>

            <Icon className="h-4 w-4" />
            {config.label}
          </button>);

      })}
    </div>);

}