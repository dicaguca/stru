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
     * Read Stoa's full data (tasks, lists, folders) from the cloud API.
     * Falls back to localStorage if the cloud request fails.
     */
    const readStoaData = async () => {
        // Primary: cloud API
        try {
            const res = await fetch(STOA_CLOUD_URL);
            if (res.ok) {
                const data = await res.json();
                if (data && data.tasks) {
                    return { tasks: data.tasks || [], lists: data.lists || [], folders: data.folders || [] };
                }
            }
        } catch {}

        // Fallback: localStorage (only works when on the same origin as Stoa)
        try {
            const raw = localStorage.getItem('stoa:backup');
            if (!raw) return null;
            const data = JSON.parse(raw);
            return data ? { tasks: data.tasks || [], lists: data.lists || [], folders: data.folders || [] } : null;
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

    /**
     * Write a task update back to Stoa's cloud.
     * Used for completion back-sync.
     */
    const writeStoaTask = async (stoaId, updates) => {
        // Read the full current dataset from cloud
        const data = await readStoaData();
        if (!data) return;

        const idx = data.tasks.findIndex(t => t.id === stoaId);
        if (idx === -1) return;

        data.tasks[idx] = { ...data.tasks[idx], ...updates };

        try {
            await fetch(STOA_CLOUD_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        } catch (e) {
            console.warn('[Stru Sync] Could not write Stoa task to cloud:', e);
        }
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
            // Skip only tasks whose due date is explicitly set to a FUTURE date.
            // Tasks with no due date (dueDate = '' or null) are treated as open/outstanding.
            if (st.dueDate && !isDueOrOverdue(st.dueDate)) continue;
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
