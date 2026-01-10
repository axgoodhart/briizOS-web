'use client';

import React from 'react';
import { DOMAIN_LIST, type DomainConfig } from '@/lib/domains';
import type { Domain } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

interface DomainFilterBarProps {
  selectedDomain: Domain | null;
  onDomainChange: (domain: Domain | null) => void;
  className?: string;
}

export function DomainFilterBar({
  selectedDomain,
  onDomainChange,
  className
}: DomainFilterBarProps) {
  return (
    <div id="el-19" className={cn('w-full', className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div id="el-20" className="flex gap-2 pb-3 px-1">
          {/* All domains button */}
          <button id="el-21"
          onClick={() => onDomainChange(null)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            'border whitespace-nowrap shrink-0',
            selectedDomain === null ?
            'bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border-teal-400/50 text-teal-100 shadow-lg shadow-teal-500/20' :
            'bg-black/30 border-white/10 text-white/70 hover:border-white/30 hover:text-white'
          )}>

            <LayoutGrid className="h-4 w-4" />
            All
          </button>

          {/* Domain buttons */}
          {DOMAIN_LIST.map((domain) => {
            const Icon = domain.icon;
            const isSelected = selectedDomain === domain.value;

            return (
              <button id="el-22"
              key={domain.value}
              onClick={() => onDomainChange(domain.value)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                'border whitespace-nowrap shrink-0',
                isSelected ?
                'border-transparent text-white shadow-lg' :
                'bg-black/30 border-white/10 text-white/70 hover:border-white/30 hover:text-white'
              )}
              style={
              isSelected ?
              {
                background: domain.bgGradient,
                boxShadow: `0 4px 15px ${domain.color}40`
              } :
              undefined
              }>

                <Icon className="h-4 w-4" />
                {domain.label}
              </button>);

          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>);

}

// Compact version for sidebar
export function DomainIconBar({
  selectedDomain,
  onDomainChange,
  className
}: DomainFilterBarProps) {
  return (
    <div id="el-23" className={cn('flex flex-wrap gap-1', className)}>
      {DOMAIN_LIST.map((domain) => {
        const Icon = domain.icon;
        const isSelected = selectedDomain === domain.value;

        return (
          <button id="el-24"
          key={domain.value}
          onClick={() => onDomainChange(isSelected ? null : domain.value)}
          title={domain.label}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            isSelected ?
            'text-white' :
            'text-white/50 hover:text-white/80 hover:bg-white/5'
          )}
          style={
          isSelected ?
          {
            background: domain.bgGradient,
            boxShadow: `0 2px 8px ${domain.color}40`
          } :
          undefined
          }>

            <Icon className="h-4 w-4" />
          </button>);

      })}
    </div>);

}

// Badge component for displaying domain on cards
export function DomainBadge({
  domain,
  size = 'default',
  className




}: {domain: Domain;size?: 'small' | 'default';className?: string;}) {
  const config = DOMAIN_LIST.find((d) => d.value === domain);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div id="el-25"
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full text-white font-medium',
      size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      className
    )}
    style={{
      background: config.bgGradient,
      boxShadow: `0 2px 8px ${config.color}30`
    }}>

      <Icon className={size === 'small' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </div>);

}