// Context Provider - Builds context about current briizOS state for AI

class ContextProvider {
  constructor() {
    this.lastUpdate = null;
  }

  // Get current context for AI
  getContext() {
    const context = {
      timestamp: new Date().toISOString(),
      currentTime: this.getCurrentTime(),
      panels: this.getPanelsContext(),
      tasks: this.getTasksContext(),
      events: this.getEventsContext(),
      organizer: this.getOrganizerContext()
    };

    this.lastUpdate = Date.now();
    return context;
  }

  // Format context as string for system prompt
  formatContextString() {
    const ctx = this.getContext();

    return `
# Current BriizOS State

**Time:** ${ctx.currentTime}

## Active Panels (${ctx.panels.count})
${ctx.panels.list.length === 0 ? 'No panels currently active.' : ctx.panels.list.map(p =>
  `- ${p.type}: "${p.title}" ${p.minimized ? '(minimized)' : ''}${p.preview ? `\n  Preview: ${p.preview}` : ''}`
).join('\n')}

## Recent Tasks (${ctx.tasks.count})
${ctx.tasks.list.length === 0 ? 'No active tasks.' : ctx.tasks.list.slice(0, 5).map(t =>
  `- ${t.name}${t.due ? ` (due: ${t.due})` : ''}${t.completed ? ' ✓' : ''}`
).join('\n')}

## Upcoming Events (${ctx.events.count})
${ctx.events.list.length === 0 ? 'No upcoming events.' : ctx.events.list.slice(0, 5).map(e =>
  `- ${e.date}: ${e.name}`
).join('\n')}

## Organizer Summary
- Total items: ${ctx.organizer.totalItems}
- Active items: ${ctx.organizer.activeItems}
`.trim();
  }

  // Get current time formatted
  getCurrentTime() {
    const now = new Date();
    return now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get panels context
  getPanelsContext() {
    const state = window.appState || window.state;

    if (!state || !state.panels) {
      return { count: 0, list: [] };
    }

    const activePanels = state.panels.filter(p => p.active !== false);
    const panelManager = window.panelManager;
    const minimized = panelManager ? panelManager.minStack || [] : [];

    const list = activePanels.map(p => {
      const info = {
        id: p.id,
        type: p.type,
        title: p.title || 'Untitled',
        minimized: minimized.includes(String(p.id)),
        position: { x: p.x, y: p.y },
        size: { w: p.w, h: p.h }
      };
      // Include a content preview for note panels so the AI knows what's in them
      if (p.type === 'note' && p.content) {
        info.preview = p.content.substring(0, 120) + (p.content.length > 120 ? '...' : '');
      }
      return info;
    });

    return {
      count: activePanels.length,
      list,
      types: this.countByType(activePanels)
    };
  }

  // Get tasks context
  getTasksContext() {
    const items = window.OrganizerStore?.items || [];
    const tasks = items.filter(item =>
      (item.type === 'task' || (item.type === 'note' && item.due))
    );

    const activeTasks = tasks.filter(t => !t.completedAt && t.status !== 'done');
    const sorted = activeTasks.sort((a, b) => {
      const dateA = new Date(a.due || a.scheduledDate || '2100-01-01');
      const dateB = new Date(b.due || b.scheduledDate || '2100-01-01');
      return dateA - dateB;
    });

    const list = sorted.map(t => ({
      id: t.id,
      name: t.name || 'Untitled',
      due: t.due || t.scheduledDate,
      completed: t.completed || false,
      tag: t.tag
    }));

    return {
      count: activeTasks.length,
      list,
      completedCount: tasks.filter(t => t.completed).length
    };
  }

  // Get events context
  getEventsContext() {
    const items = window.OrganizerStore?.items || [];
    const events = items.filter(item => item.type === 'event');

    const now = new Date();
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.scheduledDate || e.due || e.dateValue);
      return eventDate >= now;
    });

    const sorted = upcomingEvents.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.due || a.dateValue);
      const dateB = new Date(b.scheduledDate || b.due || b.dateValue);
      return dateA - dateB;
    });

    const list = sorted.map(e => ({
      id: e.id,
      name: e.name || 'Untitled',
      date: e.scheduledDate || e.due || e.dateValue,
      tag: e.tag,
      recurring: !!e.recurrence
    }));

    return {
      count: upcomingEvents.length,
      list,
      pastCount: events.length - upcomingEvents.length
    };
  }

  // Get organizer context
  getOrganizerContext() {
    const items = window.OrganizerStore?.items || [];

    return {
      totalItems: items.length,
      activeItems: items.filter(i => !i.completed && !i.archived).length,
      byType: this.countByType(items),
      byTag: this.countByTag(items)
    };
  }

  // Helper: Count items by type
  countByType(items) {
    const counts = {};
    items.forEach(item => {
      const type = item.type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }

  // Helper: Count items by tag
  countByTag(items) {
    const counts = {};
    items.forEach(item => {
      const tag = item.tag || 'none';
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return counts;
  }

  // Get a compact context for each message (to save tokens)
  getCompactContext() {
    const ctx = this.getContext();

    return {
      time: ctx.currentTime,
      panels_count: ctx.panels.count,
      active_tasks: ctx.tasks.count,
      upcoming_events: ctx.events.count
    };
  }

  // Subscribe to state updates
  subscribeToUpdates(callback) {
    window.addEventListener('briizos-state-update', (event) => {
      callback(this.getContext());
    });
  }
}

// Export to global scope
window.ContextProvider = ContextProvider;

// Auto-initialize
if (!window.contextProvider) {
  window.contextProvider = new ContextProvider();
}
