(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;
    const { go } = Stru.router;

    const { useState, useEffect, useRef } = React;

    // Match original helper
    const formatTime = (sec) => {
        const s = Math.max(0, Math.floor(sec));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${r.toString().padStart(2, "0")}`;
    };

    const STORAGE_KEY = "stru-breaks";
    const ACTIVE_BREAK_KEY = "stru-active-break";

    const loadBreaks = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr)
                ? arr.map((b) => ({
                    ...b,
                    startTime: b?.startTime ? new Date(b.startTime) : null,
                    endTime: b?.endTime ? new Date(b.endTime) : null,
                }))
                : [];
        } catch {
            return [];
        }
    };

    const saveBreaks = (breaks) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(breaks));
        } catch {
            // ignore
        }
    };

    /* =========================
       BREAK SUMMARY (original)
    ========================= */
    const BreakSummaryScreen = () => {
        const [breaks] = useState(loadBreaks);

        const last = breaks[breaks.length - 1];
        if (!last) return null;

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-8">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="text-6xl mb-4">☕</div>
                    <h2 className="text-5xl font-bold text-stone-800 mb-4">
                        Break Ended
                    </h2>
                    <p className="text-xl text-stone-600 mb-8">
                        Hope you are recharged!
                    </p>

                    <div className="bg-white p-10 rounded-3xl shadow-lg border-2 border-stone-200 mb-8">
                        <div className="text-5xl font-bold text-orange-500 mb-2">
                            {last.actualDuration} min
                        </div>
                        <div className="text-lg text-stone-500">Total Break Time</div>
                        <div className="mt-6 pt-6 border-t-2 border-stone-100 text-stone-500">
                            Time:{" "}
                            {last.startTime ? last.startTime.toLocaleTimeString() : ""}{" "}
                            - {last.endTime ? last.endTime.toLocaleTimeString() : ""}
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => go("/home")}
                            className="flex-1 bg-stone-600 text-white p-5 rounded-xl font-bold text-xl hover:bg-stone-700 transition-colors"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => go("/plan-session")}
                            className="flex-1 bg-gradient-to-r from-lime-500 to-green-500 text-white p-5 rounded-xl font-bold text-xl"
                        >
                            Start Work
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /* =========================
       BREAK SCREEN (original)
    ========================= */
    const BreakScreen = ({
        isBreakRunning,
        setIsBreakRunning,
        breakTimeRemaining,
        setBreakTimeRemaining,
        breakElapsedTime,
        setBreakElapsedTime,
        isIndefiniteBreak,
        setIsIndefiniteBreak,
    }) => {

        // UI state (matches original defaults)
        const [breakDuration, setBreakDuration] = useState(5);
        const [breakLabel, setBreakLabel] = useState("");

        const [isIndefiniteSelection, setIsIndefiniteSelection] = useState(true);
        const [showExtendModal, setShowExtendModal] = useState(false);

        const breakStartTimeRef = useRef(null); // Date

        const [breaks, setBreaks] = useState(loadBreaks);

        useEffect(() => {
            saveBreaks(breaks);
        }, [breaks]);

        const presets = ["Coffee break", "Lunch break", "Terrace break", "Dinner break"];

        const startBreak = (isIndefinite) => {
            const startTime = new Date();
            const brk = {
                id: Date.now().toString(),
                startTime,
                duration: isIndefinite ? 0 : breakDuration,
                label: breakLabel || "Break",
            };

            setIsBreakRunning(true);
            setIsIndefiniteBreak(!!isIndefinite);
            breakStartTimeRef.current = startTime;

            if (isIndefinite) {
                setBreakElapsedTime(0);
                setBreakTimeRemaining(0);
            } else {
                const durSec = Math.max(1, breakDuration) * 60;
                setBreakTimeRemaining(durSec);
            }

            // store active break object in state-like variable
            // (we keep it derived from refs/state when rendering)
            setCurrentBreak(brk);
            Stru.playBreakBeeps("start");
        };

        // Keep currentBreak as state for rendering label in running view
        const [currentBreak, setCurrentBreak] = useState(null);

        const extendBreak = (mins) => {
            const m = Number(mins) || 0;
            if (m <= 0 || isIndefiniteBreak) return;

            setCurrentBreak((prev) =>
                prev ? { ...prev, duration: (prev.duration || 0) + m } : prev
            );

            setBreakTimeRemaining((prev) => prev + m * 60);
        };

        const endBreak = () => {
            if (!currentBreak || !breakStartTimeRef.current) {
                setIsBreakRunning(false);
                go("/home");
                return;
            }

            const end = new Date();
            const dur = Math.max(
                1,
                Math.round((end - breakStartTimeRef.current) / 60000)
            );

            const finished = {
                ...currentBreak,
                endTime: end,
                actualDuration: dur,
            };

            setBreaks((prev) => {
                const next = [...prev, finished];
                localStorage.setItem("stru-breaks", JSON.stringify(next));
                return next;
            });

            // reset break state
            setIsBreakRunning(false);
            setBreakTimeRemaining(0);
            setBreakElapsedTime(0);
            setIsIndefiniteBreak(false);
            breakStartTimeRef.current = null;

            Stru.playBreakBeeps("end");
            go("/break-summary");

            window.Stru?.refreshBreaksFromStorage?.();
            Stru.state?.syncBreaks?.();
        };

        useEffect(() => {
            if (!isBreakRunning) return;
            if (isIndefiniteBreak) return;
            if (breakTimeRemaining > 0) return;

            endBreak();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isBreakRunning, isIndefiniteBreak, breakTimeRemaining]);

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button
                            onClick={() => go("/home")}
                            className="mr-4 p-3 hover:bg-white rounded-xl"
                        >
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>
                        <h2 className="text-4xl font-bold text-stone-800">Take a Break</h2>
                    </div>

                    <div className="bg-white p-10 rounded-3xl shadow-lg border-2 border-stone-200 text-center min-h-[500px] flex flex-col justify-center">
                        {!isBreakRunning ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                {/* Presets */}
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold text-stone-700 mb-6">
                                        Quick Select
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {presets.map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setBreakLabel(type);
                                                }}
                                                className={`p-6 rounded-2xl border-2 text-xl font-bold transition-all ${breakLabel === type
                                                    ? "bg-orange-100 border-orange-400 text-orange-700 ring-2 ring-orange-200"
                                                    : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-white hover:shadow-md"
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Controls */}
                                <div className="flex flex-col items-center justify-center h-full border-l-2 border-stone-100 pl-12">
                                    <Icons.Coffee size={64} className="mb-6 text-orange-400" />
                                    <h3 className="text-3xl font-bold text-stone-800 mb-8">
                                        Customize
                                    </h3>

                                    <div className="mb-8 w-full max-w-xs">
                                        <label className="block font-semibold mb-3 text-stone-600">
                                            Break Type
                                        </label>
                                        <input
                                            type="text"
                                            value={breakLabel}
                                            onChange={(e) => setBreakLabel(e.target.value)}
                                            placeholder="e.g. Nap"
                                            className="w-full p-4 border-2 border-stone-200 rounded-xl text-center text-lg focus:border-orange-400 outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="mb-8 bg-stone-50 p-4 rounded-xl w-full max-w-xs">
                                        <div className="flex items-center justify-center space-x-3 mb-4">
                                            <input
                                                type="checkbox"
                                                id="indefinite"
                                                checked={isIndefiniteSelection}
                                                onChange={(e) =>
                                                    setIsIndefiniteSelection(e.target.checked)
                                                }
                                                className="w-6 h-6 text-orange-500 rounded focus:ring-orange-500 border-gray-300"
                                            />
                                            <label
                                                htmlFor="indefinite"
                                                className="text-xl font-bold text-stone-700 cursor-pointer"
                                            >
                                                Indefinite Duration
                                            </label>
                                        </div>

                                        {!isIndefiniteSelection && (
                                            <div className="mt-4">
                                                <label className="block font-semibold mb-2 text-stone-500">
                                                    Minutes
                                                </label>
                                                <input
                                                    type="text"
                                                    value={breakDuration}
                                                    onChange={(e) =>
                                                        setBreakDuration(parseInt(e.target.value) || 5)
                                                    }
                                                    className="w-full p-3 border-2 rounded-xl text-center text-2xl font-bold text-stone-700"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => startBreak(isIndefiniteSelection)}
                                        className="w-full max-w-xs bg-gradient-to-r from-orange-400 to-rose-400 text-white p-5 rounded-xl font-bold text-2xl shadow-lg hover:scale-105 transition-transform"
                                    >
                                        <Icons.Play size={28} className="inline mr-2" />
                                        Start Break
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // RUNNING STATE (original)
                            <div>
                                <Icons.Coffee size={80} className="mx-auto mb-6 text-orange-400" />
                                <h3 className="text-3xl font-bold text-stone-800 mb-3">
                                    {currentBreak?.label || "Break Time"}
                                </h3>

                                <div className="text-8xl font-bold text-orange-400 mb-8 tracking-tight">
                                    {isIndefiniteBreak
                                        ? formatTime(breakElapsedTime)
                                        : formatTime(breakTimeRemaining)}
                                </div>

                                {isIndefiniteBreak && (
                                    <div className="text-stone-500 mb-8 flex justify-center items-center text-xl">
                                        <Icons.Infinity size={24} className="mr-2" />
                                        Open-ended break
                                    </div>
                                )}

                                <div className="flex justify-center space-x-6">
                                    {!isIndefiniteBreak && (
                                        <button
                                            onClick={() => setShowExtendModal(true)}
                                            className="bg-white text-stone-700 px-8 py-6 rounded-2xl font-bold text-2xl shadow-lg border-2 border-stone-200 hover:bg-stone-50 flex items-center"
                                        >
                                            <Icons.Plus size={24} className="mr-2" />
                                            Extend
                                        </button>
                                    )}

                                    <button
                                        onClick={endBreak}
                                        className="bg-red-500 text-white px-10 py-6 rounded-2xl font-bold text-2xl shadow-lg hover:bg-red-600"
                                    >
                                        <Icons.Square size={24} className="inline mr-2" />
                                        End Break
                                    </button>
                                </div>

                                <Stru.Modals.ExtensionModal
                                    isOpen={showExtendModal}
                                    onClose={() => setShowExtendModal(false)}
                                    onConfirm={extendBreak}
                                    title="Extend Break"
                                    themeColor="orange"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.BreakScreen = BreakScreen;
    Stru.Screens.BreakSummaryScreen = BreakSummaryScreen;
})();
