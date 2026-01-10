# ActionDeck

### web app for project tracking, deployed and hosted live on private password-protected website

## Build, Test & Lint Commands

       From package.json:
       - dev: next dev --turbopack -p 9002 - Start development server with
       Turbopack on port 9002
       - build: next build - Build for production
       - start: next start - Start production server
       - lint: next lint - Run ESLint
       - typecheck: tsc --noEmit - TypeScript type checking without emitting
        files
       - genkit:dev: genkit start -- tsx src/ai/dev.ts - Start Genkit AI
       development server
       - genkit:watch: genkit start -- tsx --watch src/ai/dev.ts - Watch
       mode for Genkit flows

## High-Level Architecture

       ActionDeck is a Next.js 15 + React 18 full-stack task management
       application with AI-powered features, Firebase integration, and a
       component-based architecture.

       Project Name: Action Deck
       Subtitle: Casual todos and personal project management

       Core Technology Stack:
       - Framework: Next.js 15.3.3 with App Router
       - Language: TypeScript 5
       - UI Framework: React 18.3.1
       - Component Library: shadcn/ui (Radix UI primitives)
       - Styling: Tailwind CSS 3.4.1 with custom CSS variables
       - Backend/Database: Firebase (Auth, Firestore)
       - AI/LLM: Google Genkit 1.14.1 with Gemini 2.5 Flash model
       - Forms: React Hook Form + Zod validation
       - Charts: Recharts 2.15.1
       - Icons: Lucide React 0.475.0
       - Date Handling: date-fns 3.6.0
       - Theming: next-themes with dark/light mode support

## Key Files & Directory Structure

       src/
       ├── app/                          # Next.js App Router pages
       │   ├── layout.tsx                # Root layout with ThemeProvider
       │   ├── page.tsx                  # Redirects to /dashboard
       │   ├── login/page.tsx            # Authentication page
       │   └── (app)/                    # Protected routes group
       │       ├── layout.tsx            # App shell with sidebar & header
       │       ├── dashboard/page.tsx    # Main dashboard view
       │       ├── tasks/page.tsx        # Casual tasks view
       │       ├── prioritize/page.tsx   # AI prioritization tool
       │       └── settings/page.tsx     # User settings
       ├── ai/                           # Genkit AI flows
       │   ├── genkit.ts                 # Genkit config with Google AI
       plugin
       │   ├── dev.ts                    # AI development entry point
       │   └── flows/
       │       ├── breakdown-task-flow.ts       # Task decomposition with
       LLM
       │       └── intelligent-project-prioritization.ts # Priority ranking
       flow
       ├── components/
       │   ├── ui/                       # shadcn/ui primitive components
       (38+ files)
       │   ├── layout/
       │   │   ├── app-sidebar.tsx       # Side navigation
       │   │   └── header.tsx            # Top header bar
       │   ├── dashboard/
       │   │   ├── project-list.tsx      # Project grid display
       │   │   ├── project-card.tsx      # Individual project card
       │   │   ├── project-form.tsx      # Create/edit project modal
       │   │   ├── project-modal.tsx     # Project detail modal
       │   │   ├── dashboard-summary.tsx # Overview stats
       │   │   └── progress-chart.tsx    # Visual progress indicators
       │   ├── tasks/                    # Casual task components
       │   ├── prioritize/               # Prioritization tool UI
       │   ├── icons/                    # Custom SVG icons
       │   ├── theme-provider.tsx        # Next-themes wrapper
       │   └── theme-toggle.tsx          # Dark/light mode switcher
       ├── context/
       │   ├── project-context.tsx       # Project state management (CRUD +
       Firebase sync)
       │   └── settings-context.tsx      # User settings state (Firebase
       persistence)
       ├── hooks/
       │   ├── use-toast.ts              # Toast notifications
       │   └── use-mobile.tsx            # Responsive mobile detection
       ├── lib/
       │   ├── types.ts                  # TypeScript type definitions
       (Project, Task, TaskDeck)
       │   ├── firebase.ts               # Firebase app initialization
       │   ├── persistence.ts            # Firestore CRUD operations
       │   ├── briizos.ts                # Integration with briizOS
       │   ├── utils.ts                  # Utility functions
       │   ├── actions.ts                # Server actions
       │   ├── data.ts                   # Default/sample data
       │   └── placeholder-images.json   # Asset references
       ├── styles/
       │   └── dashboard.css             # Dashboard-specific styling
       └── globals.css                   # Global CSS with Tailwind
       directives + theme variables

       Configuration Files:
       ├── package.json                  # Dependencies & scripts
       ├── tsconfig.json                 # TypeScript configuration with @/*
        path alias
       ├── next.config.ts                # Next.js config (image patterns,
       error handling)
       ├── tailwind.config.ts            # Tailwind theme customization
       ├── components.json               # shadcn/ui CLI config
       ├── postcss.config.mjs            # PostCSS setup for Tailwind
       ├── .env                          # Firebase & Gemini API keys
       ├── apphosting.yaml               # Firebase App Hosting config
       └── .firebaserc                   # Firebase project config

## State Management & Data Flow

       Context-Based Architecture:
       1. ProjectProvider (src/context/project-context.tsx)
         - Manages projects and tasks
         - Handles offline/online modes
         - Firebase Firestore sync when authenticated
         - Falls back to localStorage in offline mode
         - Read-only mode when sync is disabled
       2. SettingsProvider (src/context/settings-context.tsx)
         - User preferences (enableSync, importBriizOS)
         - Firebase persistence per user
         - Watches auth state changes

       Data Persistence Flow:
       - Authenticated users: Cloud source of truth (Firestore)
       - Offline users: localStorage (read-only)
       - Path: users/{uid}/apps/actionDeck/*

## Core Features

       From docs/blueprint.md:

       1. Casual Task List - Simple to-do management
       2. Project Dashboard - Multi-project management with progress
       tracking
       3. Dynamic Modals - Detailed project/task information
       4. Progress Charts - Visual project progress using Recharts
       5. Intelligent Prioritization Tool - AI-powered project ranking using
        Genkit + Gemini
       6. Import/Export - JSON import and export of projects and tasks
       7. Theme Options - Light/dark mode toggle

## Import/Export

       Location: Settings Modal (src/components/layout/settings-modal.tsx)

       Export Schema:
       {
         "projects": Project[],
         "casualTasks": TaskListItem[]
       }

       Project Schema:
       {
         "id": string,           // Unique identifier
         "name": string,         // Project name
         "description": string,  // Brief description
         "deadline": string,     // YYYY-MM-DD format
         "importance": number,   // 1-10 priority level
         "size": number,         // Estimated hours
         "relevance": string,    // Context/why it matters
         "coverImage": string,   // Optional URL
         "tasks": Task[]         // Array of tasks
       }

       Task Schema:
       {
         "id": string,
         "title": string,
         "completed": boolean
       }

       Import Behavior:
       - Uses Firestore setDoc with { merge: true }
       - Projects/tasks with matching IDs are MERGED (fields updated)
       - New IDs are ADDED as new entries
       - Existing data with different IDs is PRESERVED (not deleted)
       - Requires authentication and cloud sync enabled

       AI-Assisted Import:
       - See project-import-prompt.txt for a prompt template
       - Use with any LLM to generate valid import JSON from natural language

## Design System

### Color Scheme (CSS variables in globals.css):

       - Background: Near-black (210 30% 15%)
       - Foreground: Light grey (180 15% 92%)
       - Primary: Teal gradient (neon cyber theme inspired by briizOS)
       - Secondary: Configurable via CSS variables
       - Accent: Sky Blue for interactive elements
       - Charts: 5 distinct colors for data visualization

### Typography:

       - Body: Jost (sans-serif) - clean, readable
       - Headlines: Nokie (display font) - large titles
       - Monospace: Playwrite NL - code snippets
       - Custom font imports in layout.tsx

### GUI/UI

      - 38+ pre-built components (buttons, dialogs, forms, etc.)
       - CSS variables for theming

## AI Integration (Genkit)

       Setup (src/ai/genkit.ts):
       - Uses Google Genkit framework
       - Model: googleai/gemini-2.5-flash
       - Plugin: Google AI

### Flows

       #### 1. breakdown-task-flow.ts - Task decomposition
         - Input: High-level goal + optional context
         - Output: Array of actionable tasks OR clarifying question
         - Uses schema validation with Zod
       #### 2. intelligent-project-prioritization.ts - Project ranking
         - Analyzes deadline, importance, size, relevance
         - Outputs reasoning in markdown format

## Key Conventions & Patterns Found

       1. Naming:
         - Components: PascalCase (e.g., ProjectList, DashboardSummary)
         - Files: kebab-case for files (e.g., project-context.tsx)
         - Hooks: use prefix for custom hooks
       2. Component Structure:
         - 'use client' directive for client components
         - Server-side components by default in App Router
         - Context providers wrap route groups
       3. Error Handling:
         - TypeScript strict mode enabled
         - Type-safe database operations with Firestore
         - Zod schema validation for forms and AI inputs
       4. Environment Variables:
         - NEXT_PUBLIC_* prefix for public Firebase/API keys
         - GEMINI_API_KEY for server-side AI
         - NEXT_PUBLIC_ENABLE_FIRESTORE_SYNC for feature flagging
       5. Styling:
         - Tailwind utility classes
         - CSS modules not used (utility-first approach)
         - Custom CSS variables for theming
         - No PostCSS plugins beyond Tailwind
       6. Build Configuration:
         - typescript.ignoreBuildErrors: true in next.config.ts
         - eslint.ignoreDuringBuilds: true in next.config.ts
         - Remote image patterns whitelisted (unsplash, placehold.co,
       picsum.photos)
       7. Testing/Linting:
         - No Jest/testing framework configured
         - ESLint via Next.js built-in linter
         - TypeScript strict checking available

       ---
       Authentication & Authorization
       - Securely served noncached website via Firebase Securestack (beta)
       - Provider: Firebase Authentication
       - State: Tracked via onAuthStateChanged in contexts
       - Protected Routes: All routes in (app) group require auth
       - Login Page: /login public route

## Performance Optimizations

       - Next.js 15 with Turbopack for faster builds
       - Incremental TypeScript compilation
       - Image optimization with remote pattern configuration
       - dynamic = 'force-dynamic' for app routes (Firebase real-time sync)

## Project-Specific Notes

       3. Firebase Integration: Tightly integrated with Cloud Firestore and
       Authentication
       4. Read-only Offline Mode: Data modifications disabled when sync is
       off
       5. BriizOS Integration: References to importing from parent briizOS
       project
       6. Development AI Server: Genkit flows run separately via genkit:dev
       command

## Code Statistics

       - Total LOC: ~6,806 lines of TypeScript/TSX
       - Main modules:
         - Context/Hooks: 209 lines
         - Components: ~4,000 lines
         - Library utilities: ~400 lines
         - UI components (shadcn): ~2,200 lines

       This is a modern, well-structured Next.js application with
       enterprise-grade patterns, Firebase backend, and AI-powered features
       using Google Genkit.
