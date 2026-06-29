// Stru Sync — import tasks from Stoa (localStorage) and Asana (REST API)
// Plain JavaScript, no JSX or build step required.
// Attaches to window.Stru.sync.
//
// Routing rules
// ─────────────────────────────────────────────────────────────────────────────
// Stoa tasks:
//   • In a folder/list named "CBF", or with taskType "CBF"
//       → Stru list "CBF"      priority: "could"  (Medium)
//   • Everything else
//       → Stru list "Personal" priority: "personal"
//
// Asana tasks:
//   • Name starts with "YouTube"
//       → Stru list "YouTube"  priority: "could"  (Medium)
//   • Everything else
//       → Stru default list    priority: "could"  (Medium)
//
// When to sync
// ─────────────────────────────────────────────────────────────────────────────
// Sync is triggered by two actions only:
//   1. Clicking "Start Day"  — app.jsx calls Stru.sync.run() after clearing tasks
//   2. "Sync Now" button in Settings modal — user-initiated
// There is no automatic sync on page load or on a timer.
// ─────────────────────────────────────────────────────────────────────────────

(() => {
    'use strict';

    const STORAGE_KEYS = {
        ASANA_PAT:       'stru-sync-asana-pat',
        ASANA_WORKSPACE: 'stru-sync-asana-workspace',
        LAST_SYNC:       'stru-sync-last',
    };

    const ASANA_BASE = 'https://app.asana.com/api/1.0';

    // ── tiny helpers ──────────────────────────────────────────────────────────

    const uid = () =>
        (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    /** True when a YYYY-MM-DD string is today or in the past. */
    const isDueOrOverdue = (dateStr) => {
        if (!dateStr) return false;
        const due = new Date(dateStr + 'T00:00:00');
        const cutoff = new Date();
        cutoff.setHours(23, 59, 59, 999);
        return due <= cutoff;
    };

    const loadTasksFromStorage = () => {
        try {
            const raw = localStorage.getItem('stru-tasks');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    };

    const saveTasksToStorage = (tasks) => {
        localStorage.setItem('stru-tasks', JSON.stringify(tasks));
    };

    // ── Stru list lookup ──────────────────────────────────────────────────────

    /** Read the current Stru lists from localStorage. */
    const loadStruLists = () => {
        try {
            const raw = localStorage.getItem('stru-lists');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    };

    /**
     * Find the Stru list ID whose name matches (case-insensitive).
     * Returns null if not found — caller falls back to default list.
     */
    const findListIdByName = (struLists, name) => {
        if (!name) return null;
        const lower = name.toLowerCase().trim();
        return struLists.find(l => l.name?.toLowerCase().trim() === lower)?.id || null;
    };

    // ── Asana REST helpers ────────────────────────────────────────────────────

    const asanaFetch = async (path, pat, options = {}) => {
        const res = await fetch(`${ASANA_BASE}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${pat}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Asana ${res.status}: ${body.slice(0, 200)}`);
        }
        return res.json();
    };

    const fetchAsanaWorkspaces = async (pat) => {
        const data = await asanaFetch('/workspaces?opt_fields=gid,name', pat);
        return data.data || [];
    };

    const fetchAsanaMe = async (pat) => {
        const data = await asanaFetch('/users/me?opt_fields=gid,name,email', pat);
        return data.data;
    };

    /**
     * Fetch tasks from Asana's "My Tasks" list that are due today or overdue,
     * or that are manually placed in the Today section.
     *
     * Uses the user_task_list endpoint rather than the search API so that
     * subtasks assigned to the user are also returned (search excludes subtasks).
     */
    const fetchAsanaDueTasks = async (pat, workspaceGid) => {
        const me = await fetchAsanaMe(pat);

        // Get the GID of the user's personal "My Tasks" list for this workspace.
        const taskListResp = await asanaFetch(
            `/users/${me.gid}/user_task_list?workspace=${workspaceGid}&opt_fields=gid`,
            pat
        );
        const taskListGid = taskListResp.data?.gid;
        if (!taskListGid) throw new Error('Could not find Asana user task list');

        // Pull all incomplete tasks from My Tasks (includes subtasks).
        const params = new URLSearchParams({
            opt_fields: 'gid,name,due_on,completed,assignee_status',
            limit: '100',
        });
        const tasksResp = await asanaFetch(
            `/user_task_lists/${taskListGid}/tasks?${params}`,
            pat
        );

        const cutoff = new Date();
        cutoff.setHours(23, 59, 59, 999);

        return (tasksResp.data || []).filter((t) => {
            if (t.completed) return false;
            // Due today or overdue
            if (t.due_on && new Date(t.due_on + 'T00:00:00') <= cutoff) return true;
            // In Today section with no due date set (user manually prioritised it for today).
            // If a future due_on is set, the date check above is the authority — don't override it.
            if (t.assignee_status === 'today' && !t.due_on) return true;
            return false;
        });
    };

    const markAsanaTaskComplete = async (pat, gid, completed) => {
        await asanaFetch(`/tasks/${gid}`, pat, {
            method: 'PUT',
            body: JSON.stringify({ data: { completed } }),
        });
    };

    // ── Stoa helpers ──────────────────────────────────────────────────────────

    // Stoa stores data in a Cloudflare KV-backed API. We read/write directly
    // from that API so sync works regardless of what origin Stru is running on.
    // Must match Stoa's getCloudStorageUrl() which uses encodeURIComponent on the key.
    // 'stoa:data' → 'stoa%3Adata' — a different KV key than 'stoa:data'.
    const STOA_CLOUD_URL = `https://api.sadhanas.app/${encodeURIComponent('stoa:data')}`;

    // Stoa is always available via the cloud — no local detection needed.
    const isStoaAvailable = () => true;

    /**
     * Read Stoa's complete data object from the cloud API.
     * Returns the RAW object as-is so that writeStoaTask can PUT it back
     * without losing any fields (notes, trash, activeListId, etc.).
     * Falls back to localStorage if the cloud request fails.
     */
    const readStoaData = async () => {
        // Primary: cloud API
        try {
            const res = await fetch(STOA_CLOUD_URL);
            if (res.ok) {
                const data = await res.json();
                // Must have tasks array to be valid; return full object unchanged.
                if (data && Array.isArray(data.tasks)) return data;
            }
        } catch {}

        // Fallback: localStorage (only works when on the same origin as Stoa)
        try {
            const raw = localStorage.getItem('stoa:backup');
            if (!raw) return null;
            return JSON.parse(raw) || null;
        } catch { return null; }
    };

    /**
     * True if a Stoa task should be routed to the CBF tab.
     * Matches on:
     *   • taskType === 'CBF'
     *   • task's list name is "CBF" (case-insensitive)
     *   • task's list belongs to a folder named "CBF" (case-insensitive)
     */
    const isStoaTaskCBF = (stoaTask, lists, folders) => {
        if (stoaTask.taskType === 'CBF') return true;
        const list = lists.find(l => l.id === stoaTask.listId);
        if (!list) return false;
        if (list.name?.toLowerCase().trim() === 'cbf') return true;
        if (list.folderId) {
            const folder = folders.find(f => f.id === list.folderId);
            if (folder?.name?.toLowerCase().trim() === 'cbf') return true;
        }
        return false;
    };

    // ── Stoa recurrence helpers (ported from Stoa's script.js) ──────────────
    // These replicate Stoa's toggleTaskComplete logic so that completing a
    // recurring task from Stru also creates the next recurrence instance.

    const _RECURRENCE_WEEKDAY_ORDER = ['1','2','3','4','5','6','0'];
    const _RECURRENCE_WEEKDAY_LONG  = {'0':'Sunday','1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday'};
    const _STATUS_VALUES = ['Important','Active','Structure','Inactive','Conservation','Done'];

    const _parseDateString = (s) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };
    const _formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const _getBaseTaskDate = (task) => {
        const d = _parseDateString(task?.dueDate);
        if (d) return d;
        const c = task?.createdAt ? new Date(task.createdAt) : null;
        if (c && !isNaN(c)) return new Date(c.getFullYear(), c.getMonth(), c.getDate());
        const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    };
    const _clampInt = (v, fb, min, max = null) => {
        const n = parseInt(v, 10);
        if (isNaN(n)) return fb;
        const lo = Math.max(n, min);
        return max === null ? lo : Math.min(lo, max);
    };
    const _sortDays = (days) => {
        const u = Array.from(new Set((Array.isArray(days) ? days : []).map(String)));
        return _RECURRENCE_WEEKDAY_ORDER.filter(d => u.includes(d));
    };
    const _ordinalForDate = (date) => {
        const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
        if (next.getMonth() !== date.getMonth()) return 'last';
        return String(Math.min(4, Math.ceil(date.getDate() / 7)));
    };
    const _defaultRecurrence = (o = {}) => ({
        enabled: false, unit: 'day', interval: 1, recurringDays: [],
        monthlyMode: 'dayOfMonth', dayOfMonth: null, ordinal: null, weekday: null,
        createOnComplete: true, recurForever: true, updateStatusTo: null, ...o,
    });
    const _normalizeRecurrence = (rv, task = null) => {
        const base = _getBaseTaskDate(task);
        const fw  = String(base.getDay());
        const fd  = base.getDate();
        const fo  = _ordinalForDate(base);
        if (!rv || rv === 'none') return _defaultRecurrence();
        if (typeof rv === 'string') {
            const ld = _sortDays(task?.recurringDays || []);
            switch (rv) {
                case 'daily':    return _defaultRecurrence({ enabled:true, unit:'day',   interval:1 });
                case 'weekly':   return _defaultRecurrence({ enabled:true, unit:'week',  interval:1, recurringDays: ld.length ? ld : [fw] });
                case 'biweekly': return _defaultRecurrence({ enabled:true, unit:'week',  interval:2, recurringDays: ld.length ? ld : [fw] });
                case 'monthly':  return _defaultRecurrence({ enabled:true, unit:'month', interval:1, dayOfMonth: fd });
                case 'yearly':   return _defaultRecurrence({ enabled:true, unit:'year',  interval:1 });
                default:         return _defaultRecurrence();
            }
        }
        const n = _defaultRecurrence();
        n.enabled    = !!rv.enabled;
        n.unit       = ['day','week','month','year'].includes(rv.unit) ? rv.unit : 'day';
        n.interval   = _clampInt(rv.interval, 1, 1);
        n.recurringDays = _sortDays(rv.recurringDays);
        n.monthlyMode   = rv.monthlyMode === 'ordinalWeekday' ? 'ordinalWeekday' : 'dayOfMonth';
        n.dayOfMonth    = rv.dayOfMonth == null ? null : _clampInt(rv.dayOfMonth, fd, 1, 31);
        n.ordinal       = ['1','2','3','4','last'].includes(rv.ordinal) ? rv.ordinal : null;
        n.weekday       = Object.prototype.hasOwnProperty.call(_RECURRENCE_WEEKDAY_LONG, String(rv.weekday)) ? String(rv.weekday) : null;
        n.createOnComplete = rv.createOnComplete !== false;
        n.recurForever     = rv.recurForever !== false;
        n.updateStatusTo   = _STATUS_VALUES.includes(rv.updateStatusTo) ? rv.updateStatusTo : null;
        if (n.unit === 'week' && n.enabled && n.recurringDays.length === 0) n.recurringDays = [fw];
        if (n.unit === 'month') {
            if (n.monthlyMode === 'dayOfMonth') { n.dayOfMonth = n.dayOfMonth || fd; n.ordinal = null; n.weekday = null; }
            else { n.dayOfMonth = null; n.ordinal = n.ordinal || fo; n.weekday = n.weekday || fw; }
        } else { n.monthlyMode = 'dayOfMonth'; n.dayOfMonth = n.dayOfMonth ?? null; n.ordinal = null; n.weekday = null; }
        return n;
    };
    const _cloneRecurrence = (rv) => { const n = _normalizeRecurrence(rv); return { ...n, recurringDays: [...n.recurringDays] }; };
    const _startOfWeek = (date) => {
        const r = new Date(date); const day = r.getDay();
        r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r;
    };
    const _daysInMonth = (y, mi) => new Date(y, mi + 1, 0).getDate();
    const _monthOffset = (date, add) => {
        const t = (date.getFullYear() * 12) + date.getMonth() + add;
        return { year: Math.floor(t / 12), monthIndex: t % 12 };
    };
    const _ordinalWeekday = (y, mi, ordinal, weekday) => {
        const tw = Number(weekday); const dim = _daysInMonth(y, mi);
        const matches = [];
        for (let d = 1; d <= dim; d++) { if (new Date(y, mi, d).getDay() === tw) matches.push(d); }
        if (!matches.length) return new Date(y, mi, dim);
        if (ordinal === 'last') return new Date(y, mi, matches[matches.length - 1]);
        const i = Math.max(0, Number(ordinal) - 1);
        return new Date(y, mi, matches[i] || matches[matches.length - 1]);
    };
    const _nextWeekly = (base, rec) => {
        const sel = rec.recurringDays.length ? rec.recurringDays : [String(base.getDay())];
        const anchor = _startOfWeek(base); const wkMs = 7 * 24 * 60 * 60 * 1000;
        for (let o = 1; o <= 366 * Math.max(1, rec.interval); o++) {
            const c = new Date(base); c.setDate(c.getDate() + o);
            if (!sel.includes(String(c.getDay()))) continue;
            const wks = Math.round((_startOfWeek(c) - anchor) / wkMs);
            if (wks % rec.interval === 0) return c;
        }
        const fb = new Date(base); fb.setDate(fb.getDate() + rec.interval * 7); return fb;
    };
    const _nextMonthly = (base, rec) => {
        if (rec.monthlyMode === 'ordinalWeekday') {
            const tm = _monthOffset(base, rec.interval);
            return _ordinalWeekday(tm.year, tm.monthIndex, rec.ordinal || 'last', rec.weekday || String(base.getDay()));
        }
        const tm = _monthOffset(base, rec.interval);
        return new Date(tm.year, tm.monthIndex, Math.min(rec.dayOfMonth || base.getDate(), _daysInMonth(tm.year, tm.monthIndex)));
    };
    const _nextYearly = (base, rec) => {
        const y = base.getFullYear() + rec.interval; const mi = base.getMonth();
        return new Date(y, mi, Math.min(base.getDate(), _daysInMonth(y, mi)));
    };
    const _calcNextRecurrence = (task, rv) => {
        const rec = _normalizeRecurrence(rv, task);
        if (!rec.enabled) return null;
        const base = _getBaseTaskDate(task);
        switch (rec.unit) {
            case 'day':   { const n = new Date(base); n.setDate(n.getDate() + rec.interval); return n; }
            case 'week':  return _nextWeekly(base, rec);
            case 'month': return _nextMonthly(base, rec);
            case 'year':  return _nextYearly(base, rec);
            default:      return null;
        }
    };

    // ── Stoa write-back ───────────────────────────────────────────────────────

    /**
     * Send a surgical PATCH to the Stoa cloud.
     * The Worker handles the read-modify-write server-side so the client
     * never touches the full data object — notes, trash, lists, folders are
     * physically unreachable from this call.
     *
     * Supported ops:
     *   { op: 'updateTask', taskId, updates }  — merge updates into one task
     *   { op: 'addTask',    task }             — append a new task
     */
    const _patchStoa = async (op) => {
        const res = await fetch(STOA_CLOUD_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.warn('[Stru Sync] Stoa PATCH failed:', res.status, body.slice(0, 120));
        }
    };

    // Serialises all Stoa write-back calls so concurrent completions
    // (e.g. several tasks finished in one session) don't race each other.
    let _stoaWriteQueue = Promise.resolve();

    /**
     * Mark a Stoa task done/undone and (if recurring) spawn the next instance.
     *
     * Architecture: uses PATCH instead of a full read-modify-write PUT so that
     * notes, trash, lists, and folders can never be accidentally overwritten.
     * The Worker merges the change server-side; the client never sees or writes
     * the full Stoa data object.
     *
     * For recurring tasks we do need to read the task's properties once (to
     * build the next-instance clone), but we still use PATCH to append it —
     * we never write the full dataset back.
     */
    const writeStoaTask = (stoaId, updates) => {
        _stoaWriteQueue = _stoaWriteQueue
            .catch(() => {})   // don't let one failure break the whole queue
            .then(async () => {
                try {
                    // ── 1. Pre-read for recurrence (only when marking Done) ──
                    // We read BEFORE sending the status update so we still see
                    // the original status (needed for the new task's status field).
                    let recurrenceTask = null;
                    if (updates.status === 'Done') {
                        const data = await readStoaData();
                        if (data) {
                            const t = data.tasks.find(t => t.id === stoaId);
                            if (t) {
                                const rec = _normalizeRecurrence(t.recurrence, t);
                                if (rec.enabled && rec.createOnComplete) {
                                    const nextDate = _calcNextRecurrence(t, rec);
                                    if (nextDate) {
                                        recurrenceTask = {
                                            ...t,
                                            id:         Date.now().toString() + Math.random(),
                                            status:     rec.updateStatusTo || t.status || 'Active',
                                            dueDate:    _formatDate(nextDate),
                                            createdAt:  new Date().toISOString(),
                                            checklist:  (t.checklist  || []).map(i => ({ ...i, done: false })),
                                            subtasks:   (t.subtasks   || []).map(s => ({ ...s, done: false })),
                                            isExpanded: false,
                                            recurrence: rec.recurForever
                                                ? _cloneRecurrence(rec)
                                                : _defaultRecurrence(),
                                        };
                                    }
                                }
                            }
                        }
                    }

                    // ── 2. Update task status via surgical PATCH ──────────────
                    // The Worker merges { status: 'Done' } into the one task.
                    // Notes / trash / lists / folders are never read or written
                    // by this client call.
                    await _patchStoa({ op: 'updateTask', taskId: stoaId, updates });

                    // ── 3. Append next recurrence instance (if needed) ────────
                    if (recurrenceTask) {
                        await _patchStoa({ op: 'addTask', task: recurrenceTask });
                        console.log('[Stru Sync] Recurrence spawned for', stoaId, '→ due', recurrenceTask.dueDate);
                    }
                } catch (e) {
                    console.warn('[Stru Sync] writeStoaTask error:', e);
                }
            });
        return _stoaWriteQueue;
    };

    // ── Core sync logic ───────────────────────────────────────────────────────

    /**
     * Merge Stoa tasks due today/overdue into currentTasks.
     *
     * Routing:
     *   CBF (folder, list, or taskType)  → list "CBF",      priority "could"
     *   Everything else                  → list "Personal",  priority "personal"
     */
    const mergeFromStoa = async (currentTasks) => {
        const stoa = await readStoaData();
        if (!stoa) return { tasks: currentTasks, added: 0 };

        const struLists   = loadStruLists();
        const defaultId   = window.Stru?.constants?.DEFAULT_LIST_ID || 'default-list';
        const cbfListId   = findListIdByName(struLists, 'CBF')      || defaultId;
        const personalId  = findListIdByName(struLists, 'Personal') || defaultId;

        const existingIds = new Set(
            currentTasks
                .filter(t => t.sourceApp === 'stoa')
                .map(t => t.sourceId)
        );

        const newTasks = [];
        for (const st of stoa.tasks) {
            if (st.status === 'Done')          continue;   // already complete
            if (st.priority === "Won't do")    continue;   // explicitly deferred
            if (!isDueOrOverdue(st.dueDate))   continue;   // not due today or overdue
            if (existingIds.has(st.id))        continue;   // already in Stru

            const cbf = isStoaTaskCBF(st, stoa.lists, stoa.folders);
            newTasks.push({
                id:        uid(),
                text:      (st.text || st.title || '').toString(),
                priority:  cbf ? 'could' : 'personal',
                done:      false,
                completed: false,
                createdAt: st.createdAt || Date.now(),
                updatedAt: Date.now(),
                listId:    cbf ? cbfListId : personalId,
                subtasks:  [...(st.subtasks || []), ...(st.checklist || [])].map(c => ({
                    id:        c.id || uid(),
                    text:      (c.text || '').toString(),
                    done:      !!c.done,
                    completed: !!c.done,
                })),
                sourceApp: 'stoa',
                sourceId:  st.id,
            });
        }

        if (newTasks.length === 0) return { tasks: currentTasks, added: 0 };
        return { tasks: [...currentTasks, ...newTasks], added: newTasks.length };
    };

    /**
     * Merge Asana tasks due today/overdue into currentTasks.
     *
     * Routing:
     *   Name starts with "YouTube"  → list "YouTube",      priority "could"
     *   Everything else             → Stru default list,   priority "could"
     */
    const mergeFromAsana = async (currentTasks) => {
        const pat   = localStorage.getItem(STORAGE_KEYS.ASANA_PAT);
        const wsGid = localStorage.getItem(STORAGE_KEYS.ASANA_WORKSPACE);
        if (!pat || !wsGid) return { tasks: currentTasks, added: 0 };

        const struLists    = loadStruLists();
        const defaultId    = window.Stru?.constants?.DEFAULT_LIST_ID || 'default-list';
        const youtubeListId = findListIdByName(struLists, 'YouTube') || defaultId;

        let asanaTasks;
        try {
            asanaTasks = await fetchAsanaDueTasks(pat, wsGid);
        } catch (e) {
            console.warn('[Stru Sync] Asana fetch failed:', e.message);
            return { tasks: currentTasks, added: 0, error: e.message };
        }

        const existingIds = new Set(
            currentTasks
                .filter(t => t.sourceApp === 'asana')
                .map(t => t.sourceId)
        );

        const newTasks = [];
        for (const at of asanaTasks) {
            if (existingIds.has(at.gid)) continue;
            const isYouTube = (at.name || '').startsWith('YouTube');
            newTasks.push({
                id:        uid(),
                text:      (at.name || '').toString(),
                priority:  'could',    // Medium for all Asana tasks
                done:      false,
                completed: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                listId:    isYouTube ? youtubeListId : defaultId,
                subtasks:  [],
                sourceApp: 'asana',
                sourceId:  at.gid,
            });
        }

        if (newTasks.length === 0) return { tasks: currentTasks, added: 0 };
        return { tasks: [...currentTasks, ...newTasks], added: newTasks.length };
    };

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Run a full sync cycle.
     * Reads from localStorage, merges new tasks, writes back if anything changed.
     * Returns { changed: bool, added: number, error?: string }.
     *
     * Callers are responsible for re-reading stru-tasks and updating React state:
     *   const result = await Stru.sync.run();
     *   if (result.changed) setTasks(loadArray('stru-tasks'));
     */
    const run = async () => {
        const current = loadTasksFromStorage();

        const stoaResult  = await mergeFromStoa(current);
        const asanaResult = await mergeFromAsana(stoaResult.tasks);

        const totalAdded = stoaResult.added + asanaResult.added;
        const changed    = totalAdded > 0;

        if (changed) {
            saveTasksToStorage(asanaResult.tasks);
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        }

        return {
            changed,
            added: totalAdded,
            ...(asanaResult.error ? { error: asanaResult.error } : {}),
        };
    };

    /**
     * Called whenever a synced task is marked done or undone in Stru.
     * Pushes the completion state back to the source app.
     */
    const onTaskCompleted = async (task, done) => {
        if (!task?.sourceApp || !task?.sourceId) return;

        if (task.sourceApp === 'stoa') {
            await writeStoaTask(task.sourceId, { status: done ? 'Done' : 'Active' });
            return;
        }

        if (task.sourceApp === 'asana') {
            const pat = localStorage.getItem(STORAGE_KEYS.ASANA_PAT);
            if (!pat) return;
            try {
                await markAsanaTaskComplete(pat, task.sourceId, done);
            } catch (e) {
                console.warn('[Stru Sync] Asana completion sync failed:', e.message);
            }
        }
    };

    const getSettings = () => ({
        asanaPat:          localStorage.getItem(STORAGE_KEYS.ASANA_PAT)       || '',
        asanaWorkspaceGid: localStorage.getItem(STORAGE_KEYS.ASANA_WORKSPACE) || '',
        lastSync:          localStorage.getItem(STORAGE_KEYS.LAST_SYNC)       || null,
        stoaAvailable:     isStoaAvailable(),
    });

    const saveSettings = ({ asanaPat, asanaWorkspaceGid } = {}) => {
        if (asanaPat !== undefined) {
            if (asanaPat) localStorage.setItem(STORAGE_KEYS.ASANA_PAT, asanaPat);
            else          localStorage.removeItem(STORAGE_KEYS.ASANA_PAT);
        }
        if (asanaWorkspaceGid !== undefined) {
            if (asanaWorkspaceGid) localStorage.setItem(STORAGE_KEYS.ASANA_WORKSPACE, asanaWorkspaceGid);
            else                   localStorage.removeItem(STORAGE_KEYS.ASANA_WORKSPACE);
        }
    };

    // ── Attach to global namespace ────────────────────────────────────────────

    window.Stru = window.Stru || {};
    window.Stru.sync = {
        run,
        onTaskCompleted,
        isStoaAvailable,
        fetchAsanaWorkspaces,
        getSettings,
        saveSettings,
        STORAGE_KEYS,
    };
})();
