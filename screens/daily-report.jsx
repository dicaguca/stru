(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    const formatDur = (mins) => {
        const m = Number(mins) || 0;
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rem = m % 60;
        return rem ? `${h}h ${rem}m` : `${h}h`;
    };

    const loadArray = (key) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const normalizeDate = (x) => {
        const d = x instanceof Date ? x : new Date(x);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatDateTime = (date) => {
        const d = normalizeDate(date);
        if (!d) return "";
        return d.toLocaleString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getIncompleteTasks = (session) => {
        const tasks = Array.isArray(session?.tasks) ? session.tasks : [];
        const completedTasks = Array.isArray(session?.completedTasks) ? session.completedTasks : [];
        const explicitIncomplete = Array.isArray(session?.incompleteTasks) ? session.incompleteTasks : null;

        if (explicitIncomplete) return explicitIncomplete;

        const completedIds = new Set(
            completedTasks
                .map((task) => task?.id)
                .filter(Boolean)
        );

        return tasks.filter((task) => !completedIds.has(task?.id));
    };

    const getSessionReport = () => {
        const tasksKey = Stru?.constants?.STORAGE_KEYS?.tasks || "stru-tasks";
        const sessionsKey = Stru?.constants?.STORAGE_KEYS?.sessions || "stru-sessions";
        const breaksKey = Stru?.constants?.STORAGE_KEYS?.breaks || "stru-breaks";
        const workEventsKey = Stru?.constants?.STORAGE_KEYS?.workEvents || "stru-workevents";

        const tasks = loadArray(tasksKey);
        const sessions = loadArray(sessionsKey);
        const breaks = loadArray(breaksKey);
        const workEvents = loadArray(workEventsKey)
            .map((e) => ({
                ...e,
                time: normalizeDate(e.time ?? e.timestamp),
            }))
            .filter((e) => e.time)
            .sort((a, b) => a.time - b.time);

        const latestStartIndex = [...workEvents]
            .map((event, index) => ({ event, index }))
            .reverse()
            .find(({ event }) => event.type === "start")?.index ?? -1;

        const latestStart = latestStartIndex >= 0 ? workEvents[latestStartIndex] : null;
        const matchingEnd = latestStartIndex >= 0
            ? workEvents.slice(latestStartIndex + 1).find((event) => event.type === "end")
            : null;

        const reportStart = latestStart?.time
            || sessions
                .map((s) => normalizeDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at))
                .filter(Boolean)
                .sort((a, b) => a - b)
                .slice(-1)[0]
            || new Date();
        const reportEnd = matchingEnd?.time || new Date();

        const isWithinWindow = (date) => {
            const d = normalizeDate(date);
            if (!d) return false;
            return d >= reportStart && d <= reportEnd;
        };

        const filteredSessions = sessions
            .map((s) => {
                const st = normalizeDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                const et = normalizeDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                return { ...s, startTime: st, endTime: et };
            })
            .filter((s) => isWithinWindow(s.startTime))
            .map((s, i) => ({ ...s, number: i + 1 }));

        const filteredBreaks = breaks
            .map((b) => {
                const st = normalizeDate(b.startTime ?? b.start ?? b.startedAt ?? b.started_at);
                const et = normalizeDate(b.endTime ?? b.end ?? b.endedAt ?? b.ended_at);
                return { ...b, startTime: st, endTime: et };
            })
            .filter((b) => isWithinWindow(b.startTime));

        const filteredEvents = workEvents.filter((e) => isWithinWindow(e.time));

        const attemptedTasks = filteredSessions.flatMap((session) => Array.isArray(session.tasks) ? session.tasks : []);
        const completedTasks = filteredSessions.flatMap((session) => Array.isArray(session.completedTasks) ? session.completedTasks : []);

        const attemptedIds = new Set(attemptedTasks.map((task) => task?.id).filter(Boolean));
        const completedIds = new Set(completedTasks.map((task) => task?.id).filter(Boolean));

        const sessionTasksAttempted = attemptedIds.size || attemptedTasks.length;
        const sessionTasksCompleted = completedIds.size || completedTasks.length;
        const sessionCompletionRate = sessionTasksAttempted > 0
            ? Math.round((sessionTasksCompleted / sessionTasksAttempted) * 100)
            : 0;

        const totalWorkTime = filteredSessions.reduce((acc, s) => acc + (Number(s.actualDuration) || 0), 0);
        const totalBreakTime = filteredBreaks.reduce((acc, b) => acc + (Number(b.actualDuration) || 0), 0);
        const currentTaskTotal = tasks.length;
        const currentTaskCompleted = tasks.filter((task) => !!(task?.done || task?.completed)).length;
        const overallCompletionRate = currentTaskTotal > 0
            ? Math.round((currentTaskCompleted / currentTaskTotal) * 100)
            : 0;

        return {
            startTime: reportStart,
            endTime: reportEnd,
            sessions: filteredSessions,
            breaks: filteredBreaks,
            workEvents: filteredEvents,
            sessionTasksAttempted,
            sessionTasksCompleted,
            sessionCompletionRate,
            totalWorkTime,
            totalBreakTime,
            currentTaskTotal,
            currentTaskCompleted,
            overallCompletionRate,
        };
    };

    const downloadMarkdownReport = (r) => {
        const report = r || getSessionReport();

        let md = `# Session Report\n\n`;
        md += `**Start:** ${formatDateTime(report.startTime)}\n`;
        md += `**End:** ${formatDateTime(report.endTime)}\n\n`;
        md += `## Session Stats\n`;
        md += `- Focus Sessions: ${report.sessions.length}\n`;
        md += `- Work Time: ${formatDur(report.totalWorkTime)}\n`;
        md += `- Break Time: ${formatDur(report.totalBreakTime)}\n`;
        md += `- Tasks Completed: ${report.sessionTasksCompleted}/${report.sessionTasksAttempted}\n\n`;

        md += `## Timeline\n\n`;
        const timeline = [
            ...(report.sessions || []).map((s) => ({
                time: normalizeDate(s.startTime) || new Date(),
                text: `Focus Session (${s.actualDuration || 0}m)`,
            })),
            ...(report.breaks || []).map((b) => ({
                time: normalizeDate(b.startTime) || new Date(),
                text: `Break: ${b.label || "Break"} (${b.actualDuration || 0}m)`,
            })),
            ...((report.workEvents || [])).map((e) => ({
                time: normalizeDate(e.time) || new Date(),
                text: e.text || "",
            })),
        ].sort((a, b) => a.time - b.time);

        if (timeline.length === 0) md += `No activity recorded.\n\n`;
        timeline.forEach((t) => {
            md += `- **${formatDateTime(t.time)}**: ${t.text}\n`;
        });
        md += `\n`;

        if ((report.sessions || []).length > 0) {
            md += `## Focus Sessions\n\n`;
            report.sessions.forEach((s) => {
                md += `### Session #${s.number} (${s.actualDuration || 0}m)\n`;
                const completed = Array.isArray(s.completedTasks) ? s.completedTasks : [];
                const incomplete = getIncompleteTasks(s);

                if (completed.length) {
                    md += `**Completed:**\n${completed.map((t) => `- [x] ${t.text || t.title || ""}`).join("\n")}\n`;
                }
                if (incomplete.length) {
                    md += `**Incomplete:**\n${incomplete.map((t) => `- [ ] ${t.text || t.title || ""}`).join("\n")}\n`;
                }
                md += `\n`;
            });
        }

        const dateSlug = normalizeDate(report.startTime)?.toISOString().split("T")[0] || "session";
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stru-session-report-${dateSlug}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const DailyReportScreen = () => {
        const report = React.useMemo(() => getSessionReport(), []);

        return (
            <div className="min-h-screen bg-gradient-to-br from-lime-50 to-lime-100 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button
                            onClick={() => Stru.router.go("/home")}
                            className="mr-4 p-3 hover:bg-white rounded-xl shadow-sm"
                        >
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>

                        <div>
                            <h2 className="text-4xl font-semibold text-stone-800">Session Report</h2>
                            <p className="text-stone-500 mt-1">
                                {formatDateTime(report.startTime)} to {formatDateTime(report.endTime)}
                            </p>
                        </div>

                        <button
                            onClick={() => downloadMarkdownReport(report)}
                            className="ml-auto bg-stone-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-900"
                        >
                            <Icons.FileText size={20} />
                            <span>Download</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-stone-200">
                            <h3 className="text-xl font-bold text-stone-800 mb-4">Session Completion</h3>

                            <div className="flex items-center justify-center py-4">
                                <div className="relative w-40 h-40">
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
                                            strokeDasharray={`${report.overallCompletionRate}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3.5"
                                        />
                                    </svg>

                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-800">
                                        <span className="text-3xl font-bold">{report.overallCompletionRate}%</span>
                                        <span className="text-xs text-stone-500 font-bold uppercase">Complete</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-stone-800">{report.sessionTasksAttempted}</div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Attempted</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-lime-600">{report.sessionTasksCompleted}</div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Done</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-400">
                                        {Math.max(0, report.sessionTasksAttempted - report.sessionTasksCompleted)}
                                    </div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Not Done</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-rose-500">{report.sessionCompletionRate}%</div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Effectiveness</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-stone-200">
                            <h3 className="text-xl font-bold text-stone-800 mb-4">Session Activity</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-100">
                                    <div className="text-sm font-bold text-orange-600 mb-1">Focus Sessions</div>
                                    <div className="text-2xl font-bold text-stone-800">{report.sessions.length}</div>
                                </div>

                                <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-100">
                                    <div className="text-sm font-bold text-rose-600 mb-1">Work Time</div>
                                    <div className="text-2xl font-bold text-stone-800">{formatDur(report.totalWorkTime)}</div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100">
                                    <div className="text-sm font-bold text-green-600 mb-1">Current Tasks Done</div>
                                    <div className="text-2xl font-bold text-stone-800">
                                        {report.currentTaskCompleted}/{report.currentTaskTotal}
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                                    <div className="text-sm font-bold text-blue-600 mb-1">Break Time</div>
                                    <div className="text-2xl font-bold text-stone-800">{formatDur(report.totalBreakTime)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-stone-200">
                        <h3 className="text-xl font-bold text-stone-800 mb-6">Timeline</h3>

                        <div className="space-y-6 pl-4 border-l-2 border-stone-100">
                            {[
                                ...(report.sessions || []).map((s) => ({
                                    time: normalizeDate(s.startTime),
                                    type: "work",
                                    title: `Focus Session #${s.number}`,
                                    duration: `${s.actualDuration || 0}m`,
                                    detail: `${(s.completedTasks || []).length} tasks completed`,
                                })),
                                ...(report.breaks || []).map((b) => ({
                                    time: normalizeDate(b.startTime),
                                    type: "break",
                                    title: `Break: ${b.label || "Break"}`,
                                    duration: `${b.actualDuration || 0}m`,
                                    detail: "Recharging",
                                })),
                                ...((report.workEvents || [])).map((e) => ({
                                    time: normalizeDate(e.time),
                                    type: "event",
                                    title: e.text || "",
                                    duration: "",
                                    detail: "",
                                })),
                            ]
                                .filter((x) => x.time)
                                .sort((a, b) => a.time - b.time)
                                .map((item, i) => (
                                    <div key={i} className="relative pl-8">
                                        <div
                                            className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                                                item.type === "work"
                                                    ? "bg-rose-400 border-rose-200"
                                                    : item.type === "break"
                                                        ? "bg-blue-400 border-blue-200"
                                                        : "bg-stone-400 border-stone-200"
                                            }`}
                                        />

                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                                    {formatDateTime(item.time)}
                                                </span>
                                                <h4 className="text-lg font-bold text-stone-800">{item.title}</h4>
                                                {item.detail && <p className="text-stone-500 text-sm">{item.detail}</p>}
                                            </div>
                                            {item.duration && <div className="font-bold text-stone-400">{item.duration}</div>}
                                        </div>
                                    </div>
                                ))}

                            {(report.sessions || []).length === 0 &&
                                (report.breaks || []).length === 0 &&
                                (report.workEvents || []).length === 0 && (
                                    <p className="text-stone-500 italic">No activity recorded in this session yet.</p>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.DailyReportScreen = DailyReportScreen;
})();
