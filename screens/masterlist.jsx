(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    const PRIORITY_UI = {
        must: { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-700", dot: "bg-rose-400", label: "Priority" },
        should: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", dot: "bg-orange-400", label: "High" },
        could: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", dot: "bg-yellow-400", label: "Medium" },
        nice: { bg: "bg-green-50", border: "border-green-400", text: "text-green-700", dot: "bg-green-400", label: "Optional" },
        "": { bg: "bg-stone-100", border: "border-stone-300", text: "text-stone-600", dot: "bg-stone-400", label: "No Priority" },
    };

    const PRIORITY_ORDER = ["must", "should", "could", "nice", ""];
    const normalizePriority = (p) => (p === "want" ? "nice" : (p || ""));
    const isDoneTask = (task) => !!(task.done || task.completed);

    const PrioritySelector = ({ currentPriority, onSelect }) => {
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

        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={`${PRIORITY_UI[pri].dot} block w-5 h-5 rounded-full shrink-0 hover:ring-2 hover:ring-offset-2 hover:ring-stone-300 transition-all`}
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
                                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-stone-50 text-left"
                            >
                                <div className={`${PRIORITY_UI[p].dot} w-4 h-4 rounded-full`} />
                                <span className="text-base font-medium text-stone-700">{PRIORITY_UI[p].label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const MasterListScreen = ({
        tasks,
        lists,
        activeListId,
        setActiveListId,
        selectedTaskIds,
        onAdd,
        onCreateList,
        onOpenSubtasks,
        onUpdate,
        onUpdateSubtask,
        onDelete,
        getSubtaskStats,
    }) => {
        const { useState, useMemo } = React;
        const [isBatchMode, setIsBatchMode] = useState(false);
        const [selectedIds, setSelectedIds] = useState([]);
        const [editingId, setEditingId] = useState(null);
        const [expandedTaskIds, setExpandedTaskIds] = useState([]);

        const sortByPriority = (a, b) => {
            const pa = PRIORITY_ORDER.indexOf(normalizePriority(a.priority));
            const pb = PRIORITY_ORDER.indexOf(normalizePriority(b.priority));
            return pa - pb;
        };

        const currentTasks = useMemo(
            () => (tasks || []).filter((task) => task.listId === activeListId),
            [tasks, activeListId]
        );

        const totalPending = useMemo(
            () => (tasks || []).filter((task) => !isDoneTask(task)).length,
            [tasks]
        );

        const totalCompleted = useMemo(
            () => (tasks || []).filter((task) => isDoneTask(task)).length,
            [tasks]
        );

        const pending = useMemo(
            () => currentTasks.filter((task) => !isDoneTask(task)).slice().sort(sortByPriority),
            [currentTasks]
        );

        const completed = useMemo(
            () => currentTasks.filter((task) => isDoneTask(task)).slice().sort(sortByPriority),
            [currentTasks]
        );

        const currentPendingCount = pending.length;
        const currentCompletedCount = completed.length;

        const editingTask = useMemo(
            () => currentTasks.find((task) => task.id === editingId) || null,
            [currentTasks, editingId]
        );

        const toggleSelection = (id) => {
            setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
        };

        const applyBatchPriority = (priority) => {
            selectedIds.forEach((id) => onUpdate(id, { priority }));
            setIsBatchMode(false);
            setSelectedIds([]);
        };

        const toggleDone = (id) => {
            const task = currentTasks.find((item) => item.id === id);
            if (!task) return;
            const nextDone = !isDoneTask(task);
            onUpdate(id, { done: nextDone, completed: nextDone });
        };

        const toggleExpanded = (id) => {
            setExpandedTaskIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
        };

        const renderTaskRow = (task, isCompleted) => {
            const priority = normalizePriority(task.priority);
            const styles = PRIORITY_UI[priority];
            const stats = getSubtaskStats(task);
            const isExpanded = expandedTaskIds.includes(task.id);
            const rowBaseClass = isCompleted
                ? "bg-stone-100 border-stone-200 opacity-60"
                : `${styles.bg} ${styles.border}`;
            const textClass = [
                "flex-1 text-lg select-none",
                isCompleted ? "line-through text-stone-600" : "text-stone-800",
                priority === "must" ? "font-semibold" : "font-medium",
            ].join(" ");

            return (
                <div key={task.id} className={`rounded-2xl border-2 transition-all ${rowBaseClass}`}>
                    <div
                        onClick={() => isBatchMode && toggleSelection(task.id)}
                        className={`py-2.5 px-5 flex items-center gap-4 ${isBatchMode && selectedIds.includes(task.id) ? "ring-2 ring-stone-800 border-stone-800" : ""}`}
                    >
                        {isBatchMode ? (
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(task.id) ? "bg-stone-800 border-stone-800" : "border-stone-400 bg-white"}`}>
                                {selectedIds.includes(task.id) && <Icons.Check size={18} className="text-white" />}
                            </div>
                        ) : (
                            <div className="flex items-center self-center shrink-0">
                                <PrioritySelector currentPriority={priority} onSelect={(next) => onUpdate(task.id, { priority: next })} />
                            </div>
                        )}

                        <div className="flex-1 min-w-0 flex items-center">
                            <div className="flex items-center gap-3 min-w-0 w-full">
                                <span className={`${textClass} leading-tight`}>{task.text}</span>
                                {stats.total > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpanded(task.id);
                                        }}
                                        className="px-3 py-1 rounded-full bg-white/70 text-stone-600 text-xs font-bold border border-stone-200"
                                    >
                                        {stats.completed}/{stats.total} subtasks
                                    </button>
                                )}
                            </div>
                        </div>

                        {!isBatchMode && (
                            <div className="flex items-center gap-1 self-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingId(task.id);
                                    }}
                                    className="p-2 hover:bg-white/60 rounded-lg"
                                    title="Edit"
                                >
                                    <Icons.Edit3 size={20} className="text-stone-600" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenSubtasks?.(task);
                                    }}
                                    className="p-2 hover:bg-white/60 rounded-lg"
                                    title="Add subtasks"
                                >
                                    <Icons.Plus size={18} className="text-lime-700" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDone(task.id);
                                    }}
                                    className="p-2 hover:bg-white/60 rounded-lg"
                                    title={isCompleted ? "Mark not done" : "Mark done"}
                                >
                                    {isCompleted
                                        ? <Icons.X size={20} className="text-stone-500" />
                                        : <Icons.Check size={20} className="text-green-500" />}
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(task.id);
                                    }}
                                    className="p-2 hover:bg-white/60 rounded-lg"
                                    title="Delete"
                                >
                                    <Icons.Trash2 size={20} className="text-red-500" />
                                </button>
                            </div>
                        )}
                    </div>

                    {isExpanded && (
                        <div className="px-5 pb-4">
                            <div className="bg-white/70 rounded-2xl border border-stone-200 p-4 space-y-2">
                                {(task.subtasks || []).map((subtask) => (
                                    <label key={subtask.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-stone-50">
                                        <input
                                            type="checkbox"
                                            checked={!!(subtask.done || subtask.completed)}
                                            onChange={(e) => {
                                                onUpdateSubtask(task.id, subtask.id, {
                                                    done: e.target.checked,
                                                    completed: e.target.checked,
                                                });
                                            }}
                                            className="w-4 h-4 rounded border-stone-300"
                                        />
                                        <span className={`text-sm ${subtask.done || subtask.completed ? "line-through text-stone-400" : "text-stone-700"}`}>
                                            {subtask.text}
                                        </span>
                                    </label>
                                ))}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenSubtasks?.(task);
                                    }}
                                    className="mt-2 text-sm font-bold text-lime-700 bg-lime-50 px-3 py-2 rounded-xl border border-lime-200"
                                >
                                    + Add Subtasks
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-rose-100 p-8 pb-32">
                <div className="max-w-[56rem] mx-auto">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center">
                            <button
                                onClick={() => Stru.router.go("/home")}
                                className="mr-4 p-3 hover:bg-white rounded-xl"
                                title="Back"
                            >
                                <Icons.ArrowLeft className="text-stone-600" size={28} />
                            </button>

                            <div>
                                <h2 className="text-4xl font-semibold text-stone-800">Master Task List</h2>
                                <p className="text-stone-600 mt-1 text-lg font-medium">
                                    Pending: {totalPending} &bull; Completed: {totalCompleted}
                                </p>
                            </div>

                            <div className="ml-auto flex space-x-2">
                                <button
                                    onClick={() => {
                                        setIsBatchMode(!isBatchMode);
                                        setSelectedIds([]);
                                    }}
                                    className={`px-5 py-3 rounded-xl border-2 border-stone-200 font-semibold text-lg transition-all ${isBatchMode ? "bg-stone-800 border-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                                >
                                    {isBatchMode ? "Cancel" : "Select"}
                                </button>
                                <button
                                    onClick={onCreateList}
                                    className="bg-white text-stone-700 px-5 py-3 rounded-xl border-2 border-stone-200 font-semibold text-lg"
                                >
                                    + List
                                </button>
                                {!isBatchMode && (
                                    <button
                                        onClick={onAdd}
                                        className="bg-gradient-to-r from-rose-400 to-orange-400 text-white px-6 py-3 rounded-xl flex items-center space-x-2 font-semibold text-lg shadow-lg"
                                    >
                                        <Icons.Plus size={24} />
                                        <span>Add</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/65 border border-white/70 rounded-[1.35rem] px-6 py-5 shadow-sm mt-2">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                                    {(lists || []).map((list) => {
                                        const hasSelected = (tasks || []).some((task) => task.listId === list.id && (selectedTaskIds || []).includes(task.id));
                                        const isActive = list.id === activeListId;
                                        return (
                                            <button
                                                key={list.id}
                                                onClick={() => setActiveListId(list.id)}
                                                className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-all ${isActive
                                                        ? "bg-stone-800 text-white shadow-md"
                                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                                    }`}
                                            >
                                                <span>{list.name}</span>
                                                {hasSelected && <span className={`ml-2 inline-block w-2.5 h-2.5 rounded-full ${isActive ? "bg-lime-300" : "bg-lime-500"}`} />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="md:text-right">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Current List</div>
                                    <div className="text-base font-semibold text-stone-700 mt-1">
                                        Pending: {currentPendingCount} &bull; Completed: {currentCompletedCount}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {pending.map((task) => renderTaskRow(task, false))}
                        {completed.map((task) => renderTaskRow(task, true))}

                        {currentTasks.length === 0 && (
                            <div className="text-center py-16 text-stone-400 bg-white rounded-3xl border-2 border-stone-200">
                                <p className="text-lg">No tasks in this list yet.</p>
                                <p className="mt-2">Add tasks or create another list to get started.</p>
                            </div>
                        )}
                    </div>

                    {isBatchMode && selectedIds.length > 0 && (
                        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-2xl border-2 border-stone-200 z-50 flex items-center space-x-6">
                            <span className="font-bold text-stone-700">{selectedIds.length} selected</span>
                            <div className="h-8 w-0.5 bg-stone-200" />
                            <div className="flex space-x-2">
                                {PRIORITY_ORDER.map((priority) => (
                                    <button
                                        key={priority}
                                        onClick={() => applyBatchPriority(priority)}
                                        className={`w-10 h-10 rounded-full border-2 ${PRIORITY_UI[priority].dot} ${PRIORITY_UI[priority].border} hover:scale-110 transition-transform`}
                                        title={PRIORITY_UI[priority].label}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Stru.Modals.EditTaskModal
                    isOpen={!!editingTask}
                    task={editingTask}
                    onClose={() => setEditingId(null)}
                    onSave={(updates) => {
                        if (!editingTask) return;
                        onUpdate(editingTask.id, updates);
                        setEditingId(null);
                    }}
                />
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.MasterListScreen = MasterListScreen;
})();
