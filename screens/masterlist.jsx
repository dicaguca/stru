(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;
    const { Icons } = Stru;

    const PRIORITY_UI = {
        urgent: { bg: "bg-[#f7d6d1]", border: "border-[#c8402c]", text: "text-[#7a2418]", dot: "bg-[#c8402c]", label: "Urgent" },
        top: { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-700", dot: "bg-rose-400", label: "Top" },
        high: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", dot: "bg-orange-400", label: "High" },
        normal: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", dot: "bg-yellow-400", label: "Normal" },
        low: { bg: "bg-stone-100", border: "border-stone-300", text: "text-stone-600", dot: "bg-stone-400", label: "Low" },
        optional: { bg: "bg-green-100", border: "border-green-400", text: "text-green-700", dot: "bg-green-400", label: "Optional" },
    };

    const PRIORITY_ORDER = ["urgent", "top", "high", "normal", "low", "optional"];
    const normalizePriority = (p) => p || "normal";
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

    const ListMoveSelector = ({ lists, onSelect }) => {
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

        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="p-2 rounded-full hover:bg-stone-100 text-stone-600"
                    title="Move to list"
                >
                    <Icons.ArrowLeft size={20} className="rotate-180" />
                </button>
                {isOpen && (
                    <div className="absolute z-50 bottom-full mb-2 right-0 bg-white rounded-xl shadow-lg border-2 border-stone-200 p-2 min-w-[180px]">
                        {(lists || []).map((list) => (
                            <button
                                key={list.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(list.id);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 rounded-lg hover:bg-stone-50 text-left text-base font-medium text-stone-700 whitespace-nowrap"
                            >
                                {list.name}
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
        modes,
        activeModeId,
        onSwitchMode,
        onAdd,
        onOpenListsManager,
        onOpenSubtasks,
        onUpdate,
        onUpdateSubtask,
        onDeleteSubtask,
        onDelete,
        onDuplicate,
        getSubtaskStats,
    }) => {
        const { useState, useMemo, useEffect, useRef } = React;
        const [isBatchMode, setIsBatchMode] = useState(false);
        const [selectedIds, setSelectedIds] = useState([]);
        const [expandedTaskIds, setExpandedTaskIds] = useState([]);
        const [editingSubtask, setEditingSubtask] = useState(null);
        const [editingSubtaskText, setEditingSubtaskText] = useState("");
        const editingSubtaskInputRef = useRef(null);
        const [editingTextId, setEditingTextId] = useState(null);
        const [editingText, setEditingText] = useState("");
        const editingTextInputRef = useRef(null);

        const sortByPriority = (a, b) => {
            const pa = PRIORITY_ORDER.indexOf(normalizePriority(a.priority));
            const pb = PRIORITY_ORDER.indexOf(normalizePriority(b.priority));
            return pa - pb;
        };

        const vaultListId = useMemo(() => (lists || []).find((list) => list.isVault)?.id, [lists]);

        const getRestoreListId = (task) => {
            const origin = (lists || []).find((list) => list.id === task.archivedFromListId && !list.isVault);
            if (origin) return origin.id;
            const fallback = (lists || []).find((list) => list.modeId === activeModeId && !list.isVault);
            return fallback?.id || Stru.constants.DEFAULT_LIST_ID;
        };

        const sortedLists = useMemo(
            () => (lists || []).slice().sort((a, b) => (a.isVault ? 1 : 0) - (b.isVault ? 1 : 0)),
            [lists]
        );

        const currentTasks = useMemo(
            () => (tasks || []).filter((task) => task.listId === activeListId),
            [tasks, activeListId]
        );

        const totalPending = useMemo(
            () => (tasks || []).filter((task) => task.listId !== vaultListId && !isDoneTask(task)).length,
            [tasks, vaultListId]
        );

        const totalCompleted = useMemo(
            () => (tasks || []).filter((task) => task.listId !== vaultListId && isDoneTask(task)).length,
            [tasks, vaultListId]
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

        useEffect(() => {
            if (!editingSubtaskInputRef.current) return;
            editingSubtaskInputRef.current.focus();
            editingSubtaskInputRef.current.select();
        }, [editingSubtask]);

        useEffect(() => {
            if (!editingTextInputRef.current) return;
            editingTextInputRef.current.focus();
            editingTextInputRef.current.select();
        }, [editingTextId]);

        const toggleSelection = (id) => {
            setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
        };

        const applyBatchPriority = (priority) => {
            selectedIds.forEach((id) => onUpdate(id, { priority }));
            setIsBatchMode(false);
            setSelectedIds([]);
        };

        const applyBatchMove = (listId) => {
            selectedIds.forEach((id) => {
                const task = (tasks || []).find((t) => t.id === id);
                const archivedFromListId = listId === vaultListId ? (task?.listId ?? null) : null;
                onUpdate(id, { listId, archivedFromListId });
            });
            setIsBatchMode(false);
            setSelectedIds([]);
        };

        const applyBatchDelete = () => {
            if (!window.confirm(`Delete ${selectedIds.length} task${selectedIds.length === 1 ? "" : "s"}?`)) return;
            selectedIds.forEach((id) => onDelete(id));
            setIsBatchMode(false);
            setSelectedIds([]);
        };

        const startEditingText = (task) => {
            setEditingTextId(task.id);
            setEditingText(task.text || "");
        };

        const cancelEditingText = () => {
            setEditingTextId(null);
            setEditingText("");
        };

        const saveEditingText = () => {
            if (!editingTextId) return;

            const trimmed = editingText.trim();
            if (!trimmed) {
                cancelEditingText();
                return;
            }

            onUpdate(editingTextId, { text: trimmed });
            cancelEditingText();
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

        const startEditingSubtask = (taskId, subtask) => {
            setEditingSubtask({ taskId, subtaskId: subtask.id });
            setEditingSubtaskText(subtask.text || "");
        };

        const cancelEditingSubtask = () => {
            setEditingSubtask(null);
            setEditingSubtaskText("");
        };

        const saveEditingSubtask = () => {
            if (!editingSubtask) return;

            const trimmed = editingSubtaskText.trim();
            if (!trimmed) {
                cancelEditingSubtask();
                return;
            }

            onUpdateSubtask(editingSubtask.taskId, editingSubtask.subtaskId, {
                text: trimmed,
            });
            cancelEditingSubtask();
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
                "flex-1 text-lg",
                isCompleted ? "line-through text-stone-600" : "text-stone-800",
                priority === "urgent" ? "font-bold" : "font-medium",
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
                                {editingTextId === task.id ? (
                                    <input
                                        ref={editingTextInputRef}
                                        type="text"
                                        value={editingText}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onBlur={saveEditingText}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                saveEditingText();
                                            }
                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                cancelEditingText();
                                            }
                                        }}
                                        className={`${textClass} leading-tight rounded-lg border border-stone-300 bg-white px-2 py-1 -mx-2 outline-none focus:border-stone-400`}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            if (isBatchMode) return;
                                            e.stopPropagation();
                                            startEditingText(task);
                                        }}
                                        className={`${textClass} leading-tight text-left select-none rounded-lg px-2 py-1 -mx-2 hover:bg-white/40`}
                                    >
                                        {task.text}
                                    </button>
                                )}
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
                                        onDuplicate?.(task.id);
                                    }}
                                    className="p-2 hover:bg-white/60 rounded-lg"
                                    title="Duplicate"
                                >
                                    <Icons.Copy size={20} className="text-stone-600" />
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

                                {vaultListId && task.listId !== vaultListId && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdate(task.id, { listId: vaultListId, archivedFromListId: task.listId });
                                        }}
                                        className="p-2 hover:bg-white/60 rounded-lg"
                                        title="Send to Vault"
                                    >
                                        <Icons.Archive size={20} className="text-stone-500" />
                                    </button>
                                )}

                                {vaultListId && task.listId === vaultListId && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const restoredListId = getRestoreListId(task);
                                            onUpdate(task.id, { listId: restoredListId, archivedFromListId: null });
                                        }}
                                        className="p-2 hover:bg-white/60 rounded-lg"
                                        title="Restore from Vault"
                                    >
                                        <Icons.ArchiveRestore size={20} className="text-stone-500" />
                                    </button>
                                )}

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

                    {isExpanded && stats.total > 0 && (
                        <div className="px-5 pb-4">
                            <div className="bg-white/70 rounded-2xl border border-stone-200 p-4 space-y-2">
                                {(task.subtasks || []).map((subtask) => (
                                    <div key={subtask.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-stone-50">
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
                                        {editingSubtask?.taskId === task.id && editingSubtask?.subtaskId === subtask.id ? (
                                            <input
                                                ref={editingSubtaskInputRef}
                                                type="text"
                                                value={editingSubtaskText}
                                                onChange={(e) => setEditingSubtaskText(e.target.value)}
                                                onBlur={saveEditingSubtask}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        saveEditingSubtask();
                                                    }
                                                    if (e.key === "Escape") {
                                                        e.preventDefault();
                                                        cancelEditingSubtask();
                                                    }
                                                }}
                                                className="flex-1 min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none ring-0 focus:border-stone-400"
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingSubtask(task.id, subtask);
                                                }}
                                                className={`flex-1 min-w-0 text-left text-sm rounded-lg px-2 py-1 -mx-2 ${subtask.done || subtask.completed ? "line-through text-stone-400" : "text-stone-700"}`}
                                            >
                                                {subtask.text}
                                            </button>
                                        )}
                                        {editingSubtask?.subtaskId !== subtask.id && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onDeleteSubtask?.(task.id, subtask.id); }}
                                                className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0"
                                                title="Delete subtask"
                                            >
                                                <Icons.Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
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
                        {modes && modes.length > 0 && (
                            <div className="flex items-center gap-2">
                                {modes.map((mode) => {
                                    const isActive = mode.id === activeModeId;
                                    return (
                                        <button
                                            key={mode.id}
                                            onClick={() => onSwitchMode?.(mode.id)}
                                            className={`px-3 py-1 rounded-md whitespace-nowrap font-semibold text-sm transition-all ${isActive
                                                    ? "bg-stone-800/10 text-stone-800"
                                                    : "bg-transparent text-stone-400 hover:bg-stone-800/5 hover:text-stone-600"
                                                }`}
                                        >
                                            {mode.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

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

                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsBatchMode(!isBatchMode);
                                        setSelectedIds([]);
                                    }}
                                    title={isBatchMode ? "Cancel selection" : "Select tasks"}
                                    className={`w-11 h-11 rounded-xl border-2 border-stone-200 flex items-center justify-center transition-all ${isBatchMode ? "bg-stone-800 border-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                                >
                                    {isBatchMode ? <Icons.X size={20} /> : <Icons.CheckSquare size={20} />}
                                </button>
                                <button
                                    onClick={onOpenListsManager}
                                    title="Manage lists"
                                    className="w-11 h-11 rounded-xl bg-white text-stone-700 border-2 border-stone-200 flex items-center justify-center hover:bg-stone-50"
                                >
                                    <Icons.List size={20} />
                                </button>
                                {!isBatchMode && (
                                    <>
                                        <button
                                            onClick={onAdd}
                                            title="Add task"
                                            className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-lg"
                                        >
                                            <Icons.Plus size={20} className="text-white" />
                                        </button>
                                        <button
                                            onClick={() => Stru.router.go("/plan-session")}
                                            title="Plan a session"
                                            className="w-11 h-11 rounded-xl bg-gradient-to-r from-rose-400 to-orange-400 hover:from-rose-500 hover:to-orange-500 flex items-center justify-center shadow-lg"
                                        >
                                            <Icons.Play size={20} className="text-white" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/65 border border-white/70 rounded-[1.35rem] px-6 py-5 shadow-sm mt-2">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                                    {sortedLists.map((list) => {
                                        const hasSelected = (tasks || []).some((task) => task.listId === list.id && (selectedTaskIds || []).includes(task.id));
                                        const isActive = list.id === activeListId;
                                        return (
                                            <button
                                                key={list.id}
                                                onClick={() => setActiveListId(list.id)}
                                                className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-all flex items-center gap-1.5 ${isActive
                                                        ? "bg-stone-800 text-white shadow-md"
                                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                                    }`}
                                            >
                                                {list.isVault && <Icons.Archive size={13} />}
                                                <span>{list.name}</span>
                                                {hasSelected && <span className={`ml-1 inline-block w-2.5 h-2.5 rounded-full ${isActive ? "bg-lime-300" : "bg-lime-500"}`} />}
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
                            <div className="h-8 w-0.5 bg-stone-200" />
                            <div className="flex items-center space-x-2">
                                <ListMoveSelector lists={lists} onSelect={applyBatchMove} />
                                <button
                                    onClick={applyBatchDelete}
                                    className="p-2 rounded-full hover:bg-red-50 text-red-500"
                                    title="Delete selected"
                                >
                                    <Icons.Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    Stru.Screens = Stru.Screens || {};
    Stru.Screens.MasterListScreen = MasterListScreen;
})();
