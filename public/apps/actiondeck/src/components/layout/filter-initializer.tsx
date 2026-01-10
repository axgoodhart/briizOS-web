'use client';

import { useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import { applyFiltersToDocument, defaultFilters, FilterSettings } from './filters-modal';

export function FilterInitializer() {
  const { settings, isReady } = useSettings();

  useEffect(() => {
    if (isReady) {
      const filters = settings.filters || defaultFilters;
      applyFiltersToDocument(filters as FilterSettings);
    }
  }, [settings.filters, isReady]);

  return null;
}
