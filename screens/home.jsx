(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

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
        nice: {
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

    const priorityTrackColors = {
        must: "bg-rose-200",
        should: "bg-orange-200",
        could: "bg-yellow-200",
        nice: "bg-green-200",
        "": "bg-stone-200",
    };

    const PRIORITY_KEYS = ["must", "should", "could", "nice", ""];

    const normalizePriority = (p) => {
        if (p === "want") return "nice";
        if (!p) return "";
        return p;
    };

    const computePrioritiesFromTasks = (tasks = []) => {
        const stats = {
            must: { active: 0, completed: 0 },
            should: { active: 0, completed: 0 },
            could: { active: 0, completed: 0 },
            nice: { active: 0, completed: 0 },
            "": { active: 0, completed: 0 },
        };

        tasks.forEach((t) => {
            const p = normalizePriority(t.priority);
            const key = priorityColors[p] ? p : "";
            if (t.done || t.completed) stats[key].completed += 1;
            else stats[key].active += 1;
        });

        return stats;
    };

    const secondaryActions = [
        {
            key: "break",
            label: "Break",
            icon: Icons.Coffee,
            iconClass: "text-orange-400",
            borderClass: "border-orange-200",
            hoverClass: "hover:bg-orange-50",
            onClick: () => Stru.router.go("/break"),
        },
        {
            key: "log",
            label: "Log",
            icon: Icons.FileText,
            iconClass: "text-rose-400",
            borderClass: "border-rose-200",
            hoverClass: "hover:bg-rose-50",
            onClick: () => Stru.router.go("/session-log"),
        },
        {
            key: "report",
            label: "Report",
            icon: Icons.BarChart3,
            iconClass: "text-lime-400",
            borderClass: "border-lime-200",
            hoverClass: "hover:bg-lime-50",
            onClick: () => Stru.router.go("/daily-report"),
        },
        {
            key: "history",
            label: "History",
            icon: Icons.Calendar,
            iconClass: "text-indigo-400",
            borderClass: "border-indigo-200",
            hoverClass: "hover:bg-indigo-50",
            onClick: () => Stru.router.go("/history"),
        },
    ];

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
                : tasks.filter((t) => !(t.done || t.completed)).length;
        const completedTaskCount = tasks.filter((t) => t.done || t.completed).length;
        const totalTaskCount = tasks.length;
        const overallCompletionRate = totalTaskCount > 0
            ? Math.round((completedTaskCount / totalTaskCount) * 100)
            : 0;
        const [now, setNow] = React.useState(new Date());

        const overview = priorities || computePrioritiesFromTasks(tasks);
        const overviewRows = PRIORITY_KEYS.map((key) => {
            const colors = priorityColors[key];
            const stats = overview[key];
            return {
                key: key || "none",
                label: colors.label,
                textClass: colors.text,
                dotClass: colors.dot,
                fillClass: colors.dot,
                trackClass: priorityTrackColors[key],
                total: (stats.active || 0) + (stats.completed || 0),
                completed: stats.completed || 0,
            };
        });
        const totalRow = {
            key: "total",
            label: "Total",
            textClass: "text-stone-600",
            dotClass: "bg-stone-600",
            fillClass: "bg-stone-600",
            trackClass: "bg-stone-300",
            total: totalTaskCount,
            completed: completedTaskCount,
        };
        const allOverviewRows = [...overviewRows, totalRow];
        const maxTotal = allOverviewRows.reduce((max, row) => Math.max(max, row.total), 0);

        React.useEffect(() => {
            const timer = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(timer);
        }, []);

        const dateText = now.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
        });
        const timeText = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-[68rem] mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-5 mb-10 items-end">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="flex items-center gap-4 text-center md:text-left">
                                <img
                                    src="./stru-logo.png"
                                    alt="Stru logo"
                                    className="w-16 h-16 object-contain shrink-0"
                                />
                                <div>
                                    <h1 className="text-4xl font-semibold text-stone-800">Stru</h1>
                                    <p className="text-xl text-stone-600">Structured Focus System</p>
                                </div>
                            </div>

                            <div className="flex justify-start md:justify-end">
                                <div className="flex items-center gap-4 rounded-2xl bg-white/25 px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <Icons.Calendar size={18} className="text-orange-400" />
                                        <span className="text-base text-stone-600">{dateText}</span>
                                    </div>
                                    <div className="text-stone-300">|</div>
                                    <div className="flex items-center gap-3">
                                        <Icons.Clock size={18} className="text-orange-400" />
                                        <span className="text-base text-stone-600">{timeText}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start xl:justify-end">
                            <div className="flex gap-3">
                                <button
                                    onClick={onStartDay}
                                    className="w-12 h-12 bg-transparent text-orange-400 border-2 border-orange-300 rounded-xl flex items-center justify-center transition-colors hover:text-rose-500 hover:border-rose-400"
                                    aria-label="Start day"
                                    title="Start day"
                                >
                                    <Icons.Sun size={20} />
                                </button>

                                <button
                                    onClick={onEndDay}
                                    className="w-12 h-12 bg-transparent text-orange-400 border-2 border-orange-300 rounded-xl flex items-center justify-center transition-colors hover:text-purple-700 hover:border-purple-700"
                                    aria-label="End day"
                                    title="End day"
                                >
                                    <Icons.Moon size={20} />
                                </button>

                                <button
                                    onClick={onOpenSettings}
                                    className="w-12 h-12 bg-transparent text-orange-400 border-2 border-orange-300 rounded-xl flex items-center justify-center transition-colors hover:text-stone-600 hover:border-stone-300"
                                    aria-label="Settings"
                                    title="Settings"
                                >
                                    <Icons.Settings size={19} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-5 items-start">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={() => Stru.router.go("/master-list")}
                                    className="bg-gradient-to-br from-rose-400 to-orange-400 p-6 rounded-3xl hover:from-rose-500 hover:to-orange-500 transition-all text-left"
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
                                    className="bg-gradient-to-br from-lime-400 to-green-500 p-6 rounded-3xl hover:from-lime-500 hover:to-green-600 transition-all text-left"
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

                            <div className="bg-white px-8 pt-8 pb-10 rounded-2xl border-2 border-stone-200 min-h-[21rem]">
                                <h4 className="text-xl font-bold mb-6 text-stone-800">Task Overview</h4>
                                <div className="space-y-5">
                                    {allOverviewRows.map((row) => {
                                        const totalWidth = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
                                        const completedWidth = row.total > 0 ? (row.completed / row.total) * 100 : 0;

                                        return (
                                            <div key={row.key} className="grid grid-cols-[170px_minmax(0,1fr)_70px] gap-4 items-center">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`${row.dotClass} w-3 h-3 rounded-full shrink-0`} />
                                                    <div className={`text-sm font-bold uppercase tracking-wide ${row.textClass}`}>
                                                        {row.label}
                                                    </div>
                                                </div>

                                                <div className="h-5 flex items-center">
                                                    <div
                                                        className={`h-5 rounded-full overflow-hidden ${row.trackClass}`}
                                                        style={{ width: `${totalWidth}%`, minWidth: row.total > 0 ? "3rem" : "0" }}
                                                    >
                                                        <div
                                                            className={`h-full rounded-full ${row.fillClass}`}
                                                            style={{ width: `${completedWidth}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={`text-right text-sm font-bold ${row.textClass}`}>
                                                    {row.completed}/{row.total}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <aside className="bg-white/85 rounded-3xl border-2 border-white/90 px-5 pt-8 pb-10 min-h-[16.5rem]">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400 mb-6 px-2">
                                    Quick Access
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {secondaryActions.map((action) => {
                                        const ActionIcon = action.icon;
                                        return (
                                            <button
                                                key={action.key}
                                                onClick={action.onClick}
                                                className={`bg-white min-h-[6.15rem] px-3 py-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-2 transition-colors ${action.borderClass} ${action.hoverClass}`}
                                            >
                                                <ActionIcon size={26} className={action.iconClass} />
                                                <h3 className="text-sm font-semibold text-stone-800">{action.label}</h3>
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            <aside className="bg-white/85 rounded-3xl border-2 border-white/90 px-5 py-7">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400 mb-6 px-2">
                                    Completion
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-32 h-32 shrink-0">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path
                                                className="text-stone-100"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                            />
                                            <path
                                                className="text-lime-500"
                                                strokeDasharray={`${overallCompletionRate}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3.5"
                                            />
                                        </svg>

                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-800">
                                            <span className="text-[1.7rem] font-bold">{overallCompletionRate}%</span>
                                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">Complete</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3">
                                        <div className="bg-stone-50 rounded-2xl border border-stone-200 px-2 py-2.5 text-center">
                                            <div className="text-base font-bold text-stone-800">{completedTaskCount}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Done</div>
                                        </div>
                                        <div className="bg-stone-50 rounded-2xl border border-stone-200 px-2 py-2.5 text-center">
                                            <div className="text-base font-bold text-stone-800">{totalTaskCount}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Total</div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.HomeScreen = HomeScreen;
})();
