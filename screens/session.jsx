(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;
    const { useState, useEffect } = React;

    const formatTime = (sec) => {
        const s = Math.max(0, Math.floor(sec));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${r.toString().padStart(2, "0")}`;
    };

    const PRIORITY_UI = {
        must: { dot: "bg-rose-400" },
        should: { dot: "bg-orange-400" },
        could: { dot: "bg-yellow-400" },
        nice: { dot: "bg-green-400" },
        want: { dot: "bg-green-400" }, // legacy
        "": { dot: "bg-stone-400" },
    };

    const PRIORITY_STYLES = {
        must: { bg: "bg-rose-50", border: "border-rose-300" },
        should: { bg: "bg-orange-50", border: "border-orange-300" },
        could: { bg: "bg-yellow-50", border: "border-yellow-300" },
        nice: { bg: "bg-green-50", border: "border-green-300" },
        want: { bg: "bg-green-50", border: "border-green-300" }, // legacy
        "": { bg: "bg-stone-50", border: "border-stone-200" },
    };

    const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));

    const loadAvailableTasksForSession = (excludeIds = []) => {
        try {
            const raw = localStorage.getItem("stru-tasks");
            const arr = raw ? JSON.parse(raw) : [];
            const tasks = Array.isArray(arr) ? arr : [];
            return tasks.filter((t) => !(t?.done || t?.completed) && !excludeIds.includes(t?.id));
        } catch {
            return [];
        }
    };

    const SessionAddTaskModal = ({ isOpen, onClose, tasks, onAdd }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                    <h3 className="text-xl font-bold text-stone-800 mb-4">Add Task to Session</h3>

                    <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                        {tasks.length === 0 && (
                            <p className="text-stone-500 text-center">No available tasks.</p>
                        )}

                        {tasks.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onAdd(t)}
                                className={`w-full text-left p-3 rounded-xl border-2 flex items-center transition-colors ${(PRIORITY_STYLES[normalizePriority(t.priority)] || PRIORITY_STYLES[""]).bg} ${(PRIORITY_STYLES[normalizePriority(t.priority)] || PRIORITY_STYLES[""]).border}`}
                            >
                                <div className={`w-3 h-3 rounded-full mr-3 ${(PRIORITY_UI[normalizePriority(t.priority)] || PRIORITY_UI[""]).dot}`} />
                                <span className="font-medium text-stone-800">{t.text}</span>
                                <Icons.Plus size={16} className="ml-auto text-stone-600" />
                            </button>
                        ))}
                    </div>

                    <button onClick={onClose} className="bg-stone-200 text-stone-700 p-3 rounded-xl font-bold">
                        Close
                    </button>
                </div>
            </div>
        );
    };

    const SessionScreen = ({ session, timeRemainingSec, onExtend, onComplete, onCancel }) => {
        // Safety fallback
        const base = session || { duration: 25 * 60, startTime: new Date(), tasks: [], completedTasks: [] };

        // Timer comes from App (single source of truth)
        const timeRemaining = Number(timeRemainingSec) || 0;
        const totalPlanned = Number(base.duration) || 0;

        const [tasks, setTasks] = useState(Array.isArray(base.tasks) ? base.tasks : []);
        const [completedIds, setCompletedIds] = useState(
            Array.isArray(base.completedTasks) ? base.completedTasks.map((t) => t?.id).filter(Boolean) : []
        );

        const [showAddModal, setShowAddModal] = useState(false);
        const [showExtendModal, setShowExtendModal] = useState(false);

        const orderedTasks = React.useMemo(() => {
            const incomplete = tasks.filter((t) => !completedIds.includes(t.id));
            const complete = tasks.filter((t) => completedIds.includes(t.id));
            return [...incomplete, ...complete];
        }, [tasks, completedIds]);

        const incompleteIds = React.useMemo(() => {
            return orderedTasks.filter((t) => !completedIds.includes(t.id)).map((t) => t.id);
        }, [orderedTasks, completedIds]);


        // Keep the session object in sync (so app.jsx saves the right info)
        useEffect(() => {
            if (!session) return;
            session.tasks = tasks;

            const completed = tasks.filter((t) => completedIds.includes(t.id));
            session.completedTasks = completed.map((t) => ({ id: t.id, text: t.text, priority: t.priority || "" }));
        }, [session, totalPlanned, tasks, completedIds]);

        const startTime = base.startTime instanceof Date ? base.startTime : new Date(base.startTime || Date.now());
        const estFinish = new Date(startTime.getTime() + totalPlanned * 1000);
        const progress = totalPlanned > 0 ? ((totalPlanned - timeRemaining) / totalPlanned) * 100 : 0;

        const endSession = () => {
            if (onComplete) onComplete();
            else Stru.router.go("/home");
        };

        const cancelSession = () => {
            if (onCancel) onCancel();
            else Stru.router.go("/home");
        };

        const extendSession = (mins) => {
            const m = Number(mins) || 0;
            if (m <= 0) return;
            onExtend?.(m);
            setShowExtendModal(false);
        };

        const reorderTaskById = (id, delta) => {
            // only reorder within the INCOMPLETE group (completed are locked at bottom)
            const idx = incompleteIds.indexOf(id);
            if (idx === -1) return;

            const nextIdx = idx + delta;
            if (nextIdx < 0 || nextIdx >= incompleteIds.length) return;

            const a = incompleteIds[idx];
            const b = incompleteIds[nextIdx];

            setTasks((prev) => {
                const copy = prev.slice();
                const ia = copy.findIndex((t) => t.id === a);
                const ib = copy.findIndex((t) => t.id === b);
                if (ia === -1 || ib === -1) return prev;

                // swap in the underlying array
                [copy[ia], copy[ib]] = [copy[ib], copy[ia]];
                return copy;
            });
        };

        const completeTask = (id) => {
            setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        };

        const addSessionTask = (t) => {
            if (!t?.id) return;
            setTasks((prev) => {
                if (prev.some((x) => x.id === t.id)) return prev;
                return [...prev, { id: t.id, text: t.text, priority: t.priority || "" }];
            });
            setShowAddModal(false);
        };

        const modalTasks = loadAvailableTasksForSession(tasks.map((t) => t.id));

        const removeTaskFromSession = (id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setCompletedIds((prev) => prev.filter((x) => x !== id));
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 p-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-stone-800 mb-2">Focus Session</h2>

                    {/* Timer */}
                    <div className="text-6xl font-bold text-green-600 mb-4">{formatTime(timeRemaining)}</div>

                    {/* Time Info Row */}
                    <div className="flex justify-center items-center space-x-8 mb-6">
                        <div className="text-center">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Started</div>
                            <div className="text-xl font-bold text-stone-700">
                                {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                        <div className="w-px h-8 bg-stone-300" />
                        <div className="text-center">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Est. Finish</div>
                            <div className="text-xl font-bold text-stone-700">
                                {estFinish.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-xl mx-auto bg-stone-200 rounded-full h-4 overflow-hidden mb-8">
                        <div
                            className="bg-gradient-to-r from-lime-400 to-green-500 h-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-center space-x-4 mb-8">
                        <button
                            onClick={() => setShowExtendModal(true)}
                            className="bg-white text-stone-700 px-6 py-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-stone-50 border-2 border-stone-200 flex items-center"
                        >
                            <Icons.Plus size={20} className="mr-1" /> Extend
                        </button>
                        <button
                            onClick={endSession}
                            className="bg-red-500 text-white px-8 py-5 rounded-2xl font-bold text-lg shadow-lg hover:bg-red-600"
                        >
                            <Icons.Square size={20} className="inline mr-2" />
                            End Session
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200 w-full mx-auto text-left relative">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-stone-800">Tasks</h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100"
                            >
                                + Add Task
                            </button>
                        </div>

                        <div className="space-y-4">
                            {orderedTasks.map((t) => {

                                const isCompleted = completedIds.includes(t.id);

                                return (
                                    <div
                                        key={t.id}
                                        className={`p-0 rounded-2xl border-2 flex items-stretch overflow-hidden group transition-all ${isCompleted
                                            ? "bg-lime-50 border-lime-300 opacity-60"
                                            : `${(PRIORITY_STYLES[normalizePriority(t.priority)] || PRIORITY_STYLES[""]).bg} ${(PRIORITY_STYLES[normalizePriority(t.priority)] || PRIORITY_STYLES[""]).border}`
                                            }`}
                                    >

                                        {!isCompleted && (
                                            <div className="flex flex-col border-r-2 border-black/5 bg-white/30 w-14 flex-shrink-0">
                                                <button
                                                    onClick={() => reorderTaskById(t.id, -1)}
                                                    disabled={incompleteIds.indexOf(t.id) === 0}
                                                    className="flex-1 flex items-center justify-center hover:bg-black/10 disabled:opacity-30 text-stone-700 transition-colors"
                                                >
                                                    <Icons.ChevronUp size={28} />
                                                </button>

                                                <div className="h-0.5 bg-black/5 w-full" />

                                                <button
                                                    onClick={() => reorderTaskById(t.id, 1)}
                                                    disabled={incompleteIds.indexOf(t.id) === incompleteIds.length - 1}
                                                    className="flex-1 flex items-center justify-center hover:bg-black/10 disabled:opacity-30 text-stone-700 transition-colors"
                                                >
                                                    <Icons.ChevronDown size={28} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex-1 p-4 flex items-center gap-3 min-w-0">
                                            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${(PRIORITY_UI[normalizePriority(t.priority)] || PRIORITY_UI[""]).dot}`} />
                                            <span className={`flex-1 text-lg ${isCompleted ? "line-through text-stone-500" : "text-stone-800 font-medium"}`}>
                                                {t.text}
                                            </span>

                                            {!isCompleted ? (
                                                <button
                                                    onClick={() => completeTask(t.id)}
                                                    className="bg-gradient-to-r from-lime-400 to-green-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap shadow-sm hover:shadow-md"
                                                >
                                                    Complete
                                                </button>
                                            ) : (
                                                <Icons.Check size={28} className="text-green-600 mr-2 flex-shrink-0" />
                                            )}

                                            {!isCompleted && (
                                                <button
                                                    onClick={() => removeTaskFromSession(t.id)}
                                                    className="ml-2 p-2 rounded-lg hover:bg-white/60"
                                                    title="Remove from session"
                                                >
                                                    <Icons.X size={18} className="text-stone-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <SessionAddTaskModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    tasks={modalTasks}
                    onAdd={addSessionTask}
                />

                {Stru.Modals && Stru.Modals.ExtensionModal && (
                    <Stru.Modals.ExtensionModal
                        isOpen={showExtendModal}
                        onClose={() => setShowExtendModal(false)}
                        onConfirm={extendSession}
                        title="Extend Session"
                        themeColor="green"
                    />
                )}
            </div>
        );
    };

    const SessionSummaryScreen = ({ sessions }) => {
        const last = sessions[sessions.length - 1];
        if (!last) return null;

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="text-6xl mb-4">🎉</div>

                    <h2 className="text-5xl font-bold text-stone-800 mb-4">
                        Session Complete!
                    </h2>

                    <div className="bg-white p-10 rounded-3xl shadow-lg border-2 border-stone-200 mb-8">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-rose-50 rounded-xl border-2 border-rose-200">
                                <div className="text-4xl font-bold text-rose-500">
                                    {last.actualDuration}
                                </div>
                                <div>Minutes</div>
                            </div>

                            <div className="p-4 bg-lime-50 rounded-xl border-2 border-lime-200">
                                <div className="text-4xl font-bold text-green-500">
                                    {last.completedTasks.length}
                                </div>
                                <div>Tasks Done</div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                                <div className="text-4xl font-bold text-orange-400">
                                    {last.tasks.length > 0
                                        ? Math.round(
                                            (last.completedTasks.length / last.tasks.length) * 100
                                        )
                                        : 0}
                                    %
                                </div>
                                <div>Success</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => Stru.router.go("/home")}
                            className="flex-1 bg-stone-600 text-white p-5 rounded-xl font-bold text-xl hover:bg-stone-700 transition-colors"
                        >
                            Home
                        </button>

                        <button
                            onClick={() => Stru.router.go("/break")}
                            className="flex-1 bg-gradient-to-r from-orange-400 to-rose-400 text-white p-5 rounded-xl font-bold text-xl"
                        >
                            Take Break
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    Stru.Screens = Stru.Screens || {};
    Stru.Screens.SessionScreen = SessionScreen;
    Stru.Screens.SessionSummaryScreen = SessionSummaryScreen;
})();
