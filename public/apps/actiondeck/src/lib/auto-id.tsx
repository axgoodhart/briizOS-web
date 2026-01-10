'use client';

import React, { useEffect, useRef } from 'react';

let globalIdCounter = 0;

/**
 * Automatically assigns unique IDs to all DOM elements in the tree
 * This runs after React renders, traversing the actual DOM
 */
export function useAutoId(ref: React.RefObject<HTMLElement>, prefix = 'el') {
  useEffect(() => {
    if (!ref.current) return;

    const assignIds = (element: Element, parentPrefix: string) => {
      // Skip if already has an ID
      if (!element.id) {
        element.id = `${parentPrefix}-${globalIdCounter++}`;
      }

      // Recursively assign IDs to all children
      Array.from(element.children).forEach((child, index) => {
        assignIds(child, `${parentPrefix}-${index}`);
      });
    };

    assignIds(ref.current, prefix);
  }, [ref, prefix]);
}

/**
 * Higher-order component that automatically assigns IDs to all elements
 */
export function withAutoId<P extends object>(
  Component: React.ComponentType<P>,
  prefix?: string
) {
  return function AutoIdComponent(props: P) {
    const ref = useRef<HTMLDivElement>(null);
    useAutoId(ref, prefix || Component.displayName || Component.name || 'component');

    return (
      <div ref={ref} data-auto-id-wrapper>
        <Component {...props} />
      </div>
    );
  };
}
