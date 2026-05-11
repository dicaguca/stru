(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;

    Stru.hooks = {
        useState: React.useState,
        useEffect: React.useEffect,
        useMemo: React.useMemo,
        useRef: React.useRef,
    };

    Stru.storage = {
        load(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        save(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch {
            }
        },
    };

    Stru.constants = {
        STORAGE_KEYS: {
            tasks: "stru-tasks",
            sessions: "stru-sessions",
            breaks: "stru-breaks",
            workEvents: "stru-workevents",
            history: "stru-history",
            lists: "stru-lists",
        },
        DEFAULT_LIST_ID: "default-list",
        DEFAULT_LIST_NAME: "Main List",
        PRIORITY_ORDER: ["must", "should", "could", "nice", ""],
        PRIORITY_ALIASES: {
            priority: "must",
            high: "should",
            medium: "could",
            optional: "nice",
            none: "",
            nopriority: "",
            no_priority: "",
            want: "nice",
        },
        priorityColors: {
            must: {
                label: "Priority",
                bg: "bg-rose-50",
                border: "border-rose-300",
                text: "text-rose-700",
                dot: "bg-rose-400",
            },
            should: {
                label: "High",
                bg: "bg-orange-50",
                border: "border-orange-300",
                text: "text-orange-700",
                dot: "bg-orange-400",
            },
            could: {
                label: "Medium",
                bg: "bg-yellow-50",
                border: "border-yellow-300",
                text: "text-yellow-700",
                dot: "bg-yellow-400",
            },
            nice: {
                label: "Optional",
                bg: "bg-green-50",
                border: "border-green-300",
                text: "text-green-700",
                dot: "bg-green-400",
            },
            "": {
                label: "No Priority",
                bg: "bg-stone-50",
                border: "border-stone-300",
                text: "text-stone-700",
                dot: "bg-stone-400",
            },
        },
    };

    Stru.utils = {
        uid() {
            return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        },
        toDate(x) {
            const d = x instanceof Date ? x : new Date(x);
            return Number.isNaN(d.getTime()) ? null : d;
        },
        startOfDay(d) {
            const dt = Stru.utils.toDate(d);
            if (!dt) return null;
            const out = new Date(dt);
            out.setHours(0, 0, 0, 0);
            return out;
        },
        isSameDay(a, b) {
            const da = Stru.utils.startOfDay(a);
            const db = Stru.utils.startOfDay(b);
            if (!da || !db) return false;
            return da.getTime() === db.getTime();
        },
        todayKey(d = new Date()) {
            const dt = Stru.utils.startOfDay(d);
            if (!dt) return "";
            return dt.toISOString().slice(0, 10);
        },
    };

    const normalizePriority = (p) => {
        const raw = (p ?? "").toString().trim().toLowerCase();
        const aliased = Stru.constants.PRIORITY_ALIASES[raw];
        const canonical = aliased !== undefined ? aliased : raw;
        return Stru.constants.priorityColors[canonical] ? canonical : "";
    };

    const normalizeSubtask = (subtask) => ({
        id: subtask?.id || Stru.utils.uid(),
        text: (subtask?.text ?? subtask?.title ?? "").toString(),
        done: !!(subtask?.done || subtask?.completed),
        completed: !!(subtask?.done || subtask?.completed),
    });

    const normalizeList = (list) => ({
        id: list?.id || Stru.utils.uid(),
        name: (list?.name ?? "").toString().trim() || "Untitled List",
        createdAt: list?.createdAt ?? list?.created_at ?? Date.now(),
    });

    const normalizeTask = (t) => {
        const id = t?.id || Stru.utils.uid();
        const text = (t?.text ?? t?.title ?? "").toString();
        const priority = normalizePriority(t?.priority ?? "");
        const done = !!(t?.done || t?.completed);
        const createdAt = t?.createdAt ?? t?.created_at ?? Date.now();
        const updatedAt = t?.updatedAt ?? t?.updated_at ?? createdAt;
        const subtasks = Array.isArray(t?.subtasks) ? t.subtasks.map(normalizeSubtask) : [];

        return {
            id,
            text,
            priority,
            done,
            completed: done,
            createdAt,
            updatedAt,
            listId: t?.listId || t?.list_id || Stru.constants.DEFAULT_LIST_ID,
            subtasks,
        };
    };

    const normalizeSession = (s) => {
        const id = s?.id || Stru.utils.uid();
        const start = s?.start ?? s?.startTime ?? s?.startedAt ?? s?.started_at ?? Date.now();
        const end = s?.end ?? s?.endTime ?? s?.endedAt ?? s?.ended_at ?? null;

        return {
            id,
            start,
            end,
            ...s,
        };
    };

    const usePersistedState = (key, initialValue) => {
        const { useState, useEffect } = React;
        const [state, setState] = useState(() => Stru.storage.load(key, initialValue));

        useEffect(() => {
            Stru.storage.save(key, state);
        }, [key, state]);

        return [state, setState];
    };

    const loadTasks = () => {
        const raw = Stru.storage.load(Stru.constants.STORAGE_KEYS.tasks, []);
        if (!Array.isArray(raw)) return [];
        return raw.map(normalizeTask);
    };

    const saveTasks = (tasks) => {
        Stru.storage.save(Stru.constants.STORAGE_KEYS.tasks, (tasks || []).map(normalizeTask));
    };

    const loadLists = () => {
        const raw = Stru.storage.load(Stru.constants.STORAGE_KEYS.lists, []);
        if (!Array.isArray(raw) || raw.length === 0) {
            return [normalizeList({ id: Stru.constants.DEFAULT_LIST_ID, name: Stru.constants.DEFAULT_LIST_NAME })];
        }
        return raw.map(normalizeList);
    };

    const saveLists = (lists) => {
        Stru.storage.save(Stru.constants.STORAGE_KEYS.lists, (lists || []).map(normalizeList));
    };

    const loadSessions = () => {
        const raw = Stru.storage.load(Stru.constants.STORAGE_KEYS.sessions, []);
        if (!Array.isArray(raw)) return [];
        return raw.map(normalizeSession);
    };

    const saveSessions = (sessions) => {
        Stru.storage.save(Stru.constants.STORAGE_KEYS.sessions, (sessions || []).map(normalizeSession));
    };

    const normalizeWorkEvent = (event) => {
        const time = event?.time ?? event?.timestamp ?? null;
        return {
            ...event,
            time: Stru.utils.toDate(time),
        };
    };

    const getLatestSessionStart = (sessions) => (
        (sessions || [])
            .map((session) => normalizeSession(session))
            .map((session) => Stru.utils.toDate(session.start))
            .filter(Boolean)
            .sort((a, b) => b - a)[0] || null
    );

    const getWorkSessionWindow = (workEvents, sessions = [], now = new Date()) => {
        const normalizedEvents = (workEvents || [])
            .map((event) => normalizeWorkEvent(event))
            .filter((event) => event.time)
            .sort((a, b) => a.time - b.time);

        const latestStartIndex = [...normalizedEvents]
            .map((event, index) => ({ event, index }))
            .reverse()
            .find(({ event }) => event.type === "start")?.index ?? -1;

        const latestStart = latestStartIndex >= 0 ? normalizedEvents[latestStartIndex] : null;
        const matchingEnd = latestStartIndex >= 0
            ? normalizedEvents.slice(latestStartIndex + 1).find((event) => event.type === "end")
            : null;

        const startTime = latestStart?.time || getLatestSessionStart(sessions);
        if (!startTime) return null;

        const endTime = matchingEnd?.time || Stru.utils.toDate(now) || new Date();

        return {
            startTime,
            endTime,
            isOpen: !matchingEnd,
        };
    };

    const isWithinWindow = (date, window) => {
        const d = Stru.utils.toDate(date);
        if (!d || !window?.startTime || !window?.endTime) return false;
        return d >= window.startTime && d <= window.endTime;
    };

    const filterSessionsToWorkSession = (sessions, workEvents, now = new Date()) => {
        const window = getWorkSessionWindow(workEvents, sessions, now);
        if (!window) return (sessions || []).map((session) => normalizeSession(session));

        return (sessions || [])
            .map((session) => normalizeSession(session))
            .filter((session) => isWithinWindow(session.start, window));
    };

    const filterBreaksToWorkSession = (breaks, workEvents, sessions = [], now = new Date()) => {
        const window = getWorkSessionWindow(workEvents, sessions, now);
        if (!window) return breaks || [];

        return (breaks || []).filter((brk) => {
            const start = Stru.utils.toDate(brk?.startTime ?? brk?.start ?? brk?.startedAt ?? brk?.started_at);
            return isWithinWindow(start, window);
        });
    };

    const filterWorkEventsToWorkSession = (workEvents, sessions = [], now = new Date()) => {
        const window = getWorkSessionWindow(workEvents, sessions, now);
        const normalizedEvents = (workEvents || [])
            .map((event) => normalizeWorkEvent(event))
            .filter((event) => event.time);

        if (!window) return normalizedEvents;

        return normalizedEvents.filter((event) => isWithinWindow(event.time, window));
    };

    const countActiveTasks = (tasks) => (tasks || []).filter((t) => !normalizeTask(t).done).length;

    const countSessionsInWorkSession = (sessions, workEvents, now = new Date()) => (
        filterSessionsToWorkSession(sessions, workEvents, now).length
    );

    Stru.state = {
        usePersistedState,
        normalizePriority,
        normalizeSubtask,
        normalizeList,
        normalizeTask,
        normalizeSession,
        normalizeWorkEvent,
        getWorkSessionWindow,
        filterSessionsToWorkSession,
        filterBreaksToWorkSession,
        filterWorkEventsToWorkSession,
        loadTasks,
        saveTasks,
        loadLists,
        saveLists,
        loadSessions,
        saveSessions,
        countActiveTasks,
        countSessionsInWorkSession,
    };
})();
