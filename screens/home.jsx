(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    // ---------- Priority system (original) ----------
    const priorityColors = {
        must: {
            bg: "bg-rose-100",
            border: "border-rose-400",
            text: "text-rose-700",
            dot: "bg-rose-400",
            label: "Priority",
        },
        should: {
            bg: "bg-orange-100",
            border: "border-orange-400",
            text: "text-orange-700",
            dot: "bg-orange-400",
            label: "High",
        },
        could: {
            bg: "bg-yellow-50",
            border: "border-yellow-300",
            text: "text-yellow-700",
            dot: "bg-yellow-400",
            label: "Medium",
        },
        want: {
            bg: "bg-green-50",
            border: "border-green-400",
            text: "text-green-700",
            dot: "bg-green-400",
            label: "Optional",
        },
        "": {
            bg: "bg-stone-100",
            border: "border-stone-300",
            text: "text-stone-600",
            dot: "bg-stone-400",
            label: "No Priority",
        },
    };

    const PRIORITY_KEYS = ["must", "should", "could", "want", ""];

    const normalizePriority = (p) => {
        if (p === "nice") return "want";
        if (!p) return "";
        return p;
    };

    const computePrioritiesFromTasks = (tasks = []) => {
        const stats = {
            must: { active: 0, completed: 0 },
            should: { active: 0, completed: 0 },
            could: { active: 0, completed: 0 },
            want: { active: 0, completed: 0 },
            "": { active: 0, completed: 0 },
        };

        tasks.forEach((t) => {
            const p = normalizePriority(t.priority);
            const key = priorityColors[p] ? p : "";
            if (t.completed) stats[key].completed += 1;
            else stats[key].active += 1;
        });

        return stats;
    };

    // ---------- Home Screen ----------
    const HomeScreen = ({
        onOpenSettings,
        onStartDay,
        onEndDay,
        tasks = [],
        activeTasksCount,
        todaysSessionsCount = 0,
        priorities,
    }) => {
        const activeCount =
            typeof activeTasksCount === "number"
                ? activeTasksCount
                : tasks.filter((t) => !t.completed).length;

        const overview = priorities || computePrioritiesFromTasks(tasks);

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                        <div className="text-center md:text-left">
                            <h1 className="text-5xl font-bold text-stone-800 mb-2">Stru</h1>
                            <p className="text-xl text-stone-600">
                                Structured Focus System
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onStartDay}
                                className="w-32 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                            >
                                <Icons.Sun size={20} />
                                Start
                            </button>

                            <button
                                onClick={onEndDay}
                                className="w-32 bg-gradient-to-r from-purple-600 to-indigo-900 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                            >
                                <Icons.Moon size={20} />
                                End
                            </button>

                            <button
                                onClick={onOpenSettings}
                                className="bg-white px-4 py-3 rounded-xl border-2 border-stone-200 font-semibold"
                            >
                                ⚙️
                            </button>
                        </div>
                    </div>

                    {/* Main cards */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <button
                            onClick={() => Stru.router.go("/master-list")}
                            className="bg-gradient-to-br from-rose-400 to-orange-400 p-6 rounded-3xl hover:from-rose-500 hover:to-orange-500 shadow-lg transform hover:scale-[1.02] transition-all text-left"
                        >
                            <Icons.CheckSquare size={40} className="text-white mb-3" />
                            <h3 className="text-2xl font-bold text-white mb-1">Master Task List</h3>
                            <p className="text-rose-50 text-base">Manage all your tasks</p>

                            <div className="mt-4 bg-white/20 rounded-xl p-2 px-3 flex justify-between items-center text-white">
                                <span className="font-medium text-sm">Active Tasks</span>
                                <span className="text-xl font-bold">{activeCount}</span>
                            </div>
                        </button>

                        <button
                            onClick={() => Stru.router.go("/plan-session")}
                            className="bg-gradient-to-br from-lime-400 to-green-500 p-6 rounded-3xl hover:from-lime-500 hover:to-green-600 shadow-lg transform hover:scale-[1.02] transition-all text-left"
                        >
                            <Icons.Clock size={40} className="text-white mb-3" />
                            <h3 className="text-2xl font-bold text-white mb-1">Start Work Session</h3>
                            <p className="text-lime-50 text-base">Plan and begin focused work</p>

                            <div className="mt-4 bg-white/20 rounded-xl p-2 px-3 flex justify-between items-center text-white">
                                <span className="font-medium text-sm">Today&apos;s Sessions</span>
                                <span className="text-xl font-bold">{todaysSessionsCount}</span>
                            </div>
                        </button>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <button
                            onClick={() => Stru.router.go("/break")}
                            className="bg-white p-4 px-5 rounded-2xl hover:bg-orange-50 border-2 border-orange-200 shadow-sm hover:shadow-md text-left flex items-center gap-3"
                        >
                            <Icons.Coffee size={24} className="text-orange-400" />
                            <h3 className="text-lg font-bold text-stone-800">Break</h3>
                        </button>

                        <button
                            onClick={() => Stru.router.go("/session-log")}
                            className="bg-white p-4 px-5 rounded-2xl hover:bg-rose-50 border-2 border-rose-200 shadow-sm hover:shadow-md text-left flex items-center gap-3"
                        >
                            <Icons.FileText size={24} className="text-rose-400" />
                            <h3 className="text-lg font-bold text-stone-800">Log</h3>
                        </button>

                        <button
                            onClick={() => Stru.router.go("/daily-report")}
                            className="bg-white p-4 px-5 rounded-2xl hover:bg-lime-50 border-2 border-lime-200 shadow-sm hover:shadow-md text-left flex items-center gap-3"
                        >
                            <Icons.BarChart3 size={24} className="text-lime-400" />
                            <h3 className="text-lg font-bold text-stone-800">Report</h3>
                        </button>

                        <button
                            onClick={() => Stru.router.go("/history")}
                            className="bg-white p-4 px-5 rounded-2xl hover:bg-indigo-50 border-2 border-indigo-200 shadow-sm hover:shadow-md text-left flex items-center gap-3"
                        >
                            <Icons.Calendar size={24} className="text-indigo-400" />
                            <h3 className="text-lg font-bold text-stone-800">History</h3>
                        </button>
                    </div>

                    {/* Overview */}
                    <div className="bg-white p-8 rounded-2xl border-2">
                        <h4 className="text-xl font-bold mb-6">Task Overview</h4>
                        <div className="grid grid-cols-5 gap-4">
                            {PRIORITY_KEYS.map((k) => {
                                const c = priorityColors[k];
                                const d = overview[k];
                                return (
                                    <div key={k || "none"} className={`${c.bg} p-4 rounded-xl border-2 ${c.border}`}>
                                        <div className="flex justify-between mb-2">
                                            <div className={`${c.dot} w-4 h-4 rounded-full`} />
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${c.text}`}>
                                                    {d.active}
                                                </div>
                                                <div className={`text-sm ${c.text}`}>
                                                    {d.completed} done
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-medium ${c.text}`}>
                                            {c.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.HomeScreen = HomeScreen;
})();
