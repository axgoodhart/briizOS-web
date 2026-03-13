# briizOS.Web Firestore Schema Map (`public/index.html`)

This table reflects what `public/index.html` writes to Firestore today.
Verification pass also checked `public/modules/chat-module/*.js` and `public/google-calendar-sync.js` for additional Firestore writes or indirect writes via `window.persistence`.

| Firestore path | Fields written | Nomenclature notes |
| --- | --- | --- |
| `users/{uid}/panels/{panelId}` | `id`, `type`, `title`, `content`, `tags[]`, `orgId`, `active`, `chat{provider,model}`, `externalUrl`, `externalShowUrl`, `externalData`, `subtype`, `x`, `y`, `autoHeight`, `createdAt`, `updatedAt`, `customColor`, `expansionCount`, optional `w`, optional `h` | Mostly camelCase. `updatedAt` is forced to Firestore `serverTimestamp()` on write; `createdAt` is numeric epoch ms. |
| `users/{uid}/tasks/{taskId}` | Raw task object (common keys: `id`, `text`, `priority`, `created`, `createdAt`, `updatedAt`, `dueDate`, `completed`, `completedAt`, `position{x,y}`) plus forced `updatedAt` | Mixed timestamp naming: both `created` and `createdAt` are used. |
| `users/{uid}/events/{eventId}` | Raw event object plus forced `updatedAt` (common keys: `id`, `date`, `text`, `name`, `scheduledDate`, `dateValue`, `created`, `createdAt`, `updatedAt`, optional integration keys like `googleCalendarId`) | Mixed timestamp naming and mixed event shapes (calendar/event sources write different fields). |
| `users/{uid}/organizer/{itemId}` | Raw organizer item object (created with keys including `id`, `type`, `name`, `body`, `createdAt`, `updatedAt`, `scheduledDate`, `start`, `end`, `due`, `duration`, `completedAt`, `status`, `priority`, `tags[]`, `groupMemberships[]`, `inStream`, `attachments[]`, `source`, `links[]`, `panelType`, `panelId`, `accent`, `owner`, `visibility`, `chat`, `external`, `dateMode`, `dateValue`, `reminderEventId`, `recurrence`, `syncSource`, `macosEventIdentifier`, `macosCalendarIdentifier`, `lastModified`, `history[]`) plus forced `updatedAt` | Predominantly camelCase; date semantics are split across `scheduledDate`, `due`, `dateMode`, `dateValue`. |
| `users/{uid}/app/minStack` | `value` (array of minimized panel IDs), `updatedAt` | Singleton doc under `app/`, with payload wrapped in `value`. |
| `users/{uid}/app/timer` | `mode`, `running`, `paused`, `startTime`, `endTime`, `defaultTimer`, `remaining`, `elapsed`, `compact`, `needsAck`, `ts`, `updatedAt` | CamelCase plus short key `ts`. |
| `users/{uid}/app/orgFilterSort` | `activeFilter`, `activeSort`, `sortDirection`, `sortAscending`, `updatedAt` | CamelCase UI-state doc. |
| `users/{uid}/app/migration` | `v1_migrated`, `migrated_at`, `old_client_ts` | Mixed style in one doc (`v1_migrated` + snake_case keys). |
| `users/{uid}/snapshots/app` | `__ver`, `panels`, `panelMinStack`, `tasks`, `events`, `organizer`, `thoughtstream`, `calendar`, `chatThreads`, `stats`, `updatedAt`, `clientTs` | Mixed conventions (`__ver`, camelCase, plus nested `chatThreads[*]={lastTs,count}`). |
| `users/{uid}/snapshots/history/{clientTs}` | `clientTs`, `__ver`, `updatedAt` | History pointer docs keyed by timestamp-like doc ID. |

Additional behavior: `users/{uid}/panels/{panelId}` and `users/{uid}/organizer/{itemId}` are deleted via `deleteDoc` when items are removed.

## Verified Non-Firestore Persistence (Important for Reconciliation)

| Concern | Storage location | Key/schema |
| --- | --- | --- |
| Chat conversation history (chat-module widget, including fixed chat) | `localStorage` | `briizos.chatHistory.{panelId}` -> `{ messages[], timestamp, flagged, preview }` |
| Chat collapsed state | `sessionStorage` | `cw-collapsed-{panelId}` |
| Chat provider/model/prompt/params settings | `localStorage` | `briizos.chatSettings.v1` |
| Chat settings snapshots/history | `localStorage` | `briizos.chatHistory.v1` |
| Chat API keys used by chat-module | `localStorage` | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |
| Visual filter settings (archive/filter modal) | `localStorage` | `glOS.archive.filters` -> `{ b, c, s, h, sp, inv }` |
| Background selection | `localStorage` | `glOS.background` |
| Organizer filter/sort UI state | `localStorage` + Firestore mirror | `orgFilterSort` locally, mirrored to `users/{uid}/app/orgFilterSort` in Firestore |
| Google Calendar auth session | `localStorage` | `gcal_user`, `gcal_auth_time` |

Notes:
- `public/modules/chat-module/*.js` does not call Firestore directly.
- `public/google-calendar-sync.js` writes to Firestore indirectly by calling `window.persistence.saveEvent(...)`, which lands in `users/{uid}/events/{eventId}`.
