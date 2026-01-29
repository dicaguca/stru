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
    const [sessionEndQueued, setSessionEndQueued] = useState(false);

    // Absolute time targets to prevent lag/drift (ms since epoch)
    const sessionTargetTimeRef = React.useRef(null); // number | null
    const breakTargetTimeRef = React.useRef(null);   // number | null
    const breakStartTimeRef = React.useRef(null);    // number | null (for indefinite breaks)

    useEffect(() => {
        window.Stru.timerRefs = {
            sessionTargetTimeRef,
            breakTargetTimeRef,
            breakStartTimeRef,
        };
    }, []);

    /* ---------- break ---------- */
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
            // ---- SESSION (lag-proof via absolute target time) ----
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

            // ---- BREAKS (lag-proof via absolute times) ----
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

    /* =========================
   END SESSION AFTER 00:00 RENDERS
========================= */
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionEndQueued, activeSession]);

    /* =========================
   AUTO-END TIMED BREAKS
========================= */
    useEffect(() => {
        if (!isBreakRunning) return;
        if (isIndefiniteBreak) return;

        if (breakTimeRemaining <= 0) {
            endBreakAndSave();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isBreakRunning, isIndefiniteBreak, breakTimeRemaining]);


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

        // normalize sessions
        const normSessions = (freshSessions || [])
            .map((s) => {
                const st = toDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                const et = toDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                return { ...s, startTime: st, endTime: et };
            })
            .filter((s) => s.startTime);

        // normalize breaks
        const normBreaks = (freshBreaks || [])
            .map((b) => {
                const st = toDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                const et = toDate(b.endTime ?? b.end ?? b.endedAt ?? b.ended_at);
                return { ...b, startTime: st, endTime: et };
            })
            .filter((b) => b.startTime);

        // tasks
        const totalTasks = (freshTasks || []).length;
        const totalCompleted = (freshTasks || []).filter(
            (t) => !!(t?.done || t?.completed)
        ).length;
        const completionRate =
            totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

        // determine workday start
        const startEvent = [...(freshWorkEvents || [])]
            .reverse()
            .find((e) => e?.type === "start" && toDate(e.time));

        const workdayStart =
            toDate(startEvent?.time) ||
            normSessions
                .map((s) => s.startTime)
                .sort((a, b) => a - b)[0] ||
            now;

        // filter to workday window
        const workdaySessions = normSessions.filter(
            (s) => s.startTime >= workdayStart && s.startTime <= now
        );

        const workdayBreaks = normBreaks.filter(
            (b) => b.startTime >= workdayStart && b.startTime <= now
        );

        // durations
        const workDuration = workdaySessions.reduce(
            (acc, s) => acc + (Number(s.actualDuration) || 0),
            0
        );

        const breakDuration = workdayBreaks.reduce(
            (acc, b) => acc + (Number(b.actualDuration) || 0),
            0
        );

        // write end event
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

        // append history summary
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
        sessionTargetTimeRef.current = Date.now() + mins * 60 * 1000;
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
        sessionTargetTimeRef.current = null;
        playBeeps("end");

        // IMPORTANT: go to summary FIRST
        go("/session-summary");

        // THEN show the break modal on top
        setShowBreakReminder(true);
    };

    /* =========================
       BREAK LIFECYCLE (centralized)
    ========================= */
    const startBreakFromUI = ({ label, isIndefinite, durationMin }) => {
        const startMs = Date.now();
        const safeLabel = (label || "").trim() || "Break";

        const brk = {
            id: uid(),
            startTime: new Date(startMs),
            label: safeLabel,
            duration: isIndefinite ? 0 : Math.max(1, Number(durationMin) || 5), // minutes (planned)
            isIndefinite: !!isIndefinite,
        };

        setActiveBreak(brk);

        setIsBreakRunning(true);
        setIsIndefiniteBreak(!!isIndefinite);

        // baseline for elapsed math
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
        if (m <= 0) return;
        if (!isBreakRunning) return;
        if (isIndefiniteBreak) return;

        // extend planned minutes metadata
        setActiveBreak((prev) =>
            prev ? { ...prev, duration: (Number(prev.duration) || 0) + m } : prev
        );

        // extend lag-proof target time (ms)
        if (breakTargetTimeRef.current) {
            breakTargetTimeRef.current += m * 60 * 1000;
        }

        // keep UI responsive immediately (timer loop will keep it accurate)
        setBreakTimeRemaining((prev) => prev + m * 60);
    };

    const endBreakAndSave = () => {
        if (!activeBreak || !breakStartTimeRef.current) {
            // If something is missing, just exit break mode cleanly
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

        setBreaks((prev) => [...prev, finished]);

        // reset break state
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
                    timeRemainingSec={timeRemaining}
                    onComplete={endSessionAndSave}
                    onExtend={(mins) => {
                        const m = Number(mins) || 0;
                        if (m <= 0) return;

                        const addSec = m * 60;

                        // Keep target timestamp accurate (this is what prevents lag/drift)
                        if (sessionTargetTimeRef.current) {
                            sessionTargetTimeRef.current += addSec * 1000;
                        }

                        // Keep planned duration accurate for UI (Est. Finish etc.)
                        setActiveSession((prev) =>
                            prev ? { ...prev, duration: (Number(prev.duration) || 0) + addSec } : prev
                        );
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
