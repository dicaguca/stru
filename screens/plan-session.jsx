(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;
    const { useState, useEffect } = React;

    const priorityColors =
        (Stru.constants && Stru.constants.priorityColors) ||
        (Stru.constants && Stru.constants.PRIORITY_COLORS) ||
        {
            must: { bg: "bg-rose-50", border: "border-rose-300", dot: "bg-rose-400" },
            should: { bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-400" },
            could: { bg: "bg-yellow-50", border: "border-yellow-300", dot: "bg-yellow-400" },
            want: { bg: "bg-green-50", border: "border-green-300", dot: "bg-green-400" },
            nice: { bg: "bg-green-50", border: "border-green-300", dot: "bg-green-400" },
            "": { bg: "bg-stone-50", border: "border-stone-200", dot: "bg-stone-400" },
        };

    // Matches OLD behavior:
    // - Duration + End Time visible together
    // - Preset grid changes based on which field is active
    const DurationPicker = ({ duration, setDuration }) => {
        const [activeField, setActiveField] = useState("duration"); // "duration" | "end"
        const [endTimeInput, setEndTimeInput] = useState("");

        const safeDuration = Number.isFinite(Number(duration)) ? Number(duration) : 0;

        const formatMilitary = (d) =>
            d.getHours().toString().padStart(2, "0") +
            ":" +
            d.getMinutes().toString().padStart(2, "0");

        // Keep end-time display synced from duration.
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

        const handleEndTimeChange = (e) => {
            const val = e.target.value;
            setEndTimeInput(val);
            setByEndTime(val);
        };

        // Presets as shown in your “correct” UI.
        const durationPresets = [15, 30, 45, 60, 90, 120];
        const endTimePresets = ["11:30", "12:00", "13:30", "17:00", "20:00", "22:00"];

        return (
            <div className="mb-8">
                {/* Duration + End Time side by side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Duration */}
                    <div>
                        <label
                            className={`block text-xs font-bold mb-2 uppercase tracking-wider ${activeField === "duration" ? "text-stone-500" : "text-stone-300"
                                }`}
                        >
                            Duration
                        </label>

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
                                className={`w-full py-4 pl-12 pr-10 rounded-2xl border-2 text-xl font-bold outline-none transition-all text-center ${activeField === "duration"
                                    ? "border-stone-800 ring-4 ring-stone-100 bg-stone-50 text-stone-700"
                                    : "border-stone-200 bg-white text-stone-400"
                                    }`}
                            />

                            <span
                                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${activeField === "duration" ? "text-stone-400" : "text-stone-300"
                                    }`}
                            >
                                MIN
                            </span>

                            {/* Small up/down controls look (visual only, matches old feel) */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setDuration(Math.max(0, safeDuration + 1))}
                                    className="text-stone-400 hover:text-stone-600 leading-none"
                                    aria-label="Increase minutes"
                                >
                                    <Icons.ChevronUp size={16} />
                                </button>
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setDuration(Math.max(0, safeDuration - 1))}
                                    className="text-stone-400 hover:text-stone-600 leading-none"
                                    aria-label="Decrease minutes"
                                >
                                    <Icons.ChevronDown size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* End Time */}
                    <div>
                        <label
                            className={`block text-xs font-bold mb-2 uppercase tracking-wider ${activeField === "end" ? "text-stone-500" : "text-stone-300"
                                }`}
                        >
                            End Time
                        </label>

                        <input
                            type="text"
                            value={endTimeInput}
                            onFocus={() => setActiveField("end")}
                            onChange={handleEndTimeChange}
                            placeholder="HH:MM"
                            className={`w-full p-4 rounded-2xl border-2 text-xl font-bold outline-none transition-all text-center ${activeField === "end"
                                ? "border-stone-800 ring-4 ring-stone-100 bg-stone-50 text-stone-700"
                                : "border-stone-200 bg-white text-stone-400"
                                }`}
                        />
                    </div>
                </div>

                {/* Presets change based on active field */}
                <div className="grid grid-cols-3 gap-3">
                    {activeField === "duration"
                        ? durationPresets.map((m) => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className="py-3 px-4 rounded-xl text-sm bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors"
                            >
                                {m}m
                            </button>
                        ))
                        : endTimePresets.map((t) => (
                            <button
                                key={t}
                                onClick={() => {
                                    setEndTimeInput(t);
                                    setByEndTime(t);
                                }}
                                className="py-3 px-4 rounded-xl text-sm bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors"
                            >
                                {t}
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
        onOpenAddTask,
        onDeleteTask,
    }) => {

        const [now, setNow] = useState(new Date());

        const PRIORITY_ORDER = ["must", "should", "could", "nice", ""];
        const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));
        const sortByPriority = (a, b) => {
            const pa = PRIORITY_ORDER.indexOf(normalizePriority(a.priority));
            const pb = PRIORITY_ORDER.indexOf(normalizePriority(b.priority));
            return pa - pb;
        };

        useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), 60000);
            return () => clearInterval(timer);
        }, []);

        const safeDuration = Number.isFinite(Number(sessionDuration)) ? Number(sessionDuration) : 0;
        const endTime = new Date(now.getTime() + safeDuration * 60000);

        const timeString = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })}`;

        const tasks = Array.isArray(availableTasks)
            ? availableTasks.slice().sort(sortByPriority)
            : [];

        const picked = Array.isArray(selectedTasks) ? selectedTasks : [];

        // Only count selections that are still actually available
        const taskIdSet = React.useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
        const pickedInTasks = React.useMemo(
            () => picked.filter((id) => taskIdSet.has(id)),
            [picked, taskIdSet]
        );

        // Keep selectedTasks clean if tasks change elsewhere (done/deleted)
        useEffect(() => {
            if (typeof setSelectedTasks !== "function") return;

            setSelectedTasks((prev) => {
                const arr = Array.isArray(prev) ? prev : [];
                const next = arr.filter((id) => taskIdSet.has(id));
                return next.length === arr.length ? prev : next;
            });
        }, [taskIdSet, setSelectedTasks]);

        const back = () => {
            if (typeof onBack === "function") onBack();
            else Stru.router.go("/home");
        };

        const runStart = () => {
            if (typeof startSession === "function") startSession();
            else Stru.router.go("/session");
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button onClick={back} className="mr-4 p-3 hover:bg-white rounded-xl transition-colors">
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>
                        <h2 className="text-4xl font-bold text-stone-800">Plan Focus Session</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Session Setup */}
                        <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm border-2 border-stone-200 h-fit">
                            <h3 className="text-2xl font-bold mb-6 text-stone-800">Session Setup</h3>

                            <DurationPicker duration={safeDuration} setDuration={setSessionDuration || (() => { })} />

                            <div className="mb-8 bg-stone-50 border-2 border-stone-100 p-4 rounded-xl text-center">
                                <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Estimated Schedule</div>
                                <div className="text-xl font-bold text-stone-700">{timeString}</div>
                            </div>

                            <button
                                onClick={runStart}
                                className="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white p-5 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                            >
                                <Icons.Play size={24} className="inline mr-2" />
                                Start Session
                            </button>
                        </div>

                        {/* Select Tasks */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border-2 border-stone-200">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-bold text-stone-800">
                                    Select Tasks
                                </h3>

                                <div className="flex items-center gap-3">
                                    {/* Add Task */}
                                    <button
                                        onClick={onOpenAddTask}
                                        title="Add task"
                                        className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-sm"
                                    >
                                        <Icons.Plus size={20} className="text-white" />
                                    </button>

                                    {/* Master List shortcut */}
                                    <button
                                        onClick={() => Stru.router.go('/master-list')}
                                        title="Go to Master List"
                                        className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-sm"
                                    >
                                        <Icons.CheckSquare size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            <div className="text-stone-500 font-medium mb-6 flex space-x-6">
                                <span className="text-green-600">Selected: {pickedInTasks.length}</span>
                                <span>Remaining Available: {Math.max(0, tasks.length - pickedInTasks.length)}</span>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {tasks.map((t) => {
                                    const p = t.priority ?? "";
                                    const style = priorityColors[p] || priorityColors[""];
                                    const isSelected = pickedInTasks.includes(t.id);

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                if (!setSelectedTasks) return;
                                                setSelectedTasks((prev) => {
                                                    const arr = Array.isArray(prev) ? prev : [];
                                                    return arr.includes(t.id)
                                                        ? arr.filter((id) => id !== t.id)
                                                        : [...arr, t.id];
                                                });
                                            }}
                                            role="button"
                                            className={`w-full py-3 px-5 rounded-2xl border-2 flex items-center space-x-4 transition-all cursor-pointer ${isSelected
                                                ? `${style.bg} ${style.border}`
                                                : "bg-stone-50 border-stone-200 hover:bg-stone-100"
                                                }`}
                                        >
                                            <div className={`${style.dot} w-5 h-5 rounded-full shrink-0`} />

                                            <span className="flex-1 text-lg font-medium text-stone-800">
                                                {t.text}
                                            </span>

                                            {isSelected && (
                                                <Icons.Check size={24} className="text-lime-600 shrink-0" />
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteTask?.(t.id);
                                                }}
                                                title="Delete task"
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0"
                                            >
                                                <Icons.Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}

                                {tasks.length === 0 && (
                                    <div className="text-center py-10 text-stone-400">
                                        <p>No tasks available. Add tasks from the Master List.</p>
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
