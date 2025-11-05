# BriizOS Event Types Reference

Complete reference for all events emitted by briizOS tools. External apps can subscribe to these events using the SDK.

## Event Subscription

```javascript
// Subscribe to an event
briizOS.subscribeToAI('event.type', (eventData) => {
  console.log('Event received:', eventData);
});
```

---

## Panel Events

### `panel.created`
Emitted when a new panel is created.

**Tools that emit this:**
- `createNotePanel()`
- `duplicatePanel()`

**Event Data:**
```javascript
{
  eventType: 'panel.created',
  panel: {
    id: string,
    title: string,
    type: 'note' | 'timer' | 'external'
  }
}
```

**Example:**
```javascript
briizOS.subscribeToAI('panel.created', (event) => {
  console.log(`New panel: ${event.panel.title}`);
});
```

---

### `panel.updated`
Emitted when a panel property is modified.

**Tools that emit this:**
- `setPanelColor()` - property: 'color'
- `updateNoteContent()` - property: 'content'
- `movePanel()` - property: 'position'
- `resizePanel()` - property: 'size'
- `setPanelTitle()` - property: 'title'

**Event Data:**
```javascript
// Color update
{
  eventType: 'panel.updated',
  panel: {
    id: string,
    title: string,
    property: 'color',
    color: { h: number, s: number, l: number }
  }
}

// Content update
{
  eventType: 'panel.updated',
  panel: {
    id: string,
    title: string,
    property: 'content'
  }
}

// Position update
{
  eventType: 'panel.updated',
  panel: {
    id: string,
    title: string,
    property: 'position',
    position: { x: number, y: number }
  }
}

// Size update
{
  eventType: 'panel.updated',
  panel: {
    id: string,
    title: string,
    property: 'size',
    size: { width: number, height: number }
  }
}

// Title update
{
  eventType: 'panel.updated',
  panel: {
    id: string,
    oldTitle: string,
    newTitle: string,
    property: 'title'
  }
}
```

**Example:**
```javascript
briizOS.subscribeToAI('panel.updated', (event) => {
  if (event.panel.property === 'color') {
    console.log(`Panel ${event.panel.title} color changed to HSL(${event.panel.color.h}, ${event.panel.color.s}%, ${event.panel.color.l}%)`);
  }
});
```

---

### `panel.deleted`
Emitted when a panel is removed.

**Tools that emit this:**
- `deletePanel()`

**Event Data:**
```javascript
{
  eventType: 'panel.deleted',
  panel: {
    id: string,
    title: string
  }
}
```

**Example:**
```javascript
briizOS.subscribeToAI('panel.deleted', (event) => {
  console.log(`Panel deleted: ${event.panel.title}`);
});
```

---

### `panel.minimized`
Emitted when a panel is minimized.

**Tools that emit this:**
- `minimizePanel()`

**Event Data:**
```javascript
{
  eventType: 'panel.minimized',
  panel: {
    id: string,
    title: string
  }
}
```

---

### `panel.restored`
Emitted when a minimized panel is restored.

**Tools that emit this:**
- `restorePanel()`

**Event Data:**
```javascript
{
  eventType: 'panel.restored',
  panel: {
    id: string,
    title: string
  }
}
```

---

## Task Events

### `task.completed`
Emitted when a task is marked as complete.

**Tools that emit this:**
- `completeTask()`

**Event Data:**
```javascript
{
  eventType: 'task.completed',
  task: {
    id: string,
    name: string
  }
}
```

**Example:**
```javascript
briizOS.subscribeToAI('task.completed', (event) => {
  console.log(`Task completed: ${event.task.name}`);
  // Show celebration animation
  showConfetti();
});
```

---

## Workspace Events

### `workspace.organized`
Emitted when panels are reorganized.

**Tools that emit this:**
- `groupPanelsByType()` - action: 'groupByType'
- `stackPanelsVertically()` - action: 'stack'

**Event Data:**
```javascript
// Group by type
{
  eventType: 'workspace.organized',
  action: 'groupByType',
  panelCount: number,
  groupCount: number
}

// Stack vertically
{
  eventType: 'workspace.organized',
  action: 'stack',
  panelCount: number
}
```

**Example:**
```javascript
briizOS.subscribeToAI('workspace.organized', (event) => {
  if (event.action === 'groupByType') {
    console.log(`Organized ${event.panelCount} panels into ${event.groupCount} groups`);
  }
});
```

---

### `workspace.focused`
Emitted when focus mode is activated.

**Tools that emit this:**
- `focusMode()`

**Event Data:**
```javascript
{
  eventType: 'workspace.focused',
  focusPanel: {
    id: string,
    title: string
  },
  minimizedCount: number
}
```

**Example:**
```javascript
briizOS.subscribeToAI('workspace.focused', (event) => {
  console.log(`Focus mode: ${event.focusPanel.title} (${event.minimizedCount} panels minimized)`);
});
```

---

### `workspace.cleared`
Emitted when all panels are closed.

**Tools that emit this:**
- `closeAllPanels()`

**Event Data:**
```javascript
{
  eventType: 'workspace.cleared',
  deletedCount: number
}
```

**Example:**
```javascript
briizOS.subscribeToAI('workspace.cleared', (event) => {
  console.log(`Workspace cleared: ${event.deletedCount} panels deleted`);
  // Reset your app state
  resetAppState();
});
```

---

### `workspace.minimized`
Emitted when all panels are minimized.

**Tools that emit this:**
- `minimizeAllPanels()`

**Event Data:**
```javascript
{
  eventType: 'workspace.minimized',
  minimizedCount: number
}
```

---

## Complete Event Type List

### Panel Events (7 types)
- `panel.created`
- `panel.updated`
- `panel.deleted`
- `panel.minimized`
- `panel.restored`

### Task Events (1 type)
- `task.completed`

### Workspace Events (4 types)
- `workspace.organized`
- `workspace.focused`
- `workspace.cleared`
- `workspace.minimized`

**Total: 12 event types**

---

## Usage Patterns

### Listen to All Panel Changes
```javascript
['panel.created', 'panel.updated', 'panel.deleted', 'panel.minimized', 'panel.restored'].forEach(eventType => {
  briizOS.subscribeToAI(eventType, (event) => {
    console.log(`Panel event: ${event.eventType}`, event);
  });
});
```

### React to Workspace Changes
```javascript
['workspace.organized', 'workspace.focused', 'workspace.cleared', 'workspace.minimized'].forEach(eventType => {
  briizOS.subscribeToAI(eventType, (event) => {
    console.log(`Workspace event: ${event.eventType}`, event);
    refreshMyApp();
  });
});
```

### Build Activity Feed
```javascript
const activityLog = [];

const allEvents = [
  'panel.created', 'panel.updated', 'panel.deleted',
  'task.completed',
  'workspace.organized', 'workspace.focused'
];

allEvents.forEach(eventType => {
  briizOS.subscribeToAI(eventType, (event) => {
    activityLog.push({
      timestamp: Date.now(),
      type: event.eventType,
      data: event
    });
    updateActivityFeed();
  });
});
```

### Sync External State
```javascript
briizOS.subscribeToAI('task.completed', async (event) => {
  // Update external database when task completes in briizOS
  await fetch('/api/tasks/sync', {
    method: 'POST',
    body: JSON.stringify({
      taskId: event.task.id,
      completed: true
    })
  });
});
```

---

## Best Practices

1. **Subscribe Early**: Set up event subscriptions in your app's init function, before other logic runs.

2. **Handle Errors**: Wrap event handlers in try-catch to prevent one event from breaking your app.
   ```javascript
   briizOS.subscribeToAI('panel.created', (event) => {
     try {
       handlePanelCreated(event);
     } catch (error) {
       console.error('Event handler error:', error);
     }
   });
   ```

3. **Debounce Frequent Events**: If `panel.updated` fires rapidly (e.g., during dragging), debounce your handler.
   ```javascript
   let timeout;
   briizOS.subscribeToAI('panel.updated', (event) => {
     clearTimeout(timeout);
     timeout = setTimeout(() => {
       handlePanelUpdate(event);
     }, 300);
   });
   ```

4. **Filter by Property**: When listening to `panel.updated`, filter by the property you care about.
   ```javascript
   briizOS.subscribeToAI('panel.updated', (event) => {
     if (event.panel.property === 'color') {
       updateColorPicker(event.panel.color);
     }
   });
   ```

5. **Clean Up**: If your app unmounts (SPAs), remember that subscriptions persist. The SDK currently doesn't support unsubscribe, so design handlers to be idempotent.
