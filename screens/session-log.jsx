(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    const toDate = (x) => {
        if (!x) return null;
        if (x instanceof Date) return x;
        const d = new Date(x);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const timeStr = (d) => {
        const dt = toDate(d);
        return dt ? dt.toLocaleTimeString() : "";
    };

    const SessionLogScreen = ({ sessions = [], breaks = [], workEvents = [] }) => {
        const { useState } = React;
        const [tab, setTab] = useState("timeline");

        const getTimeline = () => {
            const sessionItems = (sessions || []).map((s) => {
                const start = toDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                return {
                    ...s,
                    type: "session",
                    sortTime: start || new Date(0),
                    startTime: start || s.startTime,
                };
            });

            const breakItems = (breaks || []).map((b) => {
                const start = toDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                return {
                    ...b,
                    type: "break",
                    sortTime: start || new Date(0),
                    startTime: start || b.startTime,
                };
            });

            const eventItems = (workEvents || []).map((e) => {
                const t = toDate(e.time);
                return {
                    ...e,
                    type: "event",
                    sortTime: t || new Date(0),
                    time: t || e.time,
                };
            });

            const events = [...sessionItems, ...breakItems, ...eventItems];
            return events.sort((a, b) => b.sortTime - a.sortTime);
        };

        const timelineData = getTimeline();

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button
                            onClick={() => Stru.router.go("/home")}
                            className="mr-4 p-3 hover:bg-white rounded-xl"
                            title="Back"
                        >
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>
                        <h2 className="text-4xl font-bold text-stone-800">Activity Log</h2>
                    </div>

                    <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
                        <button
                            onClick={() => setTab("timeline")}
                            className={`flex-1 min-w-[100px] p-4 rounded-xl font-bold text-lg transition-all ${tab === "timeline"
                                    ? "bg-white shadow-md text-stone-700 border-2 border-stone-200"
                                    : "bg-white/50 text-stone-500"
                                }`}
                        >
                            Timeline
                        </button>
                        <button
                            onClick={() => setTab("sessions")}
                            className={`flex-1 min-w-[100px] p-4 rounded-xl font-bold text-lg transition-all ${tab === "sessions"
                                    ? "bg-white shadow-md text-rose-500 border-2 border-rose-200"
                                    : "bg-white/50 text-stone-500"
                                }`}
                        >
                            Sessions
                        </button>
                        <button
                            onClick={() => setTab("breaks")}
                            className={`flex-1 min-w-[100px] p-4 rounded-xl font-bold text-lg transition-all ${tab === "breaks"
                                    ? "bg-white shadow-md text-orange-500 border-2 border-orange-200"
                                    : "bg-white/50 text-stone-500"
                                }`}
                        >
                            Breaks
                        </button>
                    </div>

                    {tab === "timeline" && (
                        <div className="space-y-4 relative before:absolute before:left-[29px] before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-300">
                            {timelineData.length === 0 && (
                                <div className="text-center py-10 text-stone-400">No activity yet</div>
                            )}

                            {timelineData.map((item, i) => (
                                <div key={item.id || i} className="relative pl-16">
                                    <div
                                        className={`absolute left-4 top-4 w-8 h-8 rounded-full border-4 border-white shadow-sm z-10 flex items-center justify-center ${item.type === "session"
                                                ? "bg-rose-400"
                                                : item.type === "break"
                                                    ? "bg-orange-400"
                                                    : (item.text || "").includes("Workday Started")
                                                        ? "bg-yellow-400"
                                                        : "bg-indigo-500"
                                            }`}
                                    />
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200">
                                        {item.type === "session" && (
                                            <>
                                                <div className="flex justify-between mb-1">
                                                    <h3 className="font-bold text-lg">Work Session</h3>
                                                    <span className="text-sm text-stone-500">
                                                        {timeStr(item.startTime)}
                                                    </span>
                                                </div>
                                                <div className="text-stone-600">
                                                    {item.actualDuration} min •{" "}
                                                    {(item.completedTasks || []).length} done •{" "}
                                                    {((item.tasks || []).length - (item.completedTasks || []).length)}{" "}
                                                    not done
                                                </div>
                                            </>
                                        )}

                                        {item.type === "break" && (
                                            <>
                                                <div className="flex justify-between mb-1">
                                                    <h3 className="font-bold text-lg text-orange-600">
                                                        Break: {item.label}
                                                    </h3>
                                                    <span className="text-sm text-stone-500">
                                                        {timeStr(item.startTime)}
                                                    </span>
                                                </div>
                                                <div className="text-stone-600">
                                                    {item.actualDuration} minutes
                                                </div>
                                            </>
                                        )}

                                        {item.type === "event" && (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <h3
                                                        className={`font-bold text-lg ${(item.text || "").includes("Start")
                                                                ? "text-yellow-600"
                                                                : "text-indigo-600"
                                                            }`}
                                                    >
                                                        {item.text}
                                                    </h3>
                                                    <span className="text-sm text-stone-500">
                                                        {timeStr(item.time)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === "sessions" && (
                        <div className="space-y-4">
                            {(sessions || []).length === 0 && (
                                <div className="text-center py-10 text-stone-400">No sessions yet</div>
                            )}

                            {(sessions || [])
                                .slice()
                                .reverse()
                                .map((s, i) => {
                                    const start = toDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                                    const end = toDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                                    return (
                                        <div
                                            key={s.id || `${i}`}
                                            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-stone-200"
                                        >
                                            <div className="flex justify-between mb-2">
                                                <h3 className="font-bold text-xl">
                                                    Session #{(sessions || []).length - i}
                                                </h3>
                                                <div className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                                                    {timeStr(start)} - {timeStr(end)}
                                                </div>
                                            </div>
                                            <div className="text-stone-600">
                                                {s.actualDuration} min • {(s.completedTasks || []).length} done •{" "}
                                                {((s.tasks || []).length - (s.completedTasks || []).length)} not done
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {tab === "breaks" && (
                        <div className="space-y-4">
                            {(breaks || []).length === 0 && (
                                <div className="text-center py-10 text-stone-400">No breaks taken yet</div>
                            )}

                            {(breaks || [])
                                .slice()
                                .reverse()
                                .map((b, i) => {
                                    const start = toDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                                    const end = toDate(b.endTime ?? b.end ?? b.endedAt ?? b.ended_at);
                                    return (
                                        <div
                                            key={b.id || `${i}`}
                                            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-orange-200"
                                        >
                                            <div className="flex justify-between mb-2">
                                                <div className="flex items-center">
                                                    <Icons.Coffee size={20} className="text-orange-400 mr-2" />
                                                    <h3 className="font-bold text-xl text-stone-800">{b.label}</h3>
                                                </div>
                                                <div className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                                                    {timeStr(start)} - {timeStr(end)}
                                                </div>
                                            </div>
                                            <div className="text-stone-600 pl-7">{b.actualDuration} minutes</div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.SessionLogScreen = SessionLogScreen;
})();
