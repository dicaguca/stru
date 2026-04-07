const { useState, useEffect } = React;

window.Stru = window.Stru || {};
const Stru = window.Stru;

const {
    usePersistedState,
    normalizeTask,
    normalizeList,
    countTodaysSessions,
} = Stru.state;
const { Router, useRoute, go } = Stru.router;

const uid = () =>
    (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const playBeeps = (type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = type === "start"
            ? [523.25, 659.25, 783.99]
            : [783.99, 659.25, 523.25];

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g);
            g.connect(ctx.destination);
            osc.frequency.value = f;
            osc.type = "sine";

            const t = ctx.currentTime + i * 0.15;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.3, t + 0.02);
            g.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        });
    } catch {
    }
};

const playBreakBeeps = (type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = type === "start"
            ? [349.23, 440.0, 523.25]
            : [659.25, 523.25];

        const gap = type === "start" ? 0.2 : 0.3;
        const dur = type === "start" ? 0.2 : 0.4;

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.connect(g);
            g.connect(ctx.destination);
            osc.frequency.value = f;
            osc.type = "sine";

            const t = ctx.currentTime + i * gap;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 0.05);
            g.gain.linearRampToValueAtTime(0, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        });
    } catch {
    }
};

Stru.playBreakBeeps = playBreakBeeps;

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
};

const loadArray = (key) => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const toDate = (x) => {
    if (!x) return null;
    if (x instanceof Date) return x;
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? null : d;
};

const getDefaultList = () => normalizeList({
    id: Stru.constants.DEFAULT_LIST_ID,
    name: Stru.constants.DEFAULT_LIST_NAME,
});

const App = () => {
    const [tasks, setTasks] = usePersistedState("stru-tasks", []);
    const [lists, setLists] = usePersistedState("stru-lists", [getDefaultList()]);
    const [sessions, setSessions] = usePersistedState("stru-sessions", []);
    const [breaks, setBreaks] = usePersistedState("stru-breaks", []);
    const [workEvents, setWorkEvents] = usePersistedState("stru-workevents", []);
    const [history, setHistory] = usePersistedState("stru-history", []);

    const [sessionDuration, setSessionDuration] = useState(25);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [activeListId, setActiveListId] = useState(Stru.constants.DEFAULT_LIST_ID);

    const [activeSession, setActiveSession] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [sessionEndQueued, setSessionEndQueued] = useState(false);

    const sessionTargetTimeRef = React.useRef(null);
    const breakTargetTimeRef = React.useRef(null);
    const breakStartTimeRef = React.useRef(null);

    useEffect(() => {
        window.Stru.timerRefs = {
            sessionTargetTimeRef,
            breakTargetTimeRef,
            breakStartTimeRef,
        };
    }, []);

    const [activeBreak, setActiveBreak] = useState(null);
    const [isBreakRunning, setIsBreakRunning] = useState(false);
    const [breakTimeRemaining, setBreakTimeRemaining] = useState(0);
    const [breakElapsedTime, setBreakElapsedTime] = useState(0);
    const [isIndefiniteBreak, setIsIndefiniteBreak] = useState(false);

    useEffect(() => {
        window.Stru.breakState = {
            isBreakRunning,
            setIsBreakRunning,
            breakTimeRemaining,
            setBreakTimeRemaining,
            breakElapsedTime,
            setBreakElapsedTime,
            isIndefiniteBreak,
            setIsIndefiniteBreak,
        };
    }, [
        isBreakRunning,
        breakTimeRemaining,
        breakElapsedTime,
        isIndefiniteBreak,
    ]);

    const [showAddTask, setShowAddTask] = useState(false);
    const [showListsManager, setShowListsManager] = useState(false);
    const [taskForSubtasks, setTaskForSubtasks] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showStartDay, setShowStartDay] = useState(false);
    const [showEndDay, setShowEndDay] = useState(false);
    const [showBreakReminder, setShowBreakReminder] = useState(false);
    const [showLateSessionWarning, setShowLateSessionWarning] = useState(false);

    const route = useRoute();

    useEffect(() => {
        const safeLists = Array.isArray(lists) && lists.length > 0
            ? lists.map((list) => normalizeList(list))
            : [getDefaultList()];

        const currentIds = new Set(safeLists.map((list) => list.id));
        const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map((task) => {
            const normalized = normalizeTask(task);
            if (!currentIds.has(normalized.listId)) {
                normalized.listId = safeLists[0].id;
            }
            return normalized;
        });

        const listsChanged = JSON.stringify(safeLists) !== JSON.stringify(lists);
        const tasksChanged = JSON.stringify(normalizedTasks) !== JSON.stringify(tasks);

        if (listsChanged) setLists(safeLists);
        if (tasksChanged) setTasks(normalizedTasks);

        if (!currentIds.has(activeListId)) {
            setActiveListId(safeLists[0].id);
        }
    }, [lists, tasks, activeListId, setLists, setTasks]);

    useEffect(() => {
        const taskIds = new Set(
            (tasks || [])
                .map((task) => normalizeTask(task))
                .filter((task) => !(task.done || task.completed))
                .map((task) => task.id)
        );
        setSelectedTasks((prev) => {
            const next = (Array.isArray(prev) ? prev : []).filter((id) => taskIds.has(id));
            return next.length === (Array.isArray(prev) ? prev.length : 0) ? prev : next;
        });
    }, [tasks]);

    const normalizedLists = (lists || []).map((list) => normalizeList(list));
    const normalizedTasks = (tasks || []).map((task) => normalizeTask(task));

    const listMap = Object.fromEntries(normalizedLists.map((list) => [list.id, list]));
    const currentList = listMap[activeListId] || normalizedLists[0] || getDefaultList();
    const availableTasks = normalizedTasks.filter((task) => !(task.done || task.completed));

    useEffect(() => {
        if (!activeSession && !isBreakRunning) return;

        const id = setInterval(() => {
            if (activeSession && sessionTargetTimeRef.current) {
                const remainingSec = Math.max(
                    0,
                    Math.ceil((sessionTargetTimeRef.current - Date.now()) / 1000)
                );
                setTimeRemaining(remainingSec);
                if (remainingSec === 0 && activeSession) {
                    setSessionEndQueued(true);
                }
            }

            if (isBreakRunning) {
                if (isIndefiniteBreak && breakStartTimeRef.current) {
                    const elapsedSec = Math.max(
                        0,
                        Math.floor((Date.now() - breakStartTimeRef.current) / 1000)
                    );
                    setBreakElapsedTime(elapsedSec);
                }

                if (!isIndefiniteBreak && breakTargetTimeRef.current) {
                    const remainingSec = Math.max(
                        0,
                        Math.ceil((breakTargetTimeRef.current - Date.now()) / 1000)
                    );
                    setBreakTimeRemaining(remainingSec);
                }
            }
        }, 1000);

        return () => clearInterval(id);
    }, [activeSession, isBreakRunning, isIndefiniteBreak]);

    useEffect(() => {
        if (!sessionEndQueued) return;
        if (!activeSession) {
            setSessionEndQueued(false);
            return;
        }

        const finish = () => {
            endSessionAndSave();
            setSessionEndQueued(false);
        };

        if (document.visibilityState === "hidden") {
            finish();
            return;
        }

        requestAnimationFrame(finish);
    }, [sessionEndQueued, activeSession]);

    useEffect(() => {
        if (!isBreakRunning || isIndefiniteBreak) return;
        if (breakTimeRemaining <= 0) endBreakAndSave();
    }, [isBreakRunning, isIndefiniteBreak, breakTimeRemaining]);

    useEffect(() => {
        if (route === "/session" && activeSession) {
            document.title = `🟡 ${formatTime(timeRemaining)} | Work`;
            return;
        }

        if (route === "/break" && isBreakRunning) {
            const t = isIndefiniteBreak ? formatTime(breakElapsedTime) : formatTime(breakTimeRemaining);
            document.title = `🟢 ${t} | Break`;
            return;
        }

        if (route === "/session-summary") {
            document.title = "🔴 Session Ended";
            return;
        }

        if (route === "/break-summary") {
            document.title = "☕ Break Ended";
            return;
        }

        document.title = "Stru";
    }, [
        route,
        activeSession,
        timeRemaining,
        isBreakRunning,
        breakTimeRemaining,
        breakElapsedTime,
        isIndefiniteBreak,
    ]);

    const addList = (name) => {
        const nextList = normalizeList({ id: uid(), name });
        setLists((prev) => [...(prev || []), nextList]);
        setActiveListId(nextList.id);
    };

    const renameList = (listId, name) => {
        const trimmed = (name || "").trim();
        if (!trimmed) return;
        setLists((prev) =>
            (prev || []).map((list) =>
                list.id === listId
                    ? normalizeList({ ...list, name: trimmed })
                    : list
            )
        );
    };

    const deleteList = (listId) => {
        if (!listId || listId === Stru.constants.DEFAULT_LIST_ID) return;

        setTasks((prev) =>
            (prev || []).map((task) => {
                const normalized = normalizeTask(task);
                if (normalized.listId !== listId) return normalized;
                return normalizeTask({
                    ...normalized,
                    listId: Stru.constants.DEFAULT_LIST_ID,
                    updatedAt: Date.now(),
                });
            })
        );

        setLists((prev) => (prev || []).filter((list) => list.id !== listId));
        if (activeListId === listId) {
            setActiveListId(Stru.constants.DEFAULT_LIST_ID);
        }
    };

    const addTask = (task) => {
        const nextTask = normalizeTask({
            ...task,
            id: uid(),
            listId: task?.listId || currentList.id,
            done: false,
            completed: false,
        });
        setTasks((prev) => [...(prev || []), nextTask]);
    };

    const updateTask = (id, updates) => {
        setTasks((prev) =>
            (prev || []).map((task) => {
                if (task.id !== id) return task;
                return normalizeTask({
                    ...task,
                    ...updates,
                    subtasks: updates?.subtasks !== undefined ? updates.subtasks : task.subtasks,
                    updatedAt: Date.now(),
                });
            })
        );
    };

    const createSubtasks = (lines) => (
        (lines || [])
            .map((text) => (text || "").trim())
            .filter(Boolean)
            .map((text) => ({ id: uid(), text, done: false, completed: false }))
    );

    const appendSubtasksToTask = (taskId, subtasks) => {
        const nextSubtasks = (subtasks || []).filter((subtask) => subtask?.text);
        if (nextSubtasks.length === 0) return;

        setTasks((prev) =>
            (prev || []).map((task) => {
                if (task.id !== taskId) return task;
                const existing = Array.isArray(task.subtasks) ? task.subtasks : [];
                return normalizeTask({
                    ...task,
                    subtasks: [...existing, ...nextSubtasks],
                    updatedAt: Date.now(),
                });
            })
        );
    };

    const addSubtasks = (taskId, lines) => {
        const subtasks = createSubtasks(lines);
        appendSubtasksToTask(taskId, subtasks);
        return subtasks;
    };

    const updateSubtask = (taskId, subtaskId, updates) => {
        setTasks((prev) =>
            (prev || []).map((task) => {
                if (task.id !== taskId) return task;
                const nextSubtasks = (task.subtasks || []).map((subtask) =>
                    subtask.id === subtaskId
                        ? { ...subtask, ...updates, completed: !!(updates?.done ?? updates?.completed) }
                        : subtask
                );
                return normalizeTask({
                    ...task,
                    subtasks: nextSubtasks,
                    updatedAt: Date.now(),
                });
            })
        );
    };

    const deleteTask = (id) => {
        setTasks((prev) => (prev || []).filter((task) => task.id !== id));
        setSelectedTasks((prev) => (prev || []).filter((taskId) => taskId !== id));
        if (taskForSubtasks?.id === id) setTaskForSubtasks(null);
    };

    const getSubtaskStats = (task) => {
        const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
        const completed = subtasks.filter((subtask) => subtask.done || subtask.completed).length;
        return { total: subtasks.length, completed };
    };

    const refreshBreaksFromStorage = () => {
        try {
            const raw = localStorage.getItem("stru-breaks");
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) setBreaks(parsed);
        } catch {
        }
    };

    const startDay = () => {
        setTasks([]);
        setSessions([]);
        setBreaks([]);
        setWorkEvents([]);
        setSelectedTasks([]);

        localStorage.setItem("stru-tasks", JSON.stringify([]));
        localStorage.setItem("stru-sessions", JSON.stringify([]));
        localStorage.setItem("stru-breaks", JSON.stringify([]));
        localStorage.setItem("stru-workevents", JSON.stringify([]));

        const ev = {
            id: uid(),
            type: "start",
            time: new Date(),
            text: "Workday Started",
        };

        setWorkEvents([ev]);
    };

    const endDay = () => {
        const freshTasks = loadArray("stru-tasks");
        const freshSessions = loadArray("stru-sessions");
        const freshBreaks = loadArray("stru-breaks");
        const freshWorkEvents = loadArray("stru-workevents");

        const now = new Date();

        const normSessions = (freshSessions || [])
            .map((s) => {
                const st = toDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                const et = toDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                return { ...s, startTime: st, endTime: et };
            })
            .filter((s) => s.startTime);

        const normBreaks = (freshBreaks || [])
            .map((b) => {
                const st = toDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                const et = toDate(b.endTime ?? b.end ?? b.endedAt ?? b.ended_at);
                return { ...b, startTime: st, endTime: et };
            })
            .filter((b) => b.startTime);

        const totalTasks = (freshTasks || []).length;
        const totalCompleted = (freshTasks || []).filter((t) => !!(t?.done || t?.completed)).length;
        const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

        const startEvent = [...(freshWorkEvents || [])]
            .reverse()
            .find((e) => e?.type === "start" && toDate(e.time));

        const workdayStart =
            toDate(startEvent?.time) ||
            normSessions.map((s) => s.startTime).sort((a, b) => a - b)[0] ||
            now;

        const workdaySessions = normSessions.filter((s) => s.startTime >= workdayStart && s.startTime <= now);
        const workdayBreaks = normBreaks.filter((b) => b.startTime >= workdayStart && b.startTime <= now);

        const workDuration = workdaySessions.reduce((acc, s) => acc + (Number(s.actualDuration) || 0), 0);
        const breakDuration = workdayBreaks.reduce((acc, b) => acc + (Number(b.actualDuration) || 0), 0);

        const endEv = {
            id: uid(),
            type: "end",
            time: now,
            text: "Workday Ended",
        };

        const updatedWorkEvents = [...(freshWorkEvents || []), endEv].map((e) => ({
            ...e,
            time: e?.time ? e.time : e?.timestamp ? new Date(e.timestamp) : e?.time,
        }));

        setWorkEvents(updatedWorkEvents);

        const summary = {
            id: uid(),
            date: workdayStart,
            startTime: workdayStart,
            endTime: now,
            sessionCount: workdaySessions.length,
            breakCount: workdayBreaks.length,
            workDuration,
            taskCount: totalTasks,
            completedCount: totalCompleted,
            completionRate,
            breakDuration,
        };

        setHistory((prev) => [...(prev || []), summary]);
    };

    const deleteHistoryEntry = (id) => {
        if (!id) return;
        setHistory((prev) => (prev || []).filter((entry) => entry?.id !== id));
    };

    const resetDay = (clearType) => {
        if (clearType === "tasks") {
            localStorage.setItem("stru-tasks", JSON.stringify([]));
        } else if (clearType === "everything") {
            [
                "stru-tasks",
                "stru-sessions",
                "stru-breaks",
                "stru-workevents",
                "stru-history",
                "stru-lists",
            ].forEach((key) => localStorage.removeItem(key));
        }
        window.location.reload();
    };

    const exportData = () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            data[k] = localStorage.getItem(k);
        }

        const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), storage: data }, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stru-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const importData = async (file) => {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const storage = parsed?.storage;
            if (!storage || typeof storage !== "object") return;

            Object.keys(storage).forEach((k) => {
                const v = storage[k];
                if (v === null || v === undefined) localStorage.removeItem(k);
                else localStorage.setItem(k, v);
            });

            window.location.reload();
        } catch {
        }
    };

    const openStartSession = () => {
        const now = new Date();
        if (now.getHours() >= 22) {
            setShowLateSessionWarning(true);
            return;
        }
        startSession();
    };

    const startSession = () => {
        const mins = Number(sessionDuration) || 0;
        if (mins <= 0) return;

        const picked = availableTasks.filter((task) => selectedTasks.includes(task.id));
        const sessionTasks = picked.map((task) => ({
            id: task.id,
            text: task.text,
            priority: task.priority || "",
            listId: task.listId,
            listName: listMap[task.listId]?.name || "",
            subtasks: (task.subtasks || []).map((subtask) => ({
                id: subtask.id,
                text: subtask.text,
                done: !!(subtask.done || subtask.completed),
                completed: !!(subtask.done || subtask.completed),
            })),
        }));

        const s = {
            id: uid(),
            duration: mins * 60,
            startTime: new Date(),
            tasks: sessionTasks,
            completedTasks: [],
        };

        setActiveSession(s);
        setTimeRemaining(mins * 60);
        sessionTargetTimeRef.current = Date.now() + mins * 60 * 1000;
        playBeeps("start");
        go("/session");
    };

    const endSessionAndSave = () => {
        if (!activeSession) return;

        const end = new Date();
        const start = new Date(activeSession.startTime);
        const actualDuration = Math.max(1, Math.round((end - start) / 60000));

        const finished = {
            ...activeSession,
            endTime: end,
            actualDuration,
        };

        setSessions((prev) => [...(prev || []), finished]);
        setTasks((prev) =>
            (prev || []).map((task) => {
                const completed = activeSession.completedTasks.some((completedTask) => completedTask.id === task.id);
                return completed ? normalizeTask({ ...task, done: true, completed: true }) : task;
            })
        );
        setActiveSession(null);
        sessionTargetTimeRef.current = null;
        playBeeps("end");
        go("/session-summary");
        setShowBreakReminder(true);
    };

    const startBreakFromUI = ({ label, isIndefinite, durationMin }) => {
        const startMs = Date.now();
        const safeLabel = (label || "").trim() || "Break";

        const brk = {
            id: uid(),
            startTime: new Date(startMs),
            label: safeLabel,
            duration: isIndefinite ? 0 : Math.max(1, Number(durationMin) || 5),
            isIndefinite: !!isIndefinite,
        };

        setActiveBreak(brk);
        setIsBreakRunning(true);
        setIsIndefiniteBreak(!!isIndefinite);
        breakStartTimeRef.current = startMs;

        if (isIndefinite) {
            breakTargetTimeRef.current = null;
            setBreakElapsedTime(0);
            setBreakTimeRemaining(0);
        } else {
            const durSec = Math.max(1, brk.duration) * 60;
            breakTargetTimeRef.current = startMs + durSec * 1000;
            setBreakTimeRemaining(durSec);
            setBreakElapsedTime(0);
        }

        Stru.playBreakBeeps("start");
    };

    const extendBreakInApp = (mins) => {
        const m = Number(mins) || 0;
        if (m <= 0 || !isBreakRunning || isIndefiniteBreak) return;

        setActiveBreak((prev) =>
            prev ? { ...prev, duration: (Number(prev.duration) || 0) + m } : prev
        );

        if (breakTargetTimeRef.current) breakTargetTimeRef.current += m * 60 * 1000;
        setBreakTimeRemaining((prev) => prev + m * 60);
    };

    const endBreakAndSave = () => {
        if (!activeBreak || !breakStartTimeRef.current) {
            setIsBreakRunning(false);
            setIsIndefiniteBreak(false);
            setBreakTimeRemaining(0);
            setBreakElapsedTime(0);
            breakStartTimeRef.current = null;
            breakTargetTimeRef.current = null;
            setActiveBreak(null);
            go("/home");
            return;
        }

        const endMs = Date.now();
        const durMin = Math.max(1, Math.round((endMs - breakStartTimeRef.current) / 60000));

        const finished = {
            ...activeBreak,
            endTime: new Date(endMs),
            actualDuration: durMin,
        };

        setBreaks((prev) => [...(prev || []), finished]);
        setIsBreakRunning(false);
        setBreakTimeRemaining(0);
        setBreakElapsedTime(0);
        setIsIndefiniteBreak(false);
        breakStartTimeRef.current = null;
        breakTargetTimeRef.current = null;
        setActiveBreak(null);

        Stru.playBreakBeeps("end");
        go("/break-summary");
    };

    const renderScreen = () => {
        if (route === "/session") {
            if (!activeSession) return null;

            return (
                <Stru.Screens.SessionScreen
                    session={activeSession}
                    timeRemainingSec={timeRemaining}
                    onComplete={endSessionAndSave}
                    onExtend={(mins) => {
                        const m = Number(mins) || 0;
                        if (m <= 0) return;

                        const addSec = m * 60;
                        if (sessionTargetTimeRef.current) sessionTargetTimeRef.current += addSec * 1000;
                        setActiveSession((prev) =>
                            prev ? { ...prev, duration: (Number(prev.duration) || 0) + addSec } : prev
                        );
                    }}
                    onAddSubtasksToTask={addSubtasks}
                />
            );
        }

        switch (route) {
            case "/master-list":
                return (
                    <Stru.Screens.MasterListScreen
                        tasks={normalizedTasks}
                        lists={normalizedLists}
                        activeListId={currentList.id}
                        setActiveListId={setActiveListId}
                        selectedTaskIds={selectedTasks}
                        onAdd={() => setShowAddTask(true)}
                        onOpenListsManager={() => setShowListsManager(true)}
                        onOpenSubtasks={(task) => setTaskForSubtasks(task)}
                        onUpdate={updateTask}
                        onUpdateSubtask={updateSubtask}
                        onDelete={deleteTask}
                        getSubtaskStats={getSubtaskStats}
                    />
                );

            case "/plan-session":
                return (
                    <Stru.Screens.PlanSessionScreen
                        onBack={() => go("/home")}
                        startSession={openStartSession}
                        sessionDuration={sessionDuration}
                        setSessionDuration={setSessionDuration}
                        selectedTasks={selectedTasks}
                        setSelectedTasks={setSelectedTasks}
                        availableTasks={availableTasks}
                        lists={normalizedLists}
                        activeListId={currentList.id}
                        setActiveListId={setActiveListId}
                        onOpenAddTask={() => setShowAddTask(true)}
                        onOpenSubtasks={(task) => setTaskForSubtasks(task)}
                        onDeleteTask={deleteTask}
                        getSubtaskStats={getSubtaskStats}
                    />
                );

            case "/session-summary":
                return <Stru.Screens.SessionSummaryScreen sessions={sessions} />;

            case "/break":
                return (
                    <Stru.Screens.BreakScreen
                        isBreakRunning={isBreakRunning}
                        breakTimeRemaining={breakTimeRemaining}
                        breakElapsedTime={breakElapsedTime}
                        isIndefiniteBreak={isIndefiniteBreak}
                        activeBreak={activeBreak}
                        onStartBreak={startBreakFromUI}
                        onExtendBreak={extendBreakInApp}
                        onEndBreak={endBreakAndSave}
                    />
                );

            case "/break-summary":
                return <Stru.Screens.BreakSummaryScreen breaks={breaks} />;

            case "/session-log":
                return <Stru.Screens.SessionLogScreen sessions={sessions} breaks={breaks} workEvents={workEvents} />;

            case "/daily-report":
                return <Stru.Screens.DailyReportScreen />;

            case "/history":
                return (
                    <Stru.Screens.HistoryScreen
                        history={history}
                        onDeleteHistory={deleteHistoryEntry}
                    />
                );

            case "/home":
            default:
                return (
                    <Stru.Screens.HomeScreen
                        tasks={normalizedTasks}
                        todaysSessionsCount={countTodaysSessions(sessions)}
                        onOpenSettings={() => setShowSettings(true)}
                        onStartDay={() => setShowStartDay(true)}
                        onEndDay={() => setShowEndDay(true)}
                    />
                );
        }
    };

    window.Stru.refreshBreaksFromStorage = refreshBreaksFromStorage;

    return (
        <>
            <Router />
            {renderScreen()}

            <Stru.Modals.AddTaskModal
                isOpen={showAddTask}
                onClose={() => setShowAddTask(false)}
                onAdd={addTask}
                listName={currentList.name}
            />

            <Stru.Modals.ListsManagerModal
                isOpen={showListsManager}
                onClose={() => setShowListsManager(false)}
                lists={normalizedLists}
                defaultListId={Stru.constants.DEFAULT_LIST_ID}
                onCreate={addList}
                onRename={renameList}
                onDelete={deleteList}
            />

            <Stru.Modals.AddSubtasksModal
                isOpen={!!taskForSubtasks}
                onClose={() => setTaskForSubtasks(null)}
                task={taskForSubtasks}
                onAdd={(lines) => {
                    if (!taskForSubtasks) return;
                    addSubtasks(taskForSubtasks.id, lines);
                    setTaskForSubtasks(null);
                }}
            />

            <Stru.Modals.SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onResetDay={resetDay}
                onExport={exportData}
                onImport={importData}
            />

            <Stru.Modals.StartDayModal
                isOpen={showStartDay}
                onStart={() => {
                    startDay();
                    setShowStartDay(false);
                }}
            />

            <Stru.Modals.EndDayModal
                isOpen={showEndDay}
                onEnd={() => {
                    endDay();
                    setShowEndDay(false);
                    go("/daily-report");
                }}
            />

            <Stru.Modals.BreakReminderModal
                isOpen={showBreakReminder}
                onSkip={() => setShowBreakReminder(false)}
                onTakeBreak={() => {
                    setShowBreakReminder(false);
                    go("/break");
                }}
            />

            <Stru.Modals.BreakSwitchModal
                isOpen={showLateSessionWarning}
                onClose={() => setShowLateSessionWarning(false)}
                onConfirm={() => {
                    setShowLateSessionWarning(false);
                    startSession();
                }}
                onEndDay={() => {
                    endDay();
                    setShowLateSessionWarning(false);
                    go("/daily-report");
                }}
            />
        </>
    );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
