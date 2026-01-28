(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    // We implement the original screen's priority palette locally so the UI matches the original,
    // while still supporting your current priority values (must/should/could/nice/"").
    const PRIORITY_UI = {
        must: { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-700", dot: "bg-rose-400", label: "Priority" },
        should: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", dot: "bg-orange-400", label: "High" },
        could: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", dot: "bg-yellow-400", label: "Medium" },
        nice: { bg: "bg-green-50", border: "border-green-400", text: "text-green-700", dot: "bg-green-400", label: "Optional" },
        "": { bg: "bg-stone-100", border: "border-stone-300", text: "text-stone-600", dot: "bg-stone-400", label: "No Priority" },
    };

    const PRIORITY_ORDER = ["must", "should", "could", "nice", ""];

    const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));
    const isDoneTask = (t) => !!(t.done || t.completed);

    // Original-style PrioritySelector (dot button with dropdown)
    const PrioritySelector = ({ currentPriority, onSelect, size = "normal" }) => {
        const { useState, useEffect, useRef } = React;
        const [isOpen, setIsOpen] = useState(false);
        const ref = useRef(null);

        useEffect(() => {
            const handleClickOutside = (e) => {
                if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
            };
            if (isOpen) document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [isOpen]);

        const pri = normalizePriority(currentPriority);
        const dotSize = size === "large" ? "w-5 h-5" : "w-4 h-4";

        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={`${PRIORITY_UI[pri].dot} ${dotSize} rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-stone-300 transition-all cursor-pointer flex-shrink-0`}
                    title={PRIORITY_UI[pri].label}
                />
                {isOpen && (
                    <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-lg border-2 border-stone-200 p-2 min-w-[160px]">
                        {PRIORITY_ORDER.map((p) => (
                            <button
                                key={p}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(p);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors text-left"
                            >
                                <div className={`${PRIORITY_UI[p].dot} w-4 h-4 rounded-full flex-shrink-0`} />
                                <span className="text-base font-medium text-stone-700">{PRIORITY_UI[p].label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Minimal edit modal to match original "edit" behavior and styling
    const EditTaskModal = ({ isOpen, onClose, initialText, onSave }) => {
        const { useState, useEffect } = React;
        const [text, setText] = useState(initialText || "");

        useEffect(() => {
            setText(initialText || "");
        }, [initialText]);

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-xl">
                    <h3 className="text-2xl font-bold text-stone-800 mb-6">Edit Task</h3>

                    <label className="block text-lg font-semibold mb-3 text-stone-700">Task</label>
                    <input
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none text-base mb-8"
                        placeholder="Task name"
                    />

                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-stone-200 text-stone-700 p-4 rounded-xl font-semibold text-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                const trimmed = (text || "").trim();
                                if (!trimmed) return;
                                onSave(trimmed);
                            }}
                            className="flex-1 bg-stone-800 text-white p-4 rounded-xl font-semibold text-lg"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const MasterListScreen = ({ tasks, onAdd, onUpdate, onDelete }) => {
        const { useState, useMemo } = React;

        const sortByPriority = (a, b) => {
            const pa = PRIORITY_ORDER.indexOf(normalizePriority(a.priority));
            const pb = PRIORITY_ORDER.indexOf(normalizePriority(b.priority));
            return pa - pb;
        };

        const [isBatchMode, setIsBatchMode] = useState(false);
        const [selectedIds, setSelectedIds] = useState([]);

        const [editingId, setEditingId] = useState(null);
        const editingTask = useMemo(
            () => tasks.find((t) => t.id === editingId) || null,
            [tasks, editingId]
        );

        const pending = useMemo(
            () => tasks.filter((t) => !isDoneTask(t)).slice().sort(sortByPriority),
            [tasks]
        );

        const completed = useMemo(
            () => tasks.filter((t) => isDoneTask(t)).slice().sort(sortByPriority),
            [tasks]
        );

        const pendingCount = pending.length;
        const completedCount = completed.length;

        const toggleSelection = (id) => {
            setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            );
        };

        const applyBatchPriority = (pri) => {
            selectedIds.forEach((id) => onUpdate(id, { priority: pri }));
            setIsBatchMode(false);
            setSelectedIds([]);
        };

        const toggleDone = (id) => {
            const t = tasks.find((x) => x.id === id);
            if (!t) return;
            const nextDone = !isDoneTask(t);
            onUpdate(id, { done: nextDone, completed: nextDone });
        };

        const changePriority = (id, pri) => {
            onUpdate(id, { priority: pri });
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8 pb-32">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center mb-8">
                        <button
                            onClick={() => Stru.router.go("/home")}
                            className="mr-4 p-3 hover:bg-white rounded-xl"
                            title="Back"
                        >
                            <Icons.ArrowLeft className="text-stone-600" size={28} />
                        </button>

                        <div>
                            <h2 className="text-4xl font-bold text-stone-800">Master Task List</h2>
                            <p className="text-stone-600 mt-1 font-medium">
                                Pending: {pendingCount} • Completed: {completedCount}
                            </p>
                        </div>

                        <div className="ml-auto flex space-x-2">
                            <button
                                onClick={() => {
                                    setIsBatchMode(!isBatchMode);
                                    setSelectedIds([]);
                                }}
                                className={`px-5 py-3 rounded-xl font-semibold text-lg transition-all ${isBatchMode ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50"
                                    }`}
                            >
                                {isBatchMode ? "Cancel" : "Select"}
                            </button>

                            {!isBatchMode && (
                                <button
                                    onClick={onAdd}
                                    className="bg-gradient-to-r from-rose-400 to-orange-400 text-white px-6 py-3 rounded-xl hover:from-rose-500 hover:to-orange-500 flex items-center space-x-2 font-semibold text-lg shadow-lg"
                                >
                                    <Icons.Plus size={24} />
                                    <span>Add</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {pending.map((t) => {
                            const pri = normalizePriority(t.priority);
                            const c = PRIORITY_UI[pri];

                            const isSelected = selectedIds.includes(t.id);

                            return (
                                <div
                                    key={t.id}
                                    onClick={() => isBatchMode && toggleSelection(t.id)}
                                    className={`${c.bg} py-3 px-5 rounded-2xl border-2 ${isBatchMode && isSelected ? "border-stone-800 ring-2 ring-stone-800" : c.border
                                        } flex items-center space-x-4 transition-all cursor-pointer`}
                                >
                                    {isBatchMode ? (
                                        <div
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-stone-800 border-stone-800" : "border-stone-400 bg-white"
                                                }`}
                                        >
                                            {isSelected && <Icons.Check size={18} className="text-white" />}
                                        </div>
                                    ) : (
                                        <PrioritySelector
                                            currentPriority={pri}
                                            onSelect={(p) => changePriority(t.id, p)}
                                            size="large"
                                        />
                                    )}

                                    <span className="flex-1 text-lg text-stone-800 font-medium select-none">{t.text}</span>

                                    {!isBatchMode && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingId(t.id);
                                                }}
                                                className="p-2 hover:bg-white/50 rounded-lg"
                                                title="Edit"
                                            >
                                                <Icons.Edit3 size={20} className="text-stone-600" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDone(t.id);
                                                }}
                                                className="p-2 hover:bg-white/50 rounded-lg"
                                                title="Mark done"
                                            >
                                                <Icons.Check size={20} className="text-green-500" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(t.id);
                                                }}
                                                className="p-2 hover:bg-white/50 rounded-lg"
                                                title="Delete"
                                            >
                                                <Icons.Trash2 size={20} className="text-red-500" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Completed Tasks (Original style: visual-only block) */}
                        {!isBatchMode &&
                            completed.map((t) => {
                                const pri = normalizePriority(t.priority);
                                const c = PRIORITY_UI[pri];

                                return (
                                    <div
                                        key={t.id}
                                        className="bg-stone-100 py-3 px-5 rounded-2xl border-2 border-stone-200 flex items-center space-x-4 opacity-60"
                                    >
                                        <div className={`${c.dot} w-5 h-5 rounded-full`} title={c.label} />
                                        <span className="flex-1 text-lg text-stone-600 line-through font-medium">{t.text}</span>

                                        <button
                                            onClick={() => toggleDone(t.id)}
                                            className="p-2 hover:bg-white/50 rounded-lg"
                                            title="Mark not done"
                                        >
                                            <Icons.X size={20} className="text-stone-500" />
                                        </button>

                                        <button
                                            onClick={() => onDelete(t.id)}
                                            className="p-2 hover:bg-white/50 rounded-lg"
                                            title="Delete"
                                        >
                                            <Icons.Trash2 size={20} className="text-red-500" />
                                        </button>
                                    </div>
                                );
                            })}

                        {tasks.length === 0 && (
                            <div className="text-center py-10 text-stone-400">
                                <p>No tasks yet. Add tasks to your master list.</p>
                            </div>
                        )}
                    </div>

                    {/* BATCH ACTION BAR (floating, original style) */}
                    {isBatchMode && selectedIds.length > 0 && (
                        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-2 border-stone-200 z-50 flex items-center space-x-6">
                            <span className="font-bold text-stone-700">{selectedIds.length} selected</span>
                            <div className="h-8 w-0.5 bg-stone-200" />
                            <div className="flex space-x-2">
                                {PRIORITY_ORDER.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => applyBatchPriority(p)}
                                        className={`w-10 h-10 rounded-full border-2 ${PRIORITY_UI[p].dot} ${PRIORITY_UI[p].border} hover:scale-110 transition-transform`}
                                        title={PRIORITY_UI[p].label}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <EditTaskModal
                    isOpen={!!editingTask}
                    initialText={editingTask ? editingTask.text : ""}
                    onClose={() => setEditingId(null)}
                    onSave={(newText) => {
                        if (!editingTask) return;
                        onUpdate(editingTask.id, { text: newText });
                        setEditingId(null);
                    }}
                />
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.MasterListScreen = MasterListScreen;
})();
