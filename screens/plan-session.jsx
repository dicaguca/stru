(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;
    const { useState, useEffect } = React;

    const priorityColors =
        (Stru.constants && Stru.constants.priorityColors) || {
            must: { bg: "bg-rose-50", border: "border-rose-300", dot: "bg-rose-400" },
            should: { bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-400" },
            could: { bg: "bg-yellow-50", border: "border-yellow-300", dot: "bg-yellow-400" },
            nice: { bg: "bg-green-50", border: "border-green-300", dot: "bg-green-400" },
            "": { bg: "bg-stone-50", border: "border-stone-200", dot: "bg-stone-400" },
        };

    const PRIORITY_ORDER = ["must", "should", "could", "nice", ""];
    const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));

    const DurationPicker = ({ duration, setDuration }) => {
        const [activeField, setActiveField] = useState("duration");
        const [endTimeInput, setEndTimeInput] = useState("");
        const safeDuration = Number.isFinite(Number(duration)) ? Number(duration) : 0;

        const formatMilitary = (d) =>
            d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");

        useEffect(() => {
            const end = new Date(Date.now() + safeDuration * 60000);
            setEndTimeInput(formatMilitary(end));
        }, [safeDuration]);

        const setByEndTime = (hhmm) => {
            const parts = (hhmm || "").split(":");
            if (parts.length !== 2) return;

            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (Number.isNaN(h) || Number.isNaN(m)) return;

            const now = new Date();
            const target = new Date();
            target.setHours(h, m, 0, 0);

            let diffMs = target.getTime() - now.getTime();
            if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

            const diffMins = Math.round(diffMs / 60000);
            if (diffMins > 0) setDuration(diffMins);
        };

        return (
            <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${activeField === "duration" ? "text-stone-500" : "text-stone-300"}`}>Duration</label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={String(safeDuration)}
                                onFocus={() => setActiveField("duration")}
                                onChange={(e) => {
                                    const digitsOnly = (e.target.value || "").replace(/[^\d]/g, "");
                                    setDuration(parseInt(digitsOnly || "0", 10));
                                }}
                                className={`w-full py-4 pl-12 pr-10 rounded-2xl border-2 text-xl font-bold outline-none transition-all text-center ${activeField === "duration" ? "border-stone-800 ring-4 ring-stone-100 bg-stone-50 text-stone-700" : "border-stone-200 bg-white text-stone-400"}`}
                            />
                            <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${activeField === "duration" ? "text-stone-400" : "text-stone-300"}`}>MIN</span>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setDuration(Math.max(0, safeDuration + 1))} className="text-stone-400 hover:text-stone-600 leading-none">
                                    <Icons.ChevronUp size={16} />
                                </button>
                                <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => setDuration(Math.max(0, safeDuration - 1))} className="text-stone-400 hover:text-stone-600 leading-none">
                                    <Icons.ChevronDown size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${activeField === "end" ? "text-stone-500" : "text-stone-300"}`}>End Time</label>
                        <input
                            type="text"
                            value={endTimeInput}
                            onFocus={() => setActiveField("end")}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEndTimeInput(val);
                                setByEndTime(val);
                            }}
                            placeholder="HH:MM"
                            className={`w-full p-4 rounded-2xl border-2 text-xl font-bold outline-none transition-all text-center ${activeField === "end" ? "border-stone-800 ring-4 ring-stone-100 bg-stone-50 text-stone-700" : "border-stone-200 bg-white text-stone-400"}`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {(activeField === "duration" ? [15, 30, 45, 60, 90, 120] : ["11:30", "12:00", "13:30", "17:00", "20:00", "22:00"]).map((value) => (
                        <button
                            key={value}
                            onClick={() => {
                                if (typeof value === "number") setDuration(value);
                                else {
                                    setEndTimeInput(value);
                                    setByEndTime(value);
                                }
                            }}
                            className="py-3 px-4 rounded-xl text-sm bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors"
                        >
                            {typeof value === "number" ? `${value}m` : value}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const PlanSessionScreen = ({
        onBack,
        startSession,
        sessionDuration,
        setSessionDuration,
        selectedTasks,
        setSelectedTasks,
        availableTasks,
        lists,
        activeListId,
        setActiveListId,
        onOpenAddTask,
        onOpenSubtasks,
        onDeleteTask,
        getSubtaskStats,
    }) => {
        const [now, setNow] = useState(new Date());
        const [isTotalTabActive, setIsTotalTabActive] = useState(false);

        useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), 60000);
            return () => clearInterval(timer);
        }, []);

        const safeDuration = Number.isFinite(Number(sessionDuration)) ? Number(sessionDuration) : 0;
        const endTime = new Date(now.getTime() + safeDuration * 60000);
        const timeString = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

        const sortByPriority = (a, b) => {
            const pa = PRIORITY_ORDER.indexOf(normalizePriority(a.priority));
            const pb = PRIORITY_ORDER.indexOf(normalizePriority(b.priority));
            return pa - pb;
        };

        const tasks = Array.isArray(availableTasks) ? availableTasks.slice().sort(sortByPriority) : [];
        const picked = Array.isArray(selectedTasks) ? selectedTasks : [];
        const taskIdSet = React.useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);

        useEffect(() => {
            setSelectedTasks((prev) => {
                const arr = Array.isArray(prev) ? prev : [];
                const next = arr.filter((id) => taskIdSet.has(id));
                return next.length === arr.length ? prev : next;
            });
        }, [taskIdSet, setSelectedTasks]);

        const tasksInCurrentList = tasks.filter((task) => task.listId === activeListId);
        const selectedInCurrentList = tasksInCurrentList.filter((task) => picked.includes(task.id)).length;
        const selectedTotal = tasks.filter((task) => picked.includes(task.id)).length;
        const availableOverall = tasks.length;
        const remainingOverall = Math.max(0, availableOverall - selectedTotal);
        const remainingInCurrentList = Math.max(0, tasksInCurrentList.length - selectedInCurrentList);
        const selectedTasksAcrossLists = tasks.filter((task) => picked.includes(task.id));
        const visibleTasks = isTotalTabActive ? selectedTasksAcrossLists : tasksInCurrentList;

        const selectedByList = (lists || []).map((list) => ({
            ...list,
            selected: tasks.filter((task) => task.listId === list.id && picked.includes(task.id)).length,
            available: tasks.filter((task) => task.listId === list.id).length,
        }));

        const toggleTask = (taskId) => {
            setSelectedTasks((prev) => {
                const arr = Array.isArray(prev) ? prev : [];
                return arr.includes(taskId)
                    ? arr.filter((id) => id !== taskId)
                    : [...arr, taskId];
            });
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button onClick={onBack} className="mr-4 p-3 hover:bg-white rounded-xl transition-colors">
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>
                        <h2 className="text-4xl font-semibold text-stone-800">Plan Focus Session</h2>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-8">
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-stone-200">
                                <h3 className="text-2xl font-bold mb-6 text-stone-800">Session Setup</h3>
                                <DurationPicker duration={safeDuration} setDuration={setSessionDuration || (() => { })} />

                                <div className="mb-8 bg-stone-50 border-2 border-stone-100 p-4 rounded-xl text-center">
                                    <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Estimated Schedule</div>
                                    <div className="text-xl font-bold text-stone-700">{timeString}</div>
                                </div>

                                <button
                                    onClick={startSession}
                                    className="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white p-5 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                                >
                                    <Icons.Play size={24} className="inline mr-2" />
                                    Start Session
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200">
                                <h3 className="text-xl font-bold text-stone-800 mb-4">Selection Summary</h3>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-lime-700 mb-1">Selected Total</div>
                                        <div className="text-2xl font-bold text-lime-900">{selectedTotal}</div>
                                    </div>
                                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Available Overall</div>
                                        <div className="text-2xl font-bold text-stone-800">{remainingOverall}</div>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">Selected</div>
                                        <div className="text-2xl font-bold text-rose-800">{selectedInCurrentList}</div>
                                    </div>
                                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                                        <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Available</div>
                                        <div className="text-2xl font-bold text-stone-800">{remainingInCurrentList}</div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-stone-200">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-2xl font-bold text-stone-800">Select Tasks</h3>
                                    <p className="text-stone-500 mt-1">Selections stay saved while you switch lists.</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onOpenAddTask}
                                        title="Add task"
                                        className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-sm"
                                    >
                                        <Icons.Plus size={20} className="text-white" />
                                    </button>

                                    <button
                                        onClick={() => Stru.router.go("/master-list")}
                                        title="Go to Master List"
                                        className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-sm"
                                    >
                                        <Icons.CheckSquare size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-stone-50 rounded-3xl border border-stone-200 px-5 py-4 mb-5">
                                <div className="flex flex-wrap items-center gap-3">
                                    {(lists || []).map((list) => {
                                        const summary = selectedByList.find((item) => item.id === list.id);
                                        const isActive = !isTotalTabActive && list.id === activeListId;
                                        return (
                                            <button
                                                key={list.id}
                                                onClick={() => {
                                                    setIsTotalTabActive(false);
                                                    setActiveListId(list.id);
                                                }}
                                                className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-all ${isActive ? "bg-stone-800 text-white shadow-md" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"}`}
                                            >
                                                <span>{list.name}</span>
                                                <span className={`ml-2 ${isActive ? "text-stone-200" : "text-stone-400"}`}>
                                                    {summary?.selected || 0}({summary?.available || 0})
                                                </span>
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => setIsTotalTabActive(true)}
                                        className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-all ${isTotalTabActive ? "bg-lime-100 text-lime-900 border border-lime-300 shadow-sm" : "bg-lime-50 text-lime-800 border border-lime-200 hover:bg-lime-100"}`}
                                    >
                                        <span>Total</span>
                                        <span className="ml-2 text-lime-700">{selectedTotal}({availableOverall})</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {visibleTasks.map((task) => {
                                    const priority = normalizePriority(task.priority);
                                    const style = priorityColors[priority] || priorityColors[""];
                                    const isSelected = picked.includes(task.id);
                                    const subtaskStats = getSubtaskStats(task);
                                    const textClass = [
                                        "flex-1 text-lg",
                                        priority === "must" ? "font-semibold text-stone-900" : "font-medium text-stone-800",
                                    ].join(" ");

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            role="button"
                                            className={`w-full px-5 py-2.5 rounded-2xl border-2 flex items-center gap-4 transition-all cursor-pointer ${isSelected ? `${style.bg} ${style.border} shadow-sm` : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                                        >
                                            <div className={`${style.dot} w-5 h-5 rounded-full shrink-0`} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <span className={`${textClass} leading-tight`}>{task.text}</span>
                                                    {subtaskStats.total > 0 && (
                                                        <span className="px-3 py-1 rounded-full bg-white/80 text-stone-600 text-xs font-bold border border-stone-200 whitespace-nowrap">
                                                            {subtaskStats.completed}/{subtaskStats.total} subtasks
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isSelected && <Icons.Check size={24} className="text-lime-600 shrink-0" />}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenSubtasks?.(task);
                                                }}
                                                title="Add subtasks"
                                                aria-label="Add subtasks"
                                                className="p-2 rounded-lg hover:bg-lime-50 text-lime-700 shrink-0"
                                            >
                                                <Icons.Plus size={18} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteTask?.(task.id);
                                                }}
                                                title="Delete task"
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0"
                                            >
                                                <Icons.Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {visibleTasks.length === 0 && (
                                    <div className="text-center py-14 text-stone-400">
                                        <p>{isTotalTabActive ? "No tasks selected yet." : "No tasks available in this list."}</p>
                                        <p className="mt-2">
                                            {isTotalTabActive
                                                ? "Select tasks from any list tab to review them here."
                                                : "Add tasks here or switch to another list tab."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.PlanSessionScreen = PlanSessionScreen;
})();
