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
        want: { dot: "bg-green-400" },
        "": { dot: "bg-stone-400" },
    };

    const PRIORITY_STYLES = {
        must: { bg: "bg-rose-50", border: "border-rose-300" },
        should: { bg: "bg-orange-50", border: "border-orange-300" },
        could: { bg: "bg-yellow-50", border: "border-yellow-300" },
        nice: { bg: "bg-green-50", border: "border-green-300" },
        want: { bg: "bg-green-50", border: "border-green-300" },
        "": { bg: "bg-stone-50", border: "border-stone-200" },
    };

    const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));

    const loadAvailableTasksForSession = (excludeIds = []) => {
        try {
            const rawTasks = localStorage.getItem("stru-tasks");
            const rawLists = localStorage.getItem("stru-lists");
            const taskArr = rawTasks ? JSON.parse(rawTasks) : [];
            const listArr = rawLists ? JSON.parse(rawLists) : [];
            const tasks = Array.isArray(taskArr) ? taskArr : [];
            const lists = Array.isArray(listArr) ? listArr : [];
            const listMap = Object.fromEntries(lists.map((list) => [list.id, list.name]));
            return tasks
                .filter((t) => !(t?.done || t?.completed) && !excludeIds.includes(t?.id))
                .map((task) => ({
                    ...task,
                    listName: listMap[task?.listId] || "",
                }));
        } catch {
            return [];
        }
    };

    const SessionAddTaskModal = ({ isOpen, onClose, tasks, onAdd }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                    <h3 className="text-xl font-bold text-stone-800 mb-4">Add Task to Session</h3>

                    <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                        {tasks.length === 0 && <p className="text-stone-500 text-center">No available tasks.</p>}

                        {tasks.map((task) => (
                            <button
                                key={task.id}
                                onClick={() => onAdd(task)}
                                className={`w-full text-left p-3 rounded-xl border-2 flex items-center transition-colors ${(PRIORITY_STYLES[normalizePriority(task.priority)] || PRIORITY_STYLES[""]).bg} ${(PRIORITY_STYLES[normalizePriority(task.priority)] || PRIORITY_STYLES[""]).border}`}
                            >
                                <div className={`w-3 h-3 rounded-full mr-3 ${(PRIORITY_UI[normalizePriority(task.priority)] || PRIORITY_UI[""]).dot}`} />
                                <span className={`font-medium ${normalizePriority(task.priority) === "must" ? "font-semibold" : ""}`}>{task.text}</span>
                                <Icons.Plus size={16} className="ml-auto text-stone-600" />
                            </button>
                        ))}
                    </div>

                    <button onClick={onClose} className="bg-stone-200 text-stone-700 p-3 rounded-xl font-bold">Close</button>
                </div>
            </div>
        );
    };

    const SessionScreen = ({ session, timeRemainingSec, onExtend, onComplete, onAddSubtasksToTask }) => {
        const base = session || { duration: 25 * 60, startTime: new Date(), tasks: [], completedTasks: [] };
        const timeRemaining = Number(timeRemainingSec) || 0;
        const totalPlanned = Number(base.duration) || 0;

        const [tasks, setTasks] = useState(Array.isArray(base.tasks) ? base.tasks : []);
        const [completedIds, setCompletedIds] = useState(
            Array.isArray(base.completedTasks) ? base.completedTasks.map((task) => task?.id).filter(Boolean) : []
        );
        const [expandedTaskIds, setExpandedTaskIds] = useState([]);

        const [showAddModal, setShowAddModal] = useState(false);
        const [showExtendModal, setShowExtendModal] = useState(false);
        const [showCongratsModal, setShowCongratsModal] = useState(false);
        const [taskForSubtasks, setTaskForSubtasks] = useState(null);
        const [congratsMessage, setCongratsMessage] = useState("");
        const [congratsArmed, setCongratsArmed] = useState(true);

        const orderedTasks = React.useMemo(() => {
            const incomplete = tasks.filter((task) => !completedIds.includes(task.id));
            const complete = tasks.filter((task) => completedIds.includes(task.id));
            return [...incomplete, ...complete];
        }, [tasks, completedIds]);

        const incompleteIds = React.useMemo(
            () => orderedTasks.filter((task) => !completedIds.includes(task.id)).map((task) => task.id),
            [orderedTasks, completedIds]
        );

        const CONGRATS_MESSAGES = React.useMemo(
            () => [
                "You finished every task you picked. That's real momentum.",
                "Clean sweep. You followed through and closed it out.",
                "Nice. You cleared the whole list for this session.",
                "That was focused work. You did what you said you'd do.",
                "All planned tasks done. You earned a small victory lap.",
                "You just completed everything you set out to do. Strong.",
                "Session plan complete. Keep this streak going.",
                "You delivered. Every task checked off.",
            ],
            []
        );

        useEffect(() => {
            if (!tasks.length) return;

            const anyIncomplete = tasks.some((task) => !completedIds.includes(task.id));
            if (anyIncomplete) {
                if (!congratsArmed) setCongratsArmed(true);
                return;
            }

            if (!congratsArmed) return;

            const msg = CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)];
            setCongratsMessage(msg);
            setShowCongratsModal(true);
            setCongratsArmed(false);
        }, [tasks, completedIds, congratsArmed, CONGRATS_MESSAGES]);

        useEffect(() => {
            if (!session) return;
            session.tasks = tasks;

            const completed = tasks.filter((task) => completedIds.includes(task.id));
            session.completedTasks = completed.map((task) => ({ id: task.id, text: task.text, priority: task.priority || "" }));
        }, [session, tasks, completedIds]);

        const startTime = base.startTime instanceof Date ? base.startTime : new Date(base.startTime || Date.now());
        const estFinish = new Date(startTime.getTime() + totalPlanned * 1000);
        const progress = totalPlanned > 0 ? ((totalPlanned - timeRemaining) / totalPlanned) * 100 : 0;

        const getSubtaskStats = (task) => {
            const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
            const completed = subtasks.filter((subtask) => subtask.done || subtask.completed).length;
            return { total: subtasks.length, completed };
        };

        const endSession = () => {
            onComplete?.();
        };

        const extendSession = (mins) => {
            const m = Number(mins) || 0;
            if (m <= 0) return;
            onExtend?.(m);
            setShowExtendModal(false);
        };

        const reorderTaskById = (id, delta) => {
            const idx = incompleteIds.indexOf(id);
            if (idx === -1) return;

            const nextIdx = idx + delta;
            if (nextIdx < 0 || nextIdx >= incompleteIds.length) return;

            const a = incompleteIds[idx];
            const b = incompleteIds[nextIdx];

            setTasks((prev) => {
                const copy = prev.slice();
                const ia = copy.findIndex((task) => task.id === a);
                const ib = copy.findIndex((task) => task.id === b);
                if (ia === -1 || ib === -1) return prev;
                [copy[ia], copy[ib]] = [copy[ib], copy[ia]];
                return copy;
            });
        };

        const toggleSubtask = (taskId, subtaskId, checked) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== taskId) return task;
                    return {
                        ...task,
                        subtasks: (task.subtasks || []).map((subtask) =>
                            subtask.id === subtaskId
                                ? { ...subtask, done: checked, completed: checked }
                                : subtask
                        ),
                    };
                })
            );
        };

        const completeTask = (id) => {
            const task = tasks.find((item) => item.id === id);
            if (!task) return;

            const stats = getSubtaskStats(task);
            if (stats.total > 0 && stats.completed < stats.total) return;

            setCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        };

        const addSessionTask = (task) => {
            if (!task?.id) return;
            setTasks((prev) => {
                if (prev.some((item) => item.id === task.id)) return prev;
                return [...prev, {
                    id: task.id,
                    text: task.text,
                    priority: task.priority || "",
                    listId: task.listId,
                    listName: task.listName || "",
                    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
                }];
            });
            setShowAddModal(false);
        };

        const addSessionSubtasks = (lines) => {
            if (!taskForSubtasks?.id) return;

            const subtasks = onAddSubtasksToTask?.(taskForSubtasks.id, lines) || [];
            if (subtasks.length === 0) return;

            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== taskForSubtasks.id) return task;
                    return {
                        ...task,
                        subtasks: [...(task.subtasks || []), ...subtasks],
                    };
                })
            );
            setTaskForSubtasks(null);
        };

        const modalTasks = loadAvailableTasksForSession(tasks.map((task) => task.id));

        const removeTaskFromSession = (id) => {
            setTasks((prev) => prev.filter((task) => task.id !== id));
            setCompletedIds((prev) => prev.filter((taskId) => taskId !== id));
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-stone-200 text-center">
                            <h2 className="text-3xl font-semibold text-stone-800 mb-3">Focus Session</h2>

                            <div className="text-6xl font-bold text-green-600 mb-6">{formatTime(timeRemaining)}</div>

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

                            <div className="w-full bg-stone-200 rounded-full h-4 overflow-hidden mb-8">
                                <div className="bg-gradient-to-r from-lime-400 to-green-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setShowExtendModal(true)}
                                    className="bg-white text-stone-700 px-6 py-4 rounded-2xl font-bold text-lg hover:bg-stone-50 border-2 border-stone-200 flex items-center justify-center"
                                >
                                    <Icons.Plus size={20} className="mr-1" /> Extend
                                </button>
                                <button
                                    onClick={endSession}
                                    className="bg-red-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-red-600"
                                >
                                    <Icons.Square size={20} className="inline mr-2" />
                                    End Session
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200 w-full text-left relative">
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
                            {orderedTasks.map((task) => {
                                const isCompleted = completedIds.includes(task.id);
                                const priority = normalizePriority(task.priority);
                                const stats = getSubtaskStats(task);
                                const isExpanded = expandedTaskIds.includes(task.id);
                                const canComplete = stats.total === 0 || stats.completed === stats.total;

                                return (
                                    <div
                                        key={task.id}
                                        className={`p-0 rounded-2xl border-2 flex items-stretch overflow-hidden group transition-all ${isCompleted ? "bg-lime-50 border-lime-300 opacity-60" : `${(PRIORITY_STYLES[priority] || PRIORITY_STYLES[""]).bg} ${(PRIORITY_STYLES[priority] || PRIORITY_STYLES[""]).border}`}`}
                                    >
                                        {!isCompleted && (
                                            <div className="flex flex-col border-r-2 border-black/5 bg-white/30 w-14 flex-shrink-0">
                                                <button
                                                    onClick={() => reorderTaskById(task.id, -1)}
                                                    disabled={incompleteIds.indexOf(task.id) === 0}
                                                    className="flex-1 flex items-center justify-center hover:bg-black/10 disabled:opacity-30 text-stone-700 transition-colors"
                                                >
                                                    <Icons.ChevronUp size={28} />
                                                </button>

                                                <div className="h-0.5 bg-black/5 w-full" />

                                                <button
                                                    onClick={() => reorderTaskById(task.id, 1)}
                                                    disabled={incompleteIds.indexOf(task.id) === incompleteIds.length - 1}
                                                    className="flex-1 flex items-center justify-center hover:bg-black/10 disabled:opacity-30 text-stone-700 transition-colors"
                                                >
                                                    <Icons.ChevronDown size={28} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex-1 p-4 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${(PRIORITY_UI[priority] || PRIORITY_UI[""]).dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-lg leading-tight ${isCompleted ? "line-through text-stone-500" : priority === "must" ? "text-stone-800 font-semibold" : "text-stone-800 font-medium"}`}>
                                                        {task.text}
                                                    </div>
                                                    {stats.total > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {stats.total > 0 && (
                                                                <button
                                                                    onClick={() => setExpandedTaskIds((prev) => prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id])}
                                                                    className="px-3 py-1 rounded-full bg-white/75 text-stone-600 text-xs font-bold border border-stone-200"
                                                                >
                                                                    {stats.completed}/{stats.total} subtasks
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isCompleted ? (
                                                    <button
                                                        onClick={() => completeTask(task.id)}
                                                        disabled={!canComplete}
                                                        className="bg-gradient-to-r from-lime-400 to-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 shrink-0"
                                                        title="Complete task"
                                                        aria-label="Complete task"
                                                    >
                                                        <Icons.Check size={22} />
                                                    </button>
                                                ) : (
                                                    <Icons.Check size={28} className="text-green-600 mr-2 flex-shrink-0" />
                                                )}

                                                {!isCompleted && (
                                                    <button
                                                        onClick={() => setTaskForSubtasks(task)}
                                                        className="ml-2 p-2 rounded-lg hover:bg-white/60"
                                                        title="Add subtasks"
                                                        aria-label="Add subtasks"
                                                    >
                                                        <Icons.Plus size={18} className="text-lime-700" />
                                                    </button>
                                                )}

                                                {!isCompleted && (
                                                    <button
                                                        onClick={() => removeTaskFromSession(task.id)}
                                                        className="p-2 rounded-lg hover:bg-white/60"
                                                        title="Remove from session"
                                                    >
                                                        <Icons.X size={18} className="text-stone-500" />
                                                    </button>
                                                )}
                                            </div>

                                            {isExpanded && stats.total > 0 && (
                                                <div className="mt-4 bg-white/70 rounded-2xl border border-stone-200 p-4 space-y-2">
                                                    {(task.subtasks || []).map((subtask) => (
                                                        <label key={subtask.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-stone-50">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!(subtask.done || subtask.completed)}
                                                                onChange={(e) => toggleSubtask(task.id, subtask.id, e.target.checked)}
                                                                className="w-4 h-4 rounded border-stone-300"
                                                            />
                                                            <span className={`text-sm ${(subtask.done || subtask.completed) ? "line-through text-stone-400" : "text-stone-700"}`}>
                                                                {subtask.text}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        </div>
                    </div>
                </div>

                <SessionAddTaskModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    tasks={modalTasks}
                    onAdd={addSessionTask}
                />

                <Stru.Modals.AddSubtasksModal
                    isOpen={!!taskForSubtasks}
                    onClose={() => setTaskForSubtasks(null)}
                    task={taskForSubtasks}
                    onAdd={addSessionSubtasks}
                />

                {Stru.Modals && Stru.Modals.CongratsModal && (
                    <Stru.Modals.CongratsModal
                        isOpen={showCongratsModal}
                        message={congratsMessage}
                        onEndSession={() => {
                            setShowCongratsModal(false);
                            endSession();
                        }}
                        onAddMoreTasks={() => {
                            setShowCongratsModal(false);
                            setShowAddModal(true);
                        }}
                        onClose={() => setShowCongratsModal(false)}
                    />
                )}

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
                    <div className="flex justify-center mb-4">
                        <Icons.Check size={56} className="text-green-500" />
                    </div>

                    <h2 className="text-5xl font-semibold text-stone-800 mb-4">Session Complete!</h2>

                    <div className="bg-white p-10 rounded-3xl shadow-lg border-2 border-stone-200 mb-8">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-rose-50 rounded-xl border-2 border-rose-200">
                                <div className="text-4xl font-bold text-rose-500">{last.actualDuration}</div>
                                <div>Minutes</div>
                            </div>

                            <div className="p-4 bg-lime-50 rounded-xl border-2 border-lime-200">
                                <div className="text-4xl font-bold text-green-500">{last.completedTasks.length}</div>
                                <div>Tasks Done</div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                                <div className="text-4xl font-bold text-orange-400">
                                    {last.tasks.length > 0 ? Math.round((last.completedTasks.length / last.tasks.length) * 100) : 0}%
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
