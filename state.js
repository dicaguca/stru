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

    const countActiveTasks = (tasks) => (tasks || []).filter((t) => !normalizeTask(t).done).length;

    const countTodaysSessions = (sessions) => {
        const today = Stru.utils.startOfDay(new Date());
        return (sessions || []).filter((s) => {
            const ss = normalizeSession(s);
            const d = Stru.utils.toDate(ss.start);
            return d && today && Stru.utils.isSameDay(d, today);
        }).length;
    };

    Stru.state = {
        usePersistedState,
        normalizePriority,
        normalizeSubtask,
        normalizeList,
        normalizeTask,
        normalizeSession,
        loadTasks,
        saveTasks,
        loadLists,
        saveLists,
        loadSessions,
        saveSessions,
        countActiveTasks,
        countTodaysSessions,
    };
})();
