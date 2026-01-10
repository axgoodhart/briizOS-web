# ActionDeck Component ID Mapping

This document defines the semantic ID naming convention for all UI components in ActionDeck, enabling global CSS customization via `globals.css`.

## ID Naming Convention

**Format:** `{section}-{component}-{element}`

- **section:** Layout area (layout, dashboard, tasks, prioritize)
- **component:** Component name (kebab-case)
- **element:** Specific sub-element (optional)

## Component ID Registry

### Layout Components

#### App Sidebar (`src/components/layout/app-sidebar.tsx`)
- `#layout-sidebar` - Main sidebar container
- `#layout-sidebar-nav` - Navigation container
- `#layout-sidebar-logo` - Logo/home link
- `#layout-sidebar-nav-dashboard` - Dashboard nav link
- `#layout-sidebar-nav-tasks` - Tasks nav link
- `#layout-sidebar-nav-prioritize` - Prioritize nav link
- `#layout-sidebar-nav-import` - Import nav link
- `#layout-sidebar-domains` - Domain collapsible section
- `#layout-sidebar-domains-trigger` - Domain expand/collapse button
- `#layout-sidebar-settings` - Settings button

#### Header (`src/components/layout/header.tsx`)
- `#layout-header` - Main header container
- `#layout-header-mobile-trigger` - Mobile menu button
- `#layout-header-breadcrumb` - Breadcrumb navigation
- `#layout-header-theme-toggle` - Dark/light mode toggle
- `#layout-header-settings-trigger` - Settings button

#### Settings Modal (`src/components/layout/settings-modal.tsx`)
- `#layout-settings-modal` - Settings modal container
- `#layout-settings-sync-toggle` - Cloud sync toggle
- `#layout-settings-briizos-toggle` - BriizOS import toggle
- `#layout-settings-export-btn` - Export data button
- `#layout-settings-import-btn` - Import data button

---

### Dashboard Components

#### Project List (`src/components/dashboard/project-list.tsx`)
- `#dashboard-project-list` - Main project list container
- `#dashboard-toolbar` - Top toolbar
- `#dashboard-search` - Search bar
- `#dashboard-export-btn` - Export button
- `#dashboard-new-project-btn` - New project button
- `#dashboard-status-tabs` - Status filter tabs
- `#dashboard-project-grid` - Project card grid

#### Project Card (`src/components/dashboard/project-card.tsx`)
- `.dashboard-project-card` - Individual project card (class, multiple instances)
- `.dashboard-project-card-header` - Card header
- `.dashboard-project-card-title` - Project title
- `.dashboard-project-card-description` - Project description
- `.dashboard-project-card-content` - Card content area
- `.dashboard-project-card-footer` - Card footer with actions
- `.dashboard-project-card-domain-badge` - Domain badge
- `.dashboard-project-card-status-badge` - Status badge
- `.dashboard-project-card-progress-ring` - Progress indicator
- `.dashboard-project-card-view-btn` - View details button

#### Project Modal (`src/components/dashboard/project-modal.tsx`)
- `#dashboard-project-modal` - Project detail modal
- `#dashboard-project-modal-header` - Modal header
- `#dashboard-project-modal-content` - Modal content
- `#dashboard-project-modal-tasks` - Task list section
- `#dashboard-project-modal-milestones` - Milestones section
- `#dashboard-project-modal-edit-btn` - Edit button
- `#dashboard-project-modal-delete-btn` - Delete button

#### Project Form (`src/components/dashboard/project-form.tsx`)
- `#dashboard-project-form` - Project create/edit form
- `#dashboard-project-form-name` - Name input
- `#dashboard-project-form-description` - Description textarea
- `#dashboard-project-form-domain` - Domain select
- `#dashboard-project-form-status` - Status select
- `#dashboard-project-form-deadline` - Deadline picker
- `#dashboard-project-form-importance` - Importance slider
- `#dashboard-project-form-size` - Size input
- `#dashboard-project-form-tags` - Tags input
- `#dashboard-project-form-submit` - Submit button

#### Search Bar (`src/components/dashboard/search-bar.tsx`)
- `.dashboard-search-bar` - Search input component

#### Domain Filter Bar (`src/components/dashboard/domain-filter-bar.tsx`)
- `#dashboard-domain-filter` - Domain filter bar
- `.dashboard-domain-badge` - Individual domain badge (class)

#### Progress Chart (`src/components/dashboard/progress-chart.tsx`)
- `#dashboard-progress-chart` - Progress visualization chart

---

### Task Components

#### Task List (`src/components/tasks/task-list.tsx`)
- `#tasks-list` - Main task list container
- `#tasks-card` - Task list card
- `#tasks-input-form` - Add task form
- `#tasks-input-field` - Task input field
- `#tasks-add-btn` - Add task button
- `#tasks-ai-breakdown-btn` - AI breakdown button
- `#tasks-clarification-alert` - AI clarification alert
- `#tasks-pending-section` - Pending tasks section
- `#tasks-completed-section` - Completed tasks section

#### Task Item (`src/components/tasks/task-item.tsx`)
- `.tasks-item` - Individual task item (class)
- `.tasks-item-checkbox` - Task checkbox
- `.tasks-item-label` - Task label

#### Task Deck (`src/components/tasks/task-deck.tsx`)
- `.tasks-deck` - Task deck container (class)
- `.tasks-deck-header` - Deck header
- `.tasks-deck-title` - Deck title
- `.tasks-deck-progress` - Deck progress indicator
- `.tasks-deck-content` - Collapsible task list

---

### Prioritize Components

#### Prioritization Form (`src/components/prioritize/prioritization-form.tsx`)
- `#prioritize-form` - Main prioritization form
- `#prioritize-form-card` - Form card container
- `#prioritize-project-checkboxes` - Project selection area
- `#prioritize-goals-input` - User goals textarea
- `#prioritize-timing-input` - Timing/context textarea
- `#prioritize-submit-btn` - Submit button

#### Prioritization Result (`src/components/prioritize/prioritization-result.tsx`)
- `#prioritize-result` - Result display container
- `#prioritize-result-card` - Result card
- `#prioritize-result-content` - Result markdown content

---

### Common UI Components (shadcn/ui)

These components use **data attributes** for styling since they appear in multiple contexts:

- `[data-ui="button"]` - Button component
- `[data-ui="card"]` - Card component
- `[data-ui="input"]` - Input component
- `[data-ui="modal"]` - Dialog/Modal component
- `[data-ui="tooltip"]` - Tooltip component

---

## Usage in globals.css

Add custom styles using the IDs defined above:

```css
/* Example: Customize project cards */
.dashboard-project-card {
  border: 2px solid var(--primary);
  transition: transform 0.2s;
}

.dashboard-project-card:hover {
  transform: scale(1.02);
}

/* Example: Customize sidebar */
#layout-sidebar {
  background: linear-gradient(to bottom, var(--card), var(--background));
}

/* Example: Customize header */
#layout-header {
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
```

---

## Implementation Status

- [x] Layout components (sidebar, header, settings)
- [x] Dashboard components (project list, cards, modals)
- [x] Task components (task list, items, decks)
- [x] Prioritize components (form, results)
- [x] CSS section added to globals.css

All semantic IDs have been implemented and documented!
