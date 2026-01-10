'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogFooter } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/context/settings-context';

export type FilterSettings = {
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  sepia: number;
  invert: boolean;
  backgroundPanel: string;
};

export const defaultFilters: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  sepia: 0,
  invert: false,
  backgroundPanel: 'none',
};

const backgroundOptions = [
  { value: 'none', label: 'None' },
  { value: 'stars', label: 'Stars' },
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'waves', label: 'Waves' },
];

export function FiltersModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, updateSettings, isReady } = useSettings();

  // Local state for live preview
  const [filters, setFilters] = useState<FilterSettings>(defaultFilters);

  // Load from settings when modal opens
  useEffect(() => {
    if (open && isReady && settings.filters) {
      setFilters({ ...defaultFilters, ...settings.filters });
    }
  }, [open, isReady, settings.filters]);

  // Apply filter to document in real-time for preview
  useEffect(() => {
    if (open) {
      applyFiltersToDocument(filters);
    }
  }, [filters, open]);

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  const handleDone = async () => {
    await updateSettings({ filters });
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Revert to saved settings
    const saved = settings.filters || defaultFilters;
    applyFiltersToDocument(saved as FilterSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) handleCancel();
      else onOpenChange(v);
    }}>
      <DialogPortal>
        {/* Transparent overlay - allows seeing filter effects */}
        <DialogOverlay className="bg-transparent" />

        {/* Modal with strong shadow instead of overlay */}
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-primary/50 bg-background p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg shadow-[0_0_60px_20px_rgba(0,0,0,0.8),0_0_100px_40px_rgba(0,0,0,0.6)] border-t-2 border-t-primary"
        >
          <h2 className="font-headline text-2xl text-primary lowercase tracking-wide">filters</h2>

          <div className="space-y-6 py-4">
            {/* Brightness */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">
                Brightness {filters.brightness}%
              </Label>
              <Slider
                value={[filters.brightness]}
                onValueChange={([v]) => setFilters({ ...filters, brightness: v })}
                min={0}
                max={200}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Contrast */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">
                Contrast {filters.contrast}%
              </Label>
              <Slider
                value={[filters.contrast]}
                onValueChange={([v]) => setFilters({ ...filters, contrast: v })}
                min={0}
                max={200}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Saturate */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">
                Saturate {filters.saturate}%
              </Label>
              <Slider
                value={[filters.saturate]}
                onValueChange={([v]) => setFilters({ ...filters, saturate: v })}
                min={0}
                max={200}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Hue Rotate */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">
                Hue Rotate {filters.hueRotate}°
              </Label>
              <Slider
                value={[filters.hueRotate]}
                onValueChange={([v]) => setFilters({ ...filters, hueRotate: v })}
                min={0}
                max={360}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Sepia */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">
                Sepia {filters.sepia}%
              </Label>
              <Slider
                value={[filters.sepia]}
                onValueChange={([v]) => setFilters({ ...filters, sepia: v })}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Invert */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">Invert</Label>
              <Checkbox
                checked={filters.invert}
                onCheckedChange={(checked) => setFilters({ ...filters, invert: !!checked })}
                className="h-5 w-5"
              />
            </div>

            {/* Background Panel */}
            <div className="flex items-center justify-between gap-8">
              <Label className="text-base font-medium min-w-[140px]">Background Panel</Label>
              <Select
                value={filters.backgroundPanel}
                onValueChange={(v) => setFilters({ ...filters, backgroundPanel: v })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  {backgroundOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <Button onClick={handleDone}>Done</Button>
          </DialogFooter>

          {/* Close button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// Helper to apply CSS filters to the main app container
export function applyFiltersToDocument(filters: FilterSettings) {
  const appContainer = document.getElementById('app-filter-container');
  if (!appContainer) return;

  const filterString = [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturate}%)`,
    `hue-rotate(${filters.hueRotate}deg)`,
    `sepia(${filters.sepia}%)`,
    filters.invert ? 'invert(1)' : '',
  ].filter(Boolean).join(' ');

  appContainer.style.filter = filterString;

  // Apply background panel
  const bgContainer = document.getElementById('app-background-panel');
  if (bgContainer) {
    bgContainer.className = `app-background-panel bg-${filters.backgroundPanel}`;
  }
}
