// BriizOS Tools - Central registry and dispatcher for AI agent tools
// Handles tool execution with user confirmation

class BriizOSTools {
  constructor() {
    this.tools = {};
    this.registerAllTools();
  }

  // Event emission for external panels
  emitEvent(eventType, eventData) {
    if (window.externalManager && typeof window.externalManager.broadcastAIEvent === 'function') {
      window.externalManager.broadcastAIEvent(eventType, eventData);
    }
  }

  // Register all available tools
  registerAllTools() {
    // Read-only tools (Summarization)
    this.register('getScheduleSummary', this.getScheduleSummary, {
      requiresConfirmation: false,
      description: 'Get a summary of scheduled events',
      parameters: {
        time_range: { type: 'string', description: 'Time range: "today", "tomorrow", "this week", "next week", "all"' }
      }
    });

    this.register('searchNotes', this.searchNotes, {
      requiresConfirmation: false,
      description: 'Search through note panels',
      parameters: {
        query: { type: 'string', description: 'Search term' },
        topic_filter: { type: 'string', description: 'Optional: Filter by note title', optional: true }
      }
    });

    this.register('lookupOnline', this.lookupOnline, {
      requiresConfirmation: false,
      description: 'Search the web for information and optionally create a panel with results',
      parameters: {
        query: { type: 'string', description: 'Search query' },
        target: { type: 'string', description: 'Where to display results: "chat" (default), "new-panel", or panel ID/title', optional: true },
        source: { type: 'string', description: 'Specific source to search (e.g., "wikipedia", "news")', optional: true }
      }
    });

    this.register('findScheduleConflicts', this.findScheduleConflicts, {
      requiresConfirmation: false,
      description: 'Find overlapping events in schedule',
      parameters: {
        time_range: { type: 'string', description: 'Time range to check (optional)', optional: true }
      }
    });

    // Panel action tools (Read/Write - require confirmation)
    this.register('openPanel', this.openPanel, {
      requiresConfirmation: true,
      description: 'Open an existing panel by title',
      parameters: {
        panel_title: { type: 'string', description: 'Title of the panel to open' }
      }
    });

    this.register('startTimer', this.startTimer, {
      requiresConfirmation: true,
      description: 'Start a new timer',
      parameters: {
        duration_minutes: { type: 'number', description: 'Duration in minutes' },
        title: { type: 'string', description: 'Optional timer title', optional: true }
      }
    });

    this.register('tilePanels', this.tilePanels, {
      requiresConfirmation: true,
      description: 'Arrange all panels in a grid layout',
      parameters: {}
    });

    // Creation tools
    this.register('createPrioritizedTaskList', this.createPrioritizedTaskList, {
      requiresConfirmation: true,
      description: 'Create a prioritized list of tasks based on criteria',
      parameters: {
        criteria: { type: 'string', description: 'Filtering criteria (e.g., "due this week")' }
      }
    });

    // Calendar tools
    this.register('createSingleCalendarEvent', this.createSingleCalendarEvent, {
      requiresConfirmation: true,
      description: 'Create a single one-time calendar event with optional start time and duration',
      parameters: {
        title: { type: 'string', description: 'Event title' },
        date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Optional start time (e.g., "9am", "2:30pm", "14:00")', optional: true },
        duration: { type: 'number', description: 'Optional duration in minutes (default 60)', optional: true }
      }
    });

    this.register('updateCalendarEvent', this.updateCalendarEvent, {
      requiresConfirmation: true,
      description: 'Update an existing calendar event',
      parameters: {
        event_title: { type: 'string', description: 'Title of the event to update' },
        target_date: { type: 'string', description: 'Current date to find the event (optional)', optional: true },
        new_date: { type: 'string', description: 'New date for the event' }
      }
    });

    this.register('createRecurringCalendarEvent', this.createRecurringCalendarEvent, {
      requiresConfirmation: true,
      description: 'Create a new recurring calendar event',
      parameters: {
        title: { type: 'string', description: 'Event title' },
        recurrence_type: { type: 'string', description: 'Recurrence type: "weekly" or "monthly"' },
        days_of_week: { type: 'array', description: 'Days of week as numbers (0=Sun, 1=Mon, ..., 6=Sat). Required for weekly.' },
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format', optional: true },
        time: { type: 'string', description: 'Optional start time (e.g., "9am", "2:30pm", "14:00")', optional: true },
        duration: { type: 'number', description: 'Optional duration in minutes (default 60)', optional: true }
      }
    });

    this.register('createThoughtStream', this.createThoughtStream, {
      requiresConfirmation: true,
      description: 'Create a floating thoughtstream task that appears on screen',
      parameters: {
        text: { type: 'string', description: 'Task text' },
        priority: { type: 'string', description: 'Priority: "high", "medium", or "low" (optional)', optional: true },
        due_date: { type: 'string', description: 'Optional due date in YYYY-MM-DD format', optional: true }
      }
    });

    // PHASE 1: Core AI Tool Expansion
    this.register('createNotePanel', this.createNotePanel, {
      requiresConfirmation: true,
      description: 'Create a new note panel with content',
      parameters: {
        title: { type: 'string', description: 'Panel title' },
        content: { type: 'string', description: 'Initial content', optional: true }
      }
    });

    this.register('setPanelColor', this.setPanelColor, {
      requiresConfirmation: true,
      description: 'Change panel color using HSL values',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' },
        hue: { type: 'number', description: 'Hue (0-360)' },
        saturation: { type: 'number', description: 'Saturation (0-100)' },
        lightness: { type: 'number', description: 'Lightness (0-100)' }
      }
    });

    this.register('updateNoteContent', this.updateNoteContent, {
      requiresConfirmation: true,
      description: 'Update the content of a note panel. Appends by default; use mode "replace" to overwrite.',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' },
        new_content: { type: 'string', description: 'Content to add (or full replacement if mode is "replace")' },
        mode: { type: 'string', description: '"append" (default) or "replace"', optional: true }
      }
    });

    this.register('completeTask', this.completeTask, {
      requiresConfirmation: true,
      description: 'Mark a task as completed',
      parameters: {
        task_id: { type: 'string', description: 'Task ID or name' }
      }
    });

    this.register('movePanel', this.movePanel, {
      requiresConfirmation: true,
      description: 'Move panel to specific coordinates',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' },
        x: { type: 'number', description: 'X position in pixels' },
        y: { type: 'number', description: 'Y position in pixels' }
      }
    });

    this.register('resizePanel', this.resizePanel, {
      requiresConfirmation: true,
      description: 'Resize panel to specific dimensions',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' },
        width: { type: 'number', description: 'Width in pixels' },
        height: { type: 'number', description: 'Height in pixels' }
      }
    });

    // PHASE 2: Advanced Panel Operations
    this.register('duplicatePanel', this.duplicatePanel, {
      requiresConfirmation: true,
      description: 'Duplicate an existing panel',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title to duplicate' }
      }
    });

    this.register('deletePanel', this.deletePanel, {
      requiresConfirmation: true,
      description: 'Delete a panel',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title to delete' }
      }
    });

    this.register('minimizePanel', this.minimizePanel, {
      requiresConfirmation: true,
      description: 'Minimize a panel',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' }
      }
    });

    this.register('restorePanel', this.restorePanel, {
      requiresConfirmation: true,
      description: 'Restore a minimized panel',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or title' }
      }
    });

    this.register('setPanelTitle', this.setPanelTitle, {
      requiresConfirmation: true,
      description: 'Change panel title',
      parameters: {
        panel_id: { type: 'string', description: 'Panel ID or current title' },
        new_title: { type: 'string', description: 'New title' }
      }
    });

    // PHASE 3: Smart Organization Tools
    this.register('groupPanelsByType', this.groupPanelsByType, {
      requiresConfirmation: true,
      description: 'Auto-arrange panels grouped by type (notes, timers, external)',
      parameters: {}
    });

    this.register('focusMode', this.focusMode, {
      requiresConfirmation: true,
      description: 'Minimize all panels except specified one',
      parameters: {
        panel_id: { type: 'string', description: 'Panel to keep visible' }
      }
    });

    this.register('stackPanelsVertically', this.stackPanelsVertically, {
      requiresConfirmation: true,
      description: 'Arrange panels in a vertical stack',
      parameters: {
        panel_ids: { type: 'array', description: 'Panel IDs to stack (optional - defaults to all active)', optional: true }
      }
    });

    this.register('closeAllPanels', this.closeAllPanels, {
      requiresConfirmation: true,
      description: 'Close (delete) all panels',
      parameters: {
        confirm: { type: 'boolean', description: 'Confirmation flag' }
      }
    });

    this.register('minimizeAllPanels', this.minimizeAllPanels, {
      requiresConfirmation: true,
      description: 'Minimize all active panels',
      parameters: {}
    });
  }

  // Register a tool
  register(name, handler, config = {}) {
    this.tools[name] = {
      name,
      handler: handler.bind(this),
      requiresConfirmation: config.requiresConfirmation !== false,
      description: config.description || '',
      parameters: config.parameters || {}
    };
  }

  // Execute a tool
  async execute(toolName, params) {
    const tool = this.tools[toolName];
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // If tool requires confirmation, queue it
    if (tool.requiresConfirmation) {
      return new Promise((resolve, reject) => {
        window.confirmationUI.queueAction(
          toolName,
          params,
          async (confirmedParams) => {
            try {
              const result = await tool.handler(confirmedParams);
              window.confirmationUI.showSuccess(`${toolName} completed successfully`);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          () => {
            reject(new Error('Action cancelled by user'));
          }
        );
      });
    } else {
      // Execute immediately for read-only tools
      return await tool.handler(params);
    }
  }

  // Get all tool definitions for AI
  getToolDefinitions() {
    return Object.values(this.tools).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  // ========== HELPERS ==========

  // Parse a time string like "2:00pm", "14:00", "9am", "13:30" into minutes since midnight.
  // Returns null if unparseable.
  parseTimeString(str) {
    if (str == null) return null;
    // If already a number, treat as minutes since midnight
    if (typeof str === 'number') return str;
    str = String(str).trim().toLowerCase();

    // Try 24h format: "14:00", "9:30"
    let match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }

    // Try 12h format: "2:00pm", "9am", "12:30 am"
    match = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const period = match[3];
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    return null;
  }

  // Format minutes since midnight into a readable string like "2:00 PM"
  formatTime(minutes) {
    if (minutes == null) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  // ========== TOOL IMPLEMENTATIONS ==========

  // 1. Get Schedule Summary
  async getScheduleSummary(params) {
    const { time_range = 'all' } = params;
    const items = window.OrganizerStore?.items || [];
    const events = items.filter(item => item.type === 'event');

    // Calculate date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate, endDate;

    switch (time_range.toLowerCase()) {
      case 'today':
        startDate = today;
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'tomorrow':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'this week':
        startDate = today;
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'next week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 7);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      default:
        startDate = new Date(0);
        endDate = new Date('2100-01-01');
    }

    // Filter events in range
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.scheduledDate || event.due || event.dateValue);
      return eventDate >= startDate && eventDate < endDate;
    });

    // Format summary
    if (filteredEvents.length === 0) {
      return { summary: `No events scheduled for ${time_range}.`, events: [] };
    }

    // Sort by date
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.due || a.dateValue);
      const dateB = new Date(b.scheduledDate || b.due || b.dateValue);
      return dateA - dateB;
    });

    const summary = filteredEvents.map(event => {
      const date = new Date(event.scheduledDate || event.due || event.dateValue);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `- ${dateStr}: ${event.name || event.title || 'Untitled Event'}`;
    }).join('\n');

    return {
      summary: `Events for ${time_range}:\n${summary}`,
      events: filteredEvents,
      count: filteredEvents.length
    };
  }

  // 2. Search Notes
  async searchNotes(params) {
    const { query, topic_filter } = params;
    const state = window.appState || window.state;
    if (!state || !state.panels) {
      return { results: [], summary: 'No notes found.' };
    }

    const notePanels = state.panels.filter(p => p.type === 'note' && p.active !== false);
    let matchingNotes = [];

    for (const panel of notePanels) {
      const content = (panel.content || '').toLowerCase();
      const title = (panel.title || '').toLowerCase();
      const searchQuery = query.toLowerCase();
      const topicMatch = !topic_filter || title.includes(topic_filter.toLowerCase());

      if (topicMatch && (content.includes(searchQuery) || title.includes(searchQuery))) {
        // Find snippet
        const contentLower = panel.content || '';
        const index = contentLower.toLowerCase().indexOf(searchQuery);
        const snippetStart = Math.max(0, index - 50);
        const snippetEnd = Math.min(contentLower.length, index + searchQuery.length + 50);
        const snippet = contentLower.substring(snippetStart, snippetEnd);

        matchingNotes.push({
          title: panel.title,
          snippet: '...' + snippet + '...',
          id: panel.id
        });
      }
    }

    if (matchingNotes.length === 0) {
      return { results: [], summary: `No notes found matching "${query}".` };
    }

    const summary = matchingNotes.map(note =>
      `"${note.title}": ${note.snippet}`
    ).join('\n\n');

    return {
      results: matchingNotes,
      summary: `Found ${matchingNotes.length} note(s) matching "${query}":\n\n${summary}`,
      count: matchingNotes.length
    };
  }

  // 2b. Lookup Online (Web Search)
  async lookupOnline(params) {
    const { query, target = 'chat', source } = params;

    // For now, this is a placeholder implementation
    // In production, this would connect to a web search API (Google, DuckDuckGo, etc.)
    const searchInfo = `Searching for: "${query}"${source ? ` on ${source}` : ''}`;

    // Create a formatted response
    const response = {
      success: true,
      query: query,
      summary: `I would search the web for "${query}"${source ? ` on ${source}` : ''}, but web search API integration is not yet configured. To enable this feature, connect a web search API (Google Custom Search, SerpAPI, or DuckDuckGo) in the backend.`
    };

    // Handle different targets
    if (target === 'new-panel' || (target && target !== 'chat')) {
      // Create a note panel with the search information
      const panelTitle = target === 'new-panel' ? `Search: ${query.substring(0, 30)}${query.length > 30 ? '...' : ''}` : target;

      if (window.panelManager && typeof window.panelManager.createNewPanel === 'function') {
        const content = `# Search Query: ${query}\n\n${source ? `Source: ${source}\n\n` : ''}**Note:** Web search API integration needed. This panel is a placeholder for search results.\n\nTo implement:\n1. Connect to a web search API (Google Custom Search, SerpAPI, or DuckDuckGo)\n2. The results will automatically populate here`;

        await window.panelManager.createNewPanel('note', panelTitle, {
          content: content,
          source: 'ai-assistant'
        });

        response.panelCreated = true;
        response.panelTitle = panelTitle;
        response.summary = `Created panel "${panelTitle}" with search query. Configure web search API to populate results.`;
      }
    }

    return response;
  }

  // 3. Find Schedule Conflicts
  async findScheduleConflicts(params) {
    const { time_range = 'all' } = params;
    const items = window.OrganizerStore?.items || [];
    const events = items.filter(item => item.type === 'event' && (item.scheduledDate || item.dateValue));

    const conflicts = [];

    // Check each event against others
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const date1 = event1.scheduledDate || event1.dateValue;
        const date2 = event2.scheduledDate || event2.dateValue;

        // Events must be on the same date to conflict
        if (date1 !== date2) continue;

        // If both have time info, check for time overlap
        if (event1.start != null && event2.start != null) {
          const end1 = event1.end || (event1.start + (event1.duration || 60));
          const end2 = event2.end || (event2.start + (event2.duration || 60));
          // Overlap check: start1 < end2 AND start2 < end1
          if (event1.start < end2 && event2.start < end1) {
            conflicts.push({
              event1: event1.name || 'Untitled',
              event2: event2.name || 'Untitled',
              date: date1,
              timeOverlap: true
            });
          }
        } else {
          // No time info on one or both - flag as potential conflict on same day
          conflicts.push({
            event1: event1.name || 'Untitled',
            event2: event2.name || 'Untitled',
            date: date1,
            timeOverlap: false
          });
        }
      }
    }

    if (conflicts.length === 0) {
      return { conflicts: [], summary: 'No scheduling conflicts found.' };
    }

    const summary = conflicts.map(c =>
      `${c.date}: "${c.event1}" conflicts with "${c.event2}"${c.timeOverlap ? ' (time overlap)' : ' (same day)'}`
    ).join('\n');

    return {
      conflicts,
      summary: `Found ${conflicts.length} conflict(s):\n${summary}`,
      count: conflicts.length
    };
  }

  // 4. Open Panel
  async openPanel(params) {
    const { panel_title } = params;
    const state = window.appState || window.state;

    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    // Find panel by title
    const panel = state.panels.find(p =>
      (p.title || '').toLowerCase() === panel_title.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_title}" not found`);
    }

    // Activate panel
    if (panel.active === false) {
      panel.active = true;
      window.panelManager.refreshFromState();
      return { success: true, message: `Opened panel "${panel.title}"` };
    }

    return { success: true, message: `Panel "${panel.title}" is already open` };
  }

  // 5. Start Timer
  async startTimer(params) {
    try {
      window.timerApp?.show?.();
      // Optionally set duration if provided
      // We keep minimal behavior per request; advanced mapping later
      return { success: true, message: 'Opened timer' };
    } catch (e) {
      throw new Error('Unable to open timer');
    }
  }

  // 6. Tile Panels
  async tilePanels(params) {
    const state = window.appState || window.state;

    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    const activePanels = state.panels.filter(p => p.active !== false);

    if (activePanels.length === 0) {
      return { success: true, message: 'No panels to tile' };
    }

    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(activePanels.length));
    const rows = Math.ceil(activePanels.length / cols);

    const padding = 16;
    const viewportWidth = window.innerWidth - padding * 2;
    const viewportHeight = window.innerHeight - padding * 2;

    const panelWidth = Math.floor((viewportWidth - (cols - 1) * padding) / cols);
    const panelHeight = Math.floor((viewportHeight - (rows - 1) * padding) / rows);

    // Position each panel
    activePanels.forEach((panel, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      panel.x = padding + col * (panelWidth + padding);
      panel.y = padding + row * (panelHeight + padding);
      panel.w = panelWidth;
      panel.h = panelHeight;
    });

    // Refresh UI
    window.panelManager.refreshFromState();

    return {
      success: true,
      message: `Tiled ${activePanels.length} panels in a ${cols}x${rows} grid`
    };
  }

  // 7. Create Prioritized Task List
  async createPrioritizedTaskList(params) {
    const { criteria } = params;
    const items = window.OrganizerStore?.items || [];

    // Filter tasks based on criteria (use completedAt/status from current schema)
    let tasks = items.filter(item =>
      (item.type === 'task' || item.type === 'note') &&
      !item.completedAt && item.status !== 'done'
    );

    // Parse criteria (simple implementation)
    const criteriaLower = criteria.toLowerCase();

    if (criteriaLower.includes('this week')) {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      tasks = tasks.filter(task => {
        const dueDate = new Date(task.due || task.scheduledDate || task.dateValue);
        return dueDate <= weekEnd;
      });
    }

    // Sort by due date
    tasks.sort((a, b) => {
      const dateA = new Date(a.due || a.scheduledDate || a.dateValue || '2100-01-01');
      const dateB = new Date(b.due || b.scheduledDate || b.dateValue || '2100-01-01');
      return dateA - dateB;
    });

    // Format as markdown
    const markdown = `# Prioritized Tasks\n\n${
      tasks.length === 0 ? 'No tasks found matching criteria.' :
      tasks.map((task, i) => {
        const dueDate = task.due || task.scheduledDate || task.dateValue;
        const dateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date';
        return `${i + 1}. **${task.name || 'Untitled'}** - Due: ${dateStr}`;
      }).join('\n')
    }`;

    // Show in markdown modal
    if (window.markdownModal) {
      window.markdownModal.show(markdown);
    }

    return {
      success: true,
      message: `Created prioritized task list with ${tasks.length} tasks`,
      markdown
    };
  }

  // 8. Create Single Calendar Event
  async createSingleCalendarEvent(params) {
    const { title, date, time, duration } = params;

    if (!window.OrganizerStore) {
      throw new Error('Organizer not available');
    }

    const createArgs = {
      name: title,
      type: 'event',
      scheduledDate: date,
      dateMode: 'event',
      dateValue: date,
      source: { mode: 'ai-assistant' }
    };

    // Parse time string into minutes since midnight
    const parsedTime = this.parseTimeString(time);
    if (parsedTime != null) {
      createArgs.timeStart = parsedTime;
      createArgs.duration = duration || 60;
    }

    const event = window.OrganizerStore.create(createArgs);

    const timeStr = parsedTime != null ? ` at ${this.formatTime(parsedTime)}` : '';

    return {
      success: true,
      message: `Created event "${title}" on ${date}${timeStr}`,
      eventId: event.id
    };
  }

  // 9. Update Calendar Event
  async updateCalendarEvent(params) {
    const { event_title, target_date, new_date } = params;

    if (!window.OrganizerStore) {
      throw new Error('Organizer not available');
    }

    const items = window.OrganizerStore.items || [];

    // Find event
    let event = items.find(item =>
      item.type === 'event' &&
      (item.name || '').toLowerCase() === event_title.toLowerCase()
    );

    if (!event) {
      throw new Error(`Event "${event_title}" not found`);
    }

    // Update date
    const now = Date.now();
    event.scheduledDate = new_date;
    event.dateValue = new_date;
    event.updatedAt = now;
    event.lastModified = now;

    window.OrganizerStore.upsert(event);

    return {
      success: true,
      message: `Updated "${event_title}" to ${new_date}`
    };
  }

  // 10. Create Recurring Calendar Event
  async createRecurringCalendarEvent(params) {
    const { title, recurrence_type, days_of_week, start_date, time, duration } = params;

    if (!window.OrganizerStore) {
      throw new Error('Organizer not available');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const anchorDate = start_date || todayStr;

    // Build proper recurrence object matching the schema
    const endDate = new Date(anchorDate);
    endDate.setFullYear(endDate.getFullYear() + 2);

    const recurrence = {
      enabled: true,
      type: recurrence_type || 'weekly',
      daysOfWeek: days_of_week || [new Date(anchorDate + 'T12:00:00').getDay()],
      anchorDate: anchorDate,
      endDate: endDate.toISOString().split('T')[0]
    };

    const createArgs = {
      name: title,
      type: 'event',
      scheduledDate: anchorDate,
      dateMode: 'event',
      dateValue: anchorDate,
      recurrence: recurrence,
      source: { mode: 'ai-assistant' }
    };

    const parsedTime = this.parseTimeString(time);
    if (parsedTime != null) {
      createArgs.timeStart = parsedTime;
      createArgs.duration = duration || 60;
    }

    const event = window.OrganizerStore.create(createArgs);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysStr = (days_of_week || recurrence.daysOfWeek).map(d => dayNames[d]).join(', ');
    const timeStr = parsedTime != null ? ` at ${this.formatTime(parsedTime)}` : '';

    return {
      success: true,
      message: `Created recurring event "${title}" (${recurrence_type || 'weekly'} on ${daysStr}${timeStr})`,
      eventId: event.id
    };
  }

  // 11. Create ThoughtStream
  async createThoughtStream(params) {
    const { text, priority, due_date } = params;

    if (!window.taskManager) {
      throw new Error('TaskManager not available');
    }

    // Create the task using TaskManager
    const task = window.taskManager.createTask(
      text,
      priority || 'medium',
      due_date || null
    );

    return {
      success: true,
      message: `Created thoughtstream: "${text}"`,
      taskId: task.id,
      priority: task.priority
    };
  }

  // ========== PHASE 1: CORE AI TOOL EXPANSION ==========

  // 12. Create Note Panel
  async createNotePanel(params) {
    const { title, content } = params;

    if (!window.panelManager) {
      throw new Error('Panel manager not available');
    }

    // Create the panel using panel manager
    const panel = await window.panelManager.createPanel('note', title, {
      source: 'ai-assistant',
      content: content || ''
    });

    // If content was provided, set it
    if (content && panel && panel.id) {
      const state = window.appState || window.state;
      const createdPanel = state.panels.find(p => p.id === panel.id);
      if (createdPanel) {
        createdPanel.content = content;
        window.panelManager.refreshFromState();
      }
    }

    // Emit event
    this.emitEvent('panel.created', {
      panel: { id: panel?.id, title, type: 'note' }
    });

    return {
      success: true,
      message: `Created note panel "${title}"${content ? ' with content' : ''}`,
      panelId: panel?.id
    };
  }

  // 13. Set Panel Color
  async setPanelColor(params) {
    const { panel_id, hue, saturation, lightness } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Apply color using the existing applyPanelColor function
    // This function is in index.html around line 4947
    if (window.applyPanelColor) {
      window.applyPanelColor(panel.id, hue, saturation, lightness);
    } else {
      // Fallback: manually set the color
      panel.customColor = { h: hue, s: saturation, l: lightness };

      // Apply to DOM element
      const panelElement = document.getElementById(`panel-${panel.id}`);
      if (panelElement) {
        panelElement.style.setProperty('--panel-h', hue);
        panelElement.style.setProperty('--panel-s', `${saturation}%`);
        panelElement.style.setProperty('--panel-l', `${lightness}%`);
      }
    }

    // Emit event
    this.emitEvent('panel.updated', {
      panel: { id: panel.id, title: panel.title, property: 'color', color: { h: hue, s: saturation, l: lightness } }
    });

    return {
      success: true,
      message: `Set color for panel "${panel.title}" to HSL(${hue}, ${saturation}%, ${lightness}%)`,
      panelId: panel.id
    };
  }

  // 14. Update Note Content
  async updateNoteContent(params) {
    const { panel_id, new_content, mode } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    if (panel.type !== 'note') {
      throw new Error(`Panel "${panel.title}" is not a note panel (type: ${panel.type})`);
    }

    // Append by default, replace only if explicitly requested
    if (mode === 'replace') {
      panel.content = new_content;
    } else {
      const separator = panel.content && panel.content.trim() ? '\n\n' : '';
      panel.content = (panel.content || '') + separator + new_content;
    }
    panel.updatedAt = Date.now();

    // Refresh UI
    if (window.panelManager) {
      window.panelManager.refreshFromState();
    }

    // Emit event
    this.emitEvent('panel.updated', {
      panel: { id: panel.id, title: panel.title, property: 'content' }
    });

    const action = mode === 'replace' ? 'Replaced' : 'Appended to';
    return {
      success: true,
      message: `${action} content for note "${panel.title}"`,
      panelId: panel.id
    };
  }

  // 15. Complete Task
  async completeTask(params) {
    const { task_id } = params;

    if (!window.OrganizerStore) {
      throw new Error('Organizer not available');
    }

    const items = window.OrganizerStore.items || [];

    // Find task by ID or name
    const task = items.find(item =>
      (item.type === 'task' || item.type === 'note') &&
      (String(item.id) === String(task_id) ||
       (item.name || '').toLowerCase() === task_id.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${task_id}" not found`);
    }

    // Already completed?
    if (task.completedAt || task.status === 'done') {
      return {
        success: true,
        message: `Task "${task.name || 'Untitled'}" is already completed`,
        taskId: task.id
      };
    }

    // Use the proper toggleDone method which sets completedAt + status
    window.OrganizerStore.toggleDone(task.id);

    // Emit event
    this.emitEvent('task.completed', {
      task: { id: task.id, name: task.name || 'Untitled' }
    });

    return {
      success: true,
      message: `Completed task "${task.name || 'Untitled'}"`,
      taskId: task.id
    };
  }

  // 16. Move Panel
  async movePanel(params) {
    const { panel_id, x, y } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Update position
    panel.x = x;
    panel.y = y;
    panel.updatedAt = Date.now();

    // Refresh UI
    if (window.panelManager) {
      window.panelManager.refreshFromState();
    }

    // Emit event
    this.emitEvent('panel.updated', {
      panel: { id: panel.id, title: panel.title, property: 'position', position: { x, y } }
    });

    return {
      success: true,
      message: `Moved panel "${panel.title}" to (${x}, ${y})`,
      panelId: panel.id
    };
  }

  // 17. Resize Panel
  async resizePanel(params) {
    const { panel_id, width, height } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Update dimensions
    panel.w = width;
    panel.h = height;
    panel.autoHeight = false; // Disable auto-height when manually resizing
    panel.updatedAt = Date.now();

    // Refresh UI
    if (window.panelManager) {
      window.panelManager.refreshFromState();
    }

    // Emit event
    this.emitEvent('panel.updated', {
      panel: { id: panel.id, title: panel.title, property: 'size', size: { width, height } }
    });

    return {
      success: true,
      message: `Resized panel "${panel.title}" to ${width}x${height}`,
      panelId: panel.id
    };
  }

  // ========== PHASE 2: ADVANCED PANEL OPERATIONS ==========

  // 18. Duplicate Panel
  async duplicatePanel(params) {
    const { panel_id } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const sourcePanel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!sourcePanel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Create a copy
    const newPanel = {
      ...sourcePanel,
      id: Date.now().toString(),
      title: `${sourcePanel.title} (Copy)`,
      x: (sourcePanel.x || 0) + 30,
      y: (sourcePanel.y || 0) + 30,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add to state
    state.panels.push(newPanel);

    // Refresh UI
    window.panelManager.refreshFromState();

    // Emit event
    this.emitEvent('panel.created', {
      panel: { id: newPanel.id, title: newPanel.title, type: newPanel.type }
    });

    return {
      success: true,
      message: `Duplicated panel "${sourcePanel.title}"`,
      originalPanelId: sourcePanel.id,
      newPanelId: newPanel.id
    };
  }

  // 19. Delete Panel
  async deletePanel(params) {
    const { panel_id } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panelIndex = state.panels.findIndex(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (panelIndex === -1) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    const panel = state.panels[panelIndex];
    const panelTitle = panel.title;

    // Remove from state
    state.panels.splice(panelIndex, 1);

    // Remove DOM element
    const panelElement = document.getElementById(`panel-${panel.id}`);
    if (panelElement) {
      panelElement.remove();
    }

    // Refresh and save
    window.panelManager.refreshFromState();

    // Emit event
    this.emitEvent('panel.deleted', {
      panel: { id: panel.id, title: panelTitle }
    });

    return {
      success: true,
      message: `Deleted panel "${panelTitle}"`,
      deletedPanelId: panel.id
    };
  }

  // 20. Minimize Panel
  async minimizePanel(params) {
    const { panel_id } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Get DOM element and trigger minimize
    const panelElement = document.getElementById(`panel-${panel.id}`);
    if (panelElement) {
      panelElement.classList.add('panel-minimized');
    }

    panel.updatedAt = Date.now();

    // Emit event
    this.emitEvent('panel.minimized', {
      panel: { id: panel.id, title: panel.title }
    });

    return {
      success: true,
      message: `Minimized panel "${panel.title}"`,
      panelId: panel.id
    };
  }

  // 21. Restore Panel
  async restorePanel(params) {
    const { panel_id } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    // Get DOM element and restore
    const panelElement = document.getElementById(`panel-${panel.id}`);
    if (panelElement) {
      panelElement.classList.remove('panel-minimized');
    }

    panel.updatedAt = Date.now();

    // Emit event
    this.emitEvent('panel.restored', {
      panel: { id: panel.id, title: panel.title }
    });

    return {
      success: true,
      message: `Restored panel "${panel.title}"`,
      panelId: panel.id
    };
  }

  // 22. Set Panel Title
  async setPanelTitle(params) {
    const { panel_id, new_title } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    // Find panel by ID or title
    const panel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!panel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    const oldTitle = panel.title;
    panel.title = new_title;
    panel.updatedAt = Date.now();

    // Refresh UI
    window.panelManager.refreshFromState();

    // Emit event
    this.emitEvent('panel.updated', {
      panel: { id: panel.id, oldTitle, newTitle: new_title, property: 'title' }
    });

    return {
      success: true,
      message: `Renamed panel from "${oldTitle}" to "${new_title}"`,
      panelId: panel.id
    };
  }

  // ========== PHASE 3: SMART ORGANIZATION TOOLS ==========

  // 23. Group Panels By Type
  async groupPanelsByType(params) {
    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    const activePanels = state.panels.filter(p => p.active !== false);

    if (activePanels.length === 0) {
      return { success: true, message: 'No panels to organize' };
    }

    // Group by type
    const groups = {};
    activePanels.forEach(panel => {
      const type = panel.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(panel);
    });

    const padding = 16;
    const groupSpacing = 50;
    let currentX = padding;

    // Arrange each group vertically
    Object.entries(groups).forEach(([type, panels]) => {
      let currentY = padding;
      const maxWidth = Math.max(...panels.map(p => p.w || 400));

      panels.forEach((panel, index) => {
        panel.x = currentX;
        panel.y = currentY;
        currentY += (panel.h || 300) + padding;
        panel.updatedAt = Date.now();
      });

      currentX += maxWidth + groupSpacing;
    });

    // Refresh UI
    window.panelManager.refreshFromState();

    const typeNames = Object.keys(groups).join(', ');

    // Emit event
    this.emitEvent('workspace.organized', {
      action: 'groupByType',
      panelCount: activePanels.length,
      groupCount: Object.keys(groups).length
    });

    return {
      success: true,
      message: `Grouped ${activePanels.length} panels by type: ${typeNames}`,
      groupCount: Object.keys(groups).length
    };
  }

  // 24. Focus Mode
  async focusMode(params) {
    const { panel_id } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    // Find the focus panel
    const focusPanel = state.panels.find(p =>
      String(p.id) === String(panel_id) ||
      (p.title || '').toLowerCase() === panel_id.toLowerCase()
    );

    if (!focusPanel) {
      throw new Error(`Panel "${panel_id}" not found`);
    }

    let minimizedCount = 0;

    // Minimize all other panels
    state.panels.forEach(panel => {
      if (panel.id !== focusPanel.id && panel.active !== false) {
        const panelElement = document.getElementById(`panel-${panel.id}`);
        if (panelElement) {
          panelElement.classList.add('panel-minimized');
          minimizedCount++;
        }
      }
    });

    // Ensure focus panel is visible and restored
    const focusPanelElement = document.getElementById(`panel-${focusPanel.id}`);
    if (focusPanelElement) {
      focusPanelElement.classList.remove('panel-minimized');
    }

    // Emit event
    this.emitEvent('workspace.focused', {
      focusPanel: { id: focusPanel.id, title: focusPanel.title },
      minimizedCount
    });

    return {
      success: true,
      message: `Focus mode: "${focusPanel.title}" (minimized ${minimizedCount} other panels)`,
      focusPanelId: focusPanel.id,
      minimizedCount
    };
  }

  // 25. Stack Panels Vertically
  async stackPanelsVertically(params) {
    const { panel_ids } = params;

    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    // Determine which panels to stack
    let panelsToStack;
    if (panel_ids && Array.isArray(panel_ids)) {
      panelsToStack = state.panels.filter(p =>
        panel_ids.includes(String(p.id))
      );
    } else {
      panelsToStack = state.panels.filter(p => p.active !== false);
    }

    if (panelsToStack.length === 0) {
      return { success: true, message: 'No panels to stack' };
    }

    const padding = 16;
    const startX = padding;
    let currentY = padding;

    // Stack vertically
    panelsToStack.forEach(panel => {
      panel.x = startX;
      panel.y = currentY;
      currentY += (panel.h || 300) + padding;
      panel.updatedAt = Date.now();
    });

    // Refresh UI
    window.panelManager.refreshFromState();

    // Emit event
    this.emitEvent('workspace.organized', {
      action: 'stack',
      panelCount: panelsToStack.length
    });

    return {
      success: true,
      message: `Stacked ${panelsToStack.length} panels vertically`,
      panelCount: panelsToStack.length
    };
  }

  // 26. Close All Panels
  async closeAllPanels(params) {
    const { confirm } = params;

    if (!confirm) {
      throw new Error('Confirmation required to close all panels. Set confirm: true');
    }

    const state = window.appState || window.state;
    if (!state || !state.panels || !window.panelManager) {
      throw new Error('Panel system not available');
    }

    const panelCount = state.panels.length;

    // Remove all DOM elements
    state.panels.forEach(panel => {
      const panelElement = document.getElementById(`panel-${panel.id}`);
      if (panelElement) {
        panelElement.remove();
      }
    });

    // Clear panels array
    state.panels = [];

    // Refresh UI
    window.panelManager.refreshFromState();

    // Emit event
    this.emitEvent('workspace.cleared', {
      deletedCount: panelCount
    });

    return {
      success: true,
      message: `Closed all ${panelCount} panels`,
      deletedCount: panelCount
    };
  }

  // 27. Minimize All Panels
  async minimizeAllPanels(params) {
    const state = window.appState || window.state;
    if (!state || !state.panels) {
      throw new Error('Panel system not available');
    }

    const activePanels = state.panels.filter(p => p.active !== false);
    let minimizedCount = 0;

    // Minimize all active panels
    activePanels.forEach(panel => {
      const panelElement = document.getElementById(`panel-${panel.id}`);
      if (panelElement) {
        panelElement.classList.add('panel-minimized');
        minimizedCount++;
      }
    });

    // Emit event
    this.emitEvent('workspace.minimized', {
      minimizedCount
    });

    return {
      success: true,
      message: `Minimized all ${minimizedCount} panels`,
      minimizedCount
    };
  }
}


// Export to global scope
window.BriizOSTools = BriizOSTools;

// Auto-initialize
if (!window.briizTools) {
  window.briizTools = new BriizOSTools();
}
