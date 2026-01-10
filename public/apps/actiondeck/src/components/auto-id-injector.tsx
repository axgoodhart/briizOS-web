'use client';

import { useEffect } from 'react';

/**
 * Generates a stable, human-readable data-id attribute based on:
 * 1. Element's class names (if meaningful)
 * 2. Element's text content (first few words)
 * 3. Element's tag name
 * 4. Element's role/aria attributes
 *
 * This creates stable selectors that survive DOM restructuring.
 *
 * Examples:
 * - [data-id="button-view-details"]
 * - [data-id="card-project-card"]
 * - [data-id="input-search-projects"]
 */
function generateStableDataId(element: Element): string {
  const parts: string[] = [];

  // 1. Add tag name
  const tag = element.tagName.toLowerCase();
  parts.push(tag);

  // 2. Add meaningful class names (filter out utility classes)
  const classes = element.className.toString().split(/\s+/);
  const meaningfulClasses = classes.filter(c =>
    c &&
    !c.startsWith('css-') &&
    !c.match(/^(w-|h-|p-|m-|text-|bg-|flex|grid|absolute|relative|rounded|border|shadow)/) &&
    c.length > 2
  );

  if (meaningfulClasses.length > 0) {
    // Take first meaningful class
    parts.push(meaningfulClasses[0].replace(/[^a-z0-9-]/gi, '-').toLowerCase());
  }

  // 3. Add text content hint (first 2-3 words, max 30 chars)
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 0 && textContent.length < 100) {
    const words = textContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('-')
      .substring(0, 30);

    if (words.length > 2) {
      parts.push(words);
    }
  }

  // 4. Add role/aria label if present
  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');

  if (role) {
    parts.push(role);
  } else if (ariaLabel) {
    const label = ariaLabel.toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 20);
    parts.push(label);
  }

  return parts.filter(p => p).join('-').replace(/-+/g, '-').substring(0, 80);
}

/**
 * Automatically adds data-id attributes to ALL DOM elements.
 *
 * These are more stable than position-based IDs because they're based on:
 * - Class names
 * - Text content
 * - Semantic attributes
 *
 * You can target them in CSS like:
 * [data-id="button-view-details"] { }
 * [data-id*="project-card"] { }
 * [data-id^="input-search"] { }
 */
export function AutoIdInjector() {
  useEffect(() => {
    const assignDataIds = () => {
      const allElements = document.body.querySelectorAll('*');
      const seenIds = new Map<string, number>();

      allElements.forEach((element) => {
        // Skip script, style, and meta elements
        if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD'].includes(element.tagName)) {
          return;
        }

        // Generate stable data-id
        let dataId = generateStableDataId(element);

        // Handle duplicates by adding a counter
        if (seenIds.has(dataId)) {
          const count = seenIds.get(dataId)! + 1;
          seenIds.set(dataId, count);
          dataId = `${dataId}-${count}`;
        } else {
          seenIds.set(dataId, 0);
        }

        // Set the data-id attribute
        element.setAttribute('data-id', dataId);
      });
    };

    // Run on initial mount
    assignDataIds();

    // Watch for DOM changes
    const observer = new MutationObserver(() => {
      assignDataIds();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
