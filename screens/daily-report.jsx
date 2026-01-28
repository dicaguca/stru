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

    const startOfDay = (d) => {
        const dt = d instanceof Date ? d : new Date(d);
        if (Number.isNaN(dt.getTime())) return null;
        const out = new Date(dt);
        out.setHours(0, 0, 0, 0);
        return out;
    };

    const isSameDay = (a, b) => {
        const da = startOfDay(a);
        const db = startOfDay(b);
        if (!da || !db) return false;
        return da.getTime() === db.getTime();
    };

    // Reads from the same localStorage keys as the original app
    const loadArray = (key) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const normalizeTaskDone = (t) => !!(t?.done || t?.completed);

    const normalizeDate = (x) => {
        const d = x instanceof Date ? x : new Date(x);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const getDailyReport = () => {
        const today = startOfDay(new Date());

        const tasksKey = Stru?.constants?.STORAGE_KEYS?.tasks || "stru-tasks";
        const sessionsKey = Stru?.constants?.STORAGE_KEYS?.sessions || "stru-sessions";
        const breaksKey = Stru?.constants?.STORAGE_KEYS?.breaks || "stru-breaks";
        const workEventsKey = Stru?.constants?.STORAGE_KEYS?.workEvents || "stru-workevents";

        const tasks = loadArray(tasksKey);
        const sessions = loadArray(sessionsKey);
        const breaks = loadArray(breaksKey);
        const workEvents = loadArray(workEventsKey);

        const ts = sessions
            .map((s) => {
                const st = normalizeDate(s.startTime ?? s.start ?? s.startedAt ?? s.started_at);
                const et = normalizeDate(s.endTime ?? s.end ?? s.endedAt ?? s.ended_at);
                return { ...s, startTime: st, endTime: et };
            })
            .filter((s) => s.startTime && today && isSameDay(s.startTime, today));

        const tb = breaks
            .map((b) => {
                const st = normalizeDate(b.startTime ?? b.start);
                const et = normalizeDate(b.endTime ?? b.end);
                return { ...b, startTime: st, endTime: et };
            })
            .filter((b) => b.startTime && today && isSameDay(b.startTime, today));

        const te = workEvents
            .map((e) => {
                const tm = normalizeDate(e.time);
                return { ...e, time: tm };
            })
            .filter((e) => e.time && today && isSameDay(e.time, today));

        // --- SAME SIMPLIFIED LOGIC AS ORIGINAL ---
        // Global completion is based on the current master list.
        const totalMasterListTasks = tasks.length;
        const totalTasksCompleted = tasks.filter((t) => normalizeTaskDone(t)).length;
        const globalCompletionRate =
            totalMasterListTasks > 0
                ? Math.round((totalTasksCompleted / totalMasterListTasks) * 100)
                : 0;

        // Session-specific stats
        const totalSessionTasksAttempted = ts.reduce((sum, s) => {
            const arr = Array.isArray(s.tasks) ? s.tasks : [];
            return sum + arr.length;
        }, 0);

        const totalWorkTime = ts.reduce((acc, s) => acc + (Number(s.actualDuration) || 0), 0);

        const totalBreakTime = tb.reduce((sum, b) => sum + (Number(b.actualDuration) || 0), 0);

        return {
            date: today || new Date(),
            sessions: ts.map((s, i) => ({ ...s, number: i + 1 })),
            breaks: tb,
            workEvents: te,
            totalTasksAttempted: totalSessionTasksAttempted,
            totalTasksCompleted,
            totalBreakTime,
            totalWorkTime,
            totalMasterListTasks,
            globalCompletionRate,
        };
    };

    const downloadMarkdownReport = (r) => {
        const report = r || getDailyReport();

        let md = `# Daily Productivity Report\n\n**Date:** ${new Date(report.date).toLocaleDateString()}\n\n`;
        md += `## Global Stats\n- Total Tasks in Master List: ${report.totalMasterListTasks}\n- Global Completion: ${report.globalCompletionRate}%\n\n`;

        // UPDATED MARKDOWN SECTION (matches original)
        md += `## Session Summary\n- Sessions: ${report.sessions.length} (${report.totalWorkTime} min)\n- Breaks: ${report.breaks.length} (${report.totalBreakTime} min)\n- Session Tasks: ${report.totalTasksCompleted} Completed\n\n`;

        md += `## Daily Timeline\n\n`;
        const timeline = [
            ...(report.sessions || []).map((s) => ({
                time: normalizeDate(s.startTime) || new Date(),
                text: `Work Session (${s.actualDuration || 0}m)`,
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
            md += `- **${t.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}**: ${t.text}\n`;
        });
        md += `\n`;

        if ((report.sessions || []).length > 0) {
            md += `## Session Details\n\n`;
            report.sessions.forEach((s) => {
                md += `### Session #${s.number} (${s.actualDuration || 0}m)\n`;
                const completedTasks = Array.isArray(s.completedTasks) ? s.completedTasks : [];
                const incompleteTasks = Array.isArray(s.incompleteTasks) ? s.incompleteTasks : [];

                if (completedTasks.length) {
                    md += `**Completed:**\n` + completedTasks.map((t) => `- [x] ${t.text || t.title || ""}`).join("\n") + "\n";
                }
                if (incompleteTasks.length) {
                    md += `**Incomplete:**\n` + incompleteTasks.map((t) => `- [ ] ${t.text || t.title || ""}`).join("\n") + "\n";
                }
                md += `\n`;
            });
        }

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stru-report-${new Date(report.date).toISOString().split("T")[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const DailyReportScreen = () => {
        const report = React.useMemo(() => getDailyReport(), []);

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

                        <h2 className="text-4xl font-bold text-stone-800">Daily Report</h2>

                        <button
                            onClick={() => downloadMarkdownReport(report)}
                            className="ml-auto bg-stone-800 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-900"
                        >
                            <Icons.FileText size={20} />
                            <span>Download</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Global Stats */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-stone-200">
                            <h3 className="text-xl font-bold text-stone-800 mb-4">Task Completion</h3>

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
                                            strokeDasharray={`${report.globalCompletionRate}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3.5"
                                        />
                                    </svg>

                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-800">
                                        <span className="text-3xl font-bold">{report.globalCompletionRate}%</span>
                                        <span className="text-xs text-stone-500 font-bold uppercase">Done</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-stone-800">{report.totalMasterListTasks}</div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Total</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-lime-600">{report.totalTasksCompleted}</div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Done</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-400">
                                        {report.totalMasterListTasks - report.totalTasksCompleted}
                                    </div>
                                    <div className="text-xs font-bold text-stone-400 uppercase">Left</div>
                                </div>
                            </div>
                        </div>

                        {/* Session Stats */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-stone-200">
                            <h3 className="text-xl font-bold text-stone-800 mb-4">Today's Activity</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-100">
                                    <div className="text-sm font-bold text-orange-600 mb-1">Sessions</div>
                                    <div className="text-2xl font-bold text-stone-800">{report.sessions.length}</div>
                                </div>

                                {/* Work Time */}
                                <div className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-100">
                                    <div className="text-sm font-bold text-rose-600 mb-1">Work Time</div>
                                    <div className="text-2xl font-bold text-stone-800">
                                        {formatDur(report.totalWorkTime || 0)}
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-100">
                                    <div className="text-sm font-bold text-green-600 mb-1">Tasks Done</div>
                                    <div className="text-2xl font-bold text-stone-800">{report.totalTasksCompleted}</div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                                    <div className="text-sm font-bold text-blue-600 mb-1">Break Time</div>
                                    <div className="text-2xl font-bold text-stone-800">
                                        {formatDur(report.totalBreakTime || 0)}
                                    </div>
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
                                            className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${item.type === "work"
                                                    ? "bg-rose-400 border-rose-200"
                                                    : item.type === "break"
                                                        ? "bg-blue-400 border-blue-200"
                                                        : "bg-stone-400 border-stone-200"
                                                }`}
                                        ></div>

                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                                    {item.time.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
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
                                    <p className="text-stone-500 italic">No activity recorded today yet.</p>
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
