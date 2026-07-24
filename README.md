# Stru — Structured Focus System

A lightweight, client-side productivity app for managing tasks and running timed focus sessions. No build step, no backend — just HTML, React, and localStorage.

---

## How it works

Stru runs entirely in the browser. Open `index.html` and the app is live. All data is stored in `localStorage`, so nothing is sent to a server and everything persists between page reloads.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 18 (loaded via CDN) |
| Styling | Tailwind CSS (Play CDN — supports arbitrary values like `bg-[#hex]`) |
| Templating | Babel Standalone (transpiles JSX in the browser at runtime) |
| Routing | Custom hash-based router (`#/home`, `#/session`, etc.) |
| Persistence | `localStorage` |

Because everything is loaded via CDN and transpiled at runtime, there is **no build step** — editing a file and refreshing the browser is all that's needed to see changes.

---

## File structure

```
stru codex/
├── index.html              # Entry point — loads all scripts in order
├── state.js                # Global state: constants, priority definitions, normalization helpers, usePersistedState
├── router.js               # Hash-based router (go(), useRoute())
├── icons.js                # Lucide icon components exposed on window.Stru.Icons
├── app.jsx                 # Root React component — owns all state, session/break logic, and screen rendering
├── modals.jsx              # All modal/dialog components (AddTask, EditTask, Settings, etc.)
├── screens/
│   ├── home.jsx            # Dashboard: task overview, quick actions, completion ring
│   ├── masterlist.jsx      # Full task list with priority filtering and batch actions
│   ├── plan-session.jsx    # Session planner: pick duration and tasks
│   ├── session.jsx         # Active session screen with timer, task list, and focus mode
│   ├── break.jsx           # Break timer screen
│   ├── session-log.jsx     # Log of sessions and breaks for the current workday
│   ├── daily-report.jsx    # End-of-day summary
│   └── history.jsx         # Past workday history
└── stru-logo.png
```

### Load order matters

`index.html` loads scripts in a strict order:

1. `state.js` — must be first (everything else depends on `window.Stru`)
2. `router.js`
3. `icons.js`
4. All screen files
5. `modals.jsx`
6. `app.jsx` — must be last (mounts the React app)

---

## Key architectural patterns

### Global namespace
Everything is attached to `window.Stru`. Screens register themselves as `Stru.Screens.ScreenName`, modals as `Stru.Modals.ModalName`. `app.jsx` references them all from there.

### State management
`app.jsx` owns the top-level state (tasks, sessions, breaks, active session, etc.) using `usePersistedState` from `state.js`, which wraps React's `useState` and syncs to `localStorage` automatically.

### Priority system
Priorities are defined in `state.js` under `Stru.constants.priorityColors` and `PRIORITY_ORDER`. `PRIORITY_ORDER`/`label`/`dot` are centralized there; each screen (`session.jsx`, `masterlist.jsx`, `plan-session.jsx`, `home.jsx`, and `modals.jsx`'s `AddTaskModal`) still keeps its own local `bg`/`border`/`text` shade object (deliberately not identical — Master List/Session/Home use a more saturated shade than the lighter one used elsewhere) — **all copies must be kept in sync** when adding or changing a priority tier.

Current priority order (high → low):
`urgent` → `top` → `high` → `normal` → `low` → `optional` → `""` (no priority). New tasks default to `normal`. `Stru.constants.PRIORITY_ALIASES` maps legacy values (`must`, `should`, `could`, `personal`, `nice`, `want`, and older loose synonyms) to their new canonical key, so old stored data is transparently migrated the first time it's normalized — never write a task with a legacy priority string directly.

### Modes
Above Lists sits a fixed set of **Modes** (`Stru.constants.MODES`: Zen Habits, CBF, Personal) — the user works in exactly one active mode at a time (`activeModeId` in `app.jsx`, persisted). Every list has a `modeId`; Master List, Plan Session, and the active session are all scoped to the active mode, while History/Daily Report/Session Log stay pooled across all modes by design. Each mode has exactly one permanent, non-deletable **Vault** list (`isVault: true`) for tasks the user wants out of sight — movable to with a single click from Master List, always sorted last in the list-tabs row.

### Session timer
The timer is wall-clock based, not tick-counted. `sessionTargetTimeRef` holds an absolute timestamp for when the session ends. Each tick recalculates `Math.ceil((targetTime - Date.now()) / 1000)`. This means the timer is immune to the computer sleeping or going idle — if the machine wakes up after the session should have ended, the duration is capped at the scheduled end time, not the wake time.

---

## Making changes

Since there's no build step, the workflow is:

1. Edit the relevant `.jsx` or `.js` file
2. Refresh `index.html` in the browser to test
3. Commit and push when happy (see below)

---

## Committing and pushing

### First time on a new machine
If Git throws an SSL certificate error on push, run this once to fix it:
```bash
git config --global http.sslBackend schannel
```

### Normal commit + push
```bash
git add <file1> <file2> ...
git commit -m "Short description of what changed"
git push
```

Or to stage all modified files at once:
```bash
git add -u
git commit -m "Short description of what changed"
git push
```

### If the branch has no upstream yet (first push on a new clone)
```bash
git push --set-upstream origin main
```

---

## localStorage keys

| Key | Contents |
|---|---|
| `stru-tasks` | Array of task objects |
| `stru-lists` | Array of list objects |
| `stru-sessions` | Array of completed session objects |
| `stru-breaks` | Array of completed break objects |
| `stru-workevents` | Workday start/end event log |
| `stru-history` | Array of past workday summaries |
| `stru-active-session` | The currently running session (if any) |
