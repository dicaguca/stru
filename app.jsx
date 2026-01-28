const { useState, useEffect } = React;

window.Stru = window.Stru || {};
const Stru = window.Stru;

const { usePersistedState } = Stru.state;
const { Router, useRoute, go } = Stru.router;

const uid = () =>
    (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* =========================
   AUDIO (from old app)
========================= */
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
    } catch { }
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
    } catch { }
};

Stru.playBreakBeeps = playBreakBeeps;

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
};

// localStorage helpers (used for end-day snapshot accuracy)
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
const startOfDay = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    const out = new Date(dt);
    out.setHours(0, 0, 0, 0);
    return out;
};

/* =========================
   APP
========================= */
const App = () => {
    /* ---------- persisted ---------- */
    const [tasks, setTasks] = usePersistedState("stru-tasks", []);
    const [sessions, setSessions] = usePersistedState("stru-sessions", []);
    const [breaks, setBreaks] = usePersistedState("stru-breaks", []);
    const [workEvents, setWorkEvents] = usePersistedState("stru-workevents", []);
    const [history, setHistory] = usePersistedState("stru-history", []);

    /* ---------- planning ---------- */
    const [sessionDuration, setSessionDuration] = useState(25);
    const [selectedTasks, setSelectedTasks] = useState([]);

    /* ---------- active session ---------- */
    const [activeSession, setActiveSession] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);

    /* ---------- break ---------- */
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
        isIndefiniteBreak
    ]);


    /* ---------- modals ---------- */
    const [showAddTask, setShowAddTask] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStartDay, setShowStartDay] = useState(false);
    const [showEndDay, setShowEndDay] = useState(false);

    const route = useRoute();

    /* =========================
       TIMERS
    ========================= */
    useEffect(() => {
        if (!activeSession && !isBreakRunning) return;

        const id = setInterval(() => {
            if (activeSession) setTimeRemaining((t) => Math.max(0, t - 1));
            if (isBreakRunning && isIndefiniteBreak) setBreakElapsedTime((t) => t + 1);
            if (isBreakRunning && !isIndefiniteBreak) setBreakTimeRemaining((t) => Math.max(0, t - 1));
        }, 1000);

        return () => clearInterval(id);
    }, [activeSession, isBreakRunning, isIndefiniteBreak]);

    /* =========================
       TAB TITLE (old behavior)
    ========================= */
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
        isIndefiniteBreak
    ]);

    /* =========================
       TASK HELPERS
    ========================= */
    const addTask = (task) => {
        setTasks((prev) => [...prev, { ...task, id: uid(), done: false, completed: false }]);
    };

    const updateTask = (id, updates) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    };

    const deleteTask = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setSelectedTasks((prev) => prev.filter((x) => x !== id));
    };

    const availableTasks = tasks.filter((t) => !(t.done || t.completed));

    const refreshBreaksFromStorage = () => {
        try {
            const raw = localStorage.getItem("stru-breaks");
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) setBreaks(parsed);
        } catch { }
    };

    /* =========================
       DAY LIFECYCLE (THIS IS WHERE HISTORY SHOULD BE WRITTEN)
    ========================= */
    const startDay = () => {
        // clear daily state (old app behavior)
        setTasks([]);
        setSessions([]);
        setBreaks([]);
        setWorkEvents([]);

        localStorage.setItem("stru-tasks", JSON.stringify([]));
        localStorage.setItem("stru-sessions", JSON.stringify([]));
        localStorage.setItem("stru-breaks", JSON.stringify([]));
        localStorage.setItem("stru-workevents", JSON.stringify([]));

        // write new start event
        const ev = {
            id: uid(),
            type: "start",
            time: new Date(),
            text: "Workday Started",
        };

        setWorkEvents([ev]);
    };

    const endDay = () => {
        // read freshest arrays (covers the fact that some screens write to localStorage themselves)
        const freshTasks = loadArray("stru-tasks");
        const freshSessions = loadArray("stru-sessions");
        const freshBreaks = loadArray("stru-breaks");
        const freshWorkEvents = loadArray("stru-workevents");

        const now = new Date();
        const today = startOfDay(now);

        const normSessions = (freshSessions || [])
            .map((s) => {
                const st = toDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                const et = toDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                return { ...s, startTime: st, endTime: et };
            })
            .filter((s) => s.startTime && today && startOfDay(s.startTime)?.getTime() === today.getTime());

        const normBreaks = (freshBreaks || [])
            .map((b) => {
                const st = toDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                const et = toDate(b.endTime ?? b.end ?? b.endedAt ?? b.ended_at);
                return { ...b, startTime: st, endTime: et };
            })
            .filter((b) => b.startTime && today && startOfDay(b.startTime)?.getTime() === today.getTime());

        const totalTasks = (freshTasks || []).length;
        const totalCompleted = (freshTasks || []).filter((t) => !!(t?.done || t?.completed)).length;
        const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

        const workDuration = normSessions.reduce((acc, s) => acc + (Number(s.actualDuration) || 0), 0);
        const breakDuration = normBreaks.reduce((acc, b) => acc + (Number(b.actualDuration) || 0), 0);

        const startEvent = (freshWorkEvents || []).find((e) => e?.type === "start" && toDate(e.time));
        const startTime = toDate(startEvent?.time) || normSessions[0]?.startTime || now;

        const endEv = {
            id: uid(),
            type: "end",
            time: now,
            text: "Workday Ended",
        };

        // write end event first
        const updatedWorkEvents = [...(freshWorkEvents || []), endEv].map((e) => ({
            ...e,
            time: e?.time ? e.time : e?.timestamp ? new Date(e.timestamp) : e?.time,
        }));
        setWorkEvents(updatedWorkEvents);

        // THIS is the only place we append to history
        const summary = {
            id: uid(),
            date: startTime,
            startTime,
            endTime: now,
            sessionCount: normSessions.length,
            workDuration,
            taskCount: totalTasks,
            completedCount: totalCompleted,
            completionRate,
            breakCount: normBreaks.length,
            breakDuration,
        };

        setHistory((prev) => [...prev, summary]);
    };

    const deleteHistoryEntry = (id) => {
        if (!id) return;
        setHistory((prev) => prev.filter((h) => h?.id !== id));
    };

    // ---- SETTINGS ACTIONS (old behavior) ----
    const resetDay = (clearType) => {
        if (clearType === "tasks") {
            // Clear only tasks (keep everything else)
            localStorage.setItem("stru-tasks", JSON.stringify([]));
        } else if (clearType === "everything") {
            // Clear ONLY Stru data, never other apps on the same origin
            const STRU_KEYS = [
                "stru-tasks",
                "stru-sessions",
                "stru-breaks",
                "stru-workevents",
                "stru-history",
            ];

            STRU_KEYS.forEach((k) => localStorage.removeItem(k));
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
            // ignore bad file
        }
    };

    /* =========================
       SESSION LIFECYCLE
    ========================= */
    const startSession = () => {
        const mins = Number(sessionDuration) || 0;
        if (mins <= 0) return;

        const picked = availableTasks.filter((t) => selectedTasks.includes(t.id));
        const s = {
            id: uid(),
            duration: mins * 60,
            startTime: new Date(),
            tasks: picked.map((t) => ({ id: t.id, text: t.text, priority: t.priority || "" })),
            completedTasks: []
        };

        setActiveSession(s);
        setTimeRemaining(mins * 60);
        playBeeps("start");
        go("/session");
    };

    const [showBreakReminder, setShowBreakReminder] = useState(false);

    const endSessionAndSave = () => {
        if (!activeSession) return;

        const end = new Date();
        const start = new Date(activeSession.startTime);
        const actualDuration = Math.max(1, Math.round((end - start) / 60000));

        const finished = {
            ...activeSession,
            endTime: end,
            actualDuration
        };

        setSessions((prev) => [...prev, finished]);
        setTasks(prev =>
            prev.map(t =>
                activeSession.completedTasks.some(ct => ct.id === t.id)
                    ? { ...t, done: true, completed: true }
                    : t
            )
        );
        setActiveSession(null);
        playBeeps("end");

        // IMPORTANT: go to summary FIRST
        go("/session-summary");

        // THEN show the break modal on top
        setShowBreakReminder(true);
    };


    /* =========================
       ROUTING
    ========================= */
    const renderScreen = () => {
        if (route === "/session") {
            if (!activeSession) {
                return null;
            }

            return (
                <Stru.Screens.SessionScreen
                    session={activeSession}
                    onComplete={endSessionAndSave}
                    onCancel={() => {
                        setActiveSession(null);
                        go("/plan-session");
                    }}
                />
            );
        }

        switch (route) {
            case "/master-list":
                return (
                    <Stru.Screens.MasterListScreen
                        tasks={tasks}
                        onAdd={() => setShowAddTask(true)}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                    />
                );

            case "/plan-session":
                return (
                    <Stru.Screens.PlanSessionScreen
                        onBack={() => go("/home")}
                        startSession={startSession}
                        sessionDuration={sessionDuration}
                        setSessionDuration={setSessionDuration}
                        selectedTasks={selectedTasks}
                        setSelectedTasks={setSelectedTasks}
                        availableTasks={availableTasks}
                        onOpenAddTask={() => setShowAddTask(true)}
                        onDeleteTask={deleteTask}
                    />
                );

            case "/session-summary":
                return <Stru.Screens.SessionSummaryScreen sessions={sessions} />;

            case "/break":
                return <Stru.Screens.BreakScreen />;

            case "/break-summary":
                return <Stru.Screens.BreakSummaryScreen />;

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
                        tasks={tasks}
                        todaysSessionsCount={sessions.length}
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
                onSkip={() => {
                    setShowBreakReminder(false);
                }}
                onTakeBreak={() => {
                    setShowBreakReminder(false);
                    go("/break");
                }}
            />

        </>
    );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
