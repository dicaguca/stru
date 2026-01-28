(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    // Matches original helper style (used in original History table)
    const formatDur = (mins) => {
        const m = Number(mins) || 0;
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rem = m % 60;
        return rem ? `${h}h ${rem}m` : `${h}h`;
    };

    // If the passed "history" is NOT already daily summaries,
    // we convert session-like entries into daily summaries so the UI still works.
    const coerceToDailySummaries = (history) => {
        const arr = Array.isArray(history) ? history : [];
        if (arr.length === 0) return [];

        // If it already looks like the original day summary objects, return as-is.
        // Original summary has: date/startTime/endTime/sessionCount/workDuration/taskCount/completedCount/completionRate/breakCount/breakDuration
        const looksLikeDaily = arr.some((x) => x && typeof x === "object" && ("sessionCount" in x || "workDuration" in x));
        if (looksLikeDaily) return arr;

        // Otherwise assume "history" is session log items: {startTime, endTime, actualDuration?}
        // Group by startTime day
        const byDay = new Map();

        const toDate = (x) => {
            const d = x instanceof Date ? x : new Date(x);
            return Number.isNaN(d.getTime()) ? null : d;
        };

        const dayKey = (d) => {
            const dd = new Date(d);
            dd.setHours(0, 0, 0, 0);
            return dd.getTime();
        };

        arr.forEach((s) => {
            const st = toDate(s?.startTime ?? s?.start ?? s?.startedAt ?? s?.started_at);
            const et = toDate(s?.endTime ?? s?.end ?? s?.endedAt ?? s?.ended_at);
            if (!st) return;

            const key = dayKey(st);
            const current = byDay.get(key) || {
                date: new Date(key),
                startTime: st,
                endTime: et || st,
                sessionCount: 0,
                workDuration: 0,
                taskCount: 0,
                completedCount: 0,
                completionRate: 0,
                breakCount: 0,
                breakDuration: 0,
            };

            current.sessionCount += 1;

            const dur =
                Number(s?.actualDuration) ||
                (et ? Math.max(1, Math.round((et.getTime() - st.getTime()) / 60000)) : 0);

            current.workDuration += dur;

            if (st < new Date(current.startTime)) current.startTime = st;
            if (et && et > new Date(current.endTime)) current.endTime = et;

            byDay.set(key, current);
        });

        return Array.from(byDay.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const HistoryScreen = ({ history }) => {
        const days = coerceToDailySummaries(history);

        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-100 to-stone-200 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button
                            onClick={() => Stru.router.go("/home")}
                            className="mr-4 p-3 hover:bg-white rounded-xl shadow-sm"
                            aria-label="Back"
                        >
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>
                        <h2 className="text-4xl font-bold text-stone-800">History Log</h2>
                    </div>

                    {days.length === 0 ? (
                        <div className="text-center py-20 text-stone-500 text-xl">
                            No history recorded yet. Complete a workday to see stats here!
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-lg border-2 border-stone-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-stone-50 border-b-2 border-stone-200 text-stone-600">
                                            <th className="p-5 font-bold">Date</th>
                                            <th className="p-5 font-bold">Hours</th>
                                            <th className="p-5 font-bold">Sessions</th>
                                            <th className="p-5 font-bold">Work Time</th>
                                            <th className="p-5 font-bold">Tasks</th>
                                            <th className="p-5 font-bold text-center">% Done</th>
                                            <th className="p-5 font-bold">Breaks</th>
                                            <th className="p-5 font-bold">Break Time</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {days
                                            .slice()
                                            .reverse()
                                            .map((day, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                                                >
                                                    <td className="p-5 font-bold text-stone-800">
                                                        {new Date(day.date).toLocaleDateString(undefined, {
                                                            weekday: "short",
                                                            year: "numeric",
                                                            month: "numeric",
                                                            day: "numeric",
                                                        })}
                                                    </td>

                                                    <td className="p-5 text-sm text-stone-600">
                                                        {new Date(day.startTime).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}{" "}
                                                        -{" "}
                                                        {new Date(day.endTime).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </td>

                                                    <td className="p-5">
                                                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold text-sm">
                                                            {day.sessionCount}
                                                        </span>
                                                    </td>

                                                    <td className="p-5 font-medium text-rose-600">
                                                        {formatDur(day.workDuration || 0)}
                                                    </td>

                                                    <td className="p-5 text-stone-600">
                                                        {day.completedCount} / {day.taskCount}
                                                    </td>

                                                    <td className="p-5 text-center">
                                                        <div className="w-full bg-stone-200 rounded-full h-2.5 dark:bg-gray-700">
                                                            <div
                                                                className="bg-green-500 h-2.5 rounded-full"
                                                                style={{ width: `${day.completionRate}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-xs mt-1 font-bold text-green-600">
                                                            {day.completionRate}%
                                                        </div>
                                                    </td>

                                                    <td className="p-5 text-stone-600">{day.breakCount}</td>

                                                    <td className="p-5 font-medium text-orange-600">
                                                        {formatDur(day.breakDuration)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.HistoryScreen = HistoryScreen;
})();
