(() => {
    window.Stru = window.Stru || {};
    const Stru = window.Stru;

    const { useState, useEffect, useRef } = React;
    const { Icons } = Stru;

    const ModalShell = ({ isOpen, children, maxWidth = "max-w-xl" }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className={`bg-white rounded-2xl p-8 w-full ${maxWidth}`}>{children}</div>
            </div>
        );
    };

    const AddTaskModal = ({ isOpen, onClose, onAdd, listName }) => {
        const [newTaskPriority, setNewTaskPriority] = useState("");
        const [bulkTaskText, setBulkTaskText] = useState("");

        useEffect(() => {
            if (!isOpen) {
                setBulkTaskText("");
                setNewTaskPriority("");
            }
        }, [isOpen]);

        const addBulkTasks = () => {
            const lines = (bulkTaskText || "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

            if (lines.length === 0) return;

            lines.forEach((text) => onAdd({ text, priority: newTaskPriority }));
            setBulkTaskText("");
            setNewTaskPriority("");
            onClose();
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-xl">
                    <h3 className="text-2xl font-bold text-stone-800 mb-2">Add Tasks</h3>
                    <p className="text-stone-500 mb-6">New tasks will be added to {listName || "this list"}.</p>

                    <div className="mb-6">
                        <label className="block text-lg font-semibold mb-3 text-stone-700">Priority Level</label>
                        <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none text-base"
                        >
                            <option value="">No Priority</option>
                            <option value="must">Priority (Rose)</option>
                            <option value="should">High (Orange)</option>
                            <option value="could">Medium (Yellow)</option>
                            <option value="nice">Optional (Green)</option>
                        </select>
                    </div>

                    <div className="mb-8">
                        <label className="block text-lg font-semibold mb-3 text-stone-700">Enter Tasks (one per line)</label>
                        <textarea
                            autoFocus
                            value={bulkTaskText}
                            onChange={(e) => setBulkTaskText(e.target.value)}
                            placeholder={"Task 1\nTask 2\nTask 3"}
                            rows={10}
                            className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none resize-none text-base"
                        />
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={addBulkTasks}
                            disabled={!bulkTaskText.trim()}
                            className="flex-1 bg-gradient-to-r from-rose-400 to-orange-400 text-white p-4 rounded-xl font-semibold text-lg disabled:bg-stone-300 disabled:from-stone-300 disabled:to-stone-300"
                        >
                            Add Tasks
                        </button>

                        <button
                            onClick={() => {
                                setBulkTaskText("");
                                onClose();
                            }}
                            className="flex-1 bg-stone-200 text-stone-700 p-4 rounded-xl font-semibold text-lg"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const CreateListModal = ({ isOpen, onClose, onCreate }) => {
        const [name, setName] = useState("");

        useEffect(() => {
            if (!isOpen) setName("");
        }, [isOpen]);

        if (!isOpen) return null;

        return (
            <ModalShell isOpen={isOpen} maxWidth="max-w-md">
                <h3 className="text-2xl font-bold text-stone-800 mb-3">Create New List</h3>
                <p className="text-stone-500 mb-6">Add another task list and switch between it with tabs.</p>

                <div className="mb-8">
                    <label className="block text-lg font-semibold mb-3 text-stone-700">List Name</label>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none text-base"
                        placeholder="e.g. Writing"
                    />
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            const trimmed = name.trim();
                            if (!trimmed) return;
                            onCreate?.(trimmed);
                            onClose?.();
                        }}
                        className="flex-1 bg-gradient-to-r from-rose-400 to-orange-400 text-white p-4 rounded-xl font-semibold text-lg"
                    >
                        Create List
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-stone-200 text-stone-700 p-4 rounded-xl font-semibold text-lg"
                    >
                        Cancel
                    </button>
                </div>
            </ModalShell>
        );
    };

    const ListsManagerModal = ({
        isOpen,
        onClose,
        lists = [],
        defaultListId,
        onCreate,
        onRename,
        onDelete,
    }) => {
        const [newListName, setNewListName] = useState("");
        const [editingId, setEditingId] = useState(null);
        const [editingName, setEditingName] = useState("");

        useEffect(() => {
            if (!isOpen) {
                setNewListName("");
                setEditingId(null);
                setEditingName("");
            }
        }, [isOpen]);

        if (!isOpen) return null;

        return (
            <ModalShell isOpen={isOpen} maxWidth="max-w-2xl">
                <h3 className="text-2xl font-bold text-stone-800 mb-3">Lists</h3>
                <p className="text-stone-500 mb-6">Create, rename, or delete task lists. Tasks from deleted lists move to Main List.</p>

                <div className="mb-8">
                    <label className="block text-lg font-semibold mb-3 text-stone-700">Create New List</label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="flex-1 p-4 border-2 border-stone-200 rounded-xl outline-none text-base"
                            placeholder="e.g. Writing"
                        />
                        <button
                            onClick={() => {
                                const trimmed = newListName.trim();
                                if (!trimmed) return;
                                onCreate?.(trimmed);
                                setNewListName("");
                            }}
                            className="bg-gradient-to-r from-rose-400 to-orange-400 text-white px-5 rounded-xl font-semibold"
                        >
                            Add List
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    {(lists || []).map((list) => {
                        const isDefault = list.id === defaultListId;
                        const isEditing = editingId === list.id;

                        return (
                            <div key={list.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="w-full p-3 border-2 border-stone-200 rounded-xl outline-none text-base"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-semibold text-stone-800">{list.name}</span>
                                                {isDefault && (
                                                    <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-600 text-xs font-bold">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const trimmed = editingName.trim();
                                                    if (!trimmed) return;
                                                    onRename?.(list.id, trimmed);
                                                    setEditingId(null);
                                                    setEditingName("");
                                                }}
                                                className="bg-lime-500 text-white px-4 py-2 rounded-xl font-semibold"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditingName("");
                                                }}
                                                className="bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-semibold"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingId(list.id);
                                                    setEditingName(list.name);
                                                }}
                                                className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl font-semibold"
                                            >
                                                Rename
                                            </button>
                                            {!isDefault && (
                                                <button
                                                    onClick={() => onDelete?.(list.id)}
                                                    className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl font-semibold"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-stone-700 text-white px-6 py-4 rounded-xl hover:bg-stone-800 transition-colors font-semibold text-lg"
                >
                    Done
                </button>
            </ModalShell>
        );
    };

    const AddSubtasksModal = ({ isOpen, onClose, onAdd, task }) => {
        const [bulkSubtaskText, setBulkSubtaskText] = useState("");

        useEffect(() => {
            if (!isOpen) setBulkSubtaskText("");
        }, [isOpen]);

        if (!isOpen) return null;

        return (
            <ModalShell isOpen={isOpen}>
                <h3 className="text-2xl font-bold text-stone-800 mb-2">Add Subtasks</h3>
                <p className="text-stone-500 mb-6">Adding subtasks to “{task?.text || "task"}”. Enter one subtask per line.</p>

                <textarea
                    autoFocus
                    value={bulkSubtaskText}
                    onChange={(e) => setBulkSubtaskText(e.target.value)}
                    placeholder={"Step 1\nStep 2\nStep 3"}
                    rows={10}
                    className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none resize-none text-base mb-8"
                />

                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            const lines = bulkSubtaskText.split("\n");
                            onAdd?.(lines);
                        }}
                        disabled={!bulkSubtaskText.trim()}
                        className="flex-1 bg-gradient-to-r from-lime-400 to-green-500 text-white p-4 rounded-xl font-semibold text-lg disabled:bg-stone-300 disabled:from-stone-300 disabled:to-stone-300"
                    >
                        Add Subtasks
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-stone-200 text-stone-700 p-4 rounded-xl font-semibold text-lg"
                    >
                        Cancel
                    </button>
                </div>
            </ModalShell>
        );
    };

    const EditTaskModal = ({ isOpen, onClose, task, onSave }) => {
        const [text, setText] = useState(task?.text || "");
        const [priority, setPriority] = useState(task?.priority || "");

        useEffect(() => {
            setText(task?.text || "");
            setPriority(task?.priority || "");
        }, [task]);

        if (!isOpen) return null;

        return (
            <ModalShell isOpen={isOpen}>
                <h3 className="text-2xl font-bold text-stone-800 mb-6">Edit Task</h3>

                <div className="mb-6">
                    <label className="block text-lg font-semibold mb-3 text-stone-700">Task Text</label>
                    <input
                        autoFocus
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none text-base"
                    />
                </div>

                <div className="mb-8">
                    <label className="block text-lg font-semibold mb-3 text-stone-700">Priority Level</label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full p-4 border-2 border-stone-200 rounded-xl outline-none text-base"
                    >
                        <option value="">No Priority</option>
                        <option value="must">Priority (Rose)</option>
                        <option value="should">High (Orange)</option>
                        <option value="could">Medium (Yellow)</option>
                        <option value="nice">Optional (Green)</option>
                    </select>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={() => {
                            const trimmed = (text || "").trim();
                            if (!trimmed) return;
                            onSave?.({ ...task, text: trimmed, priority });
                            onClose?.();
                        }}
                        className="flex-1 bg-gradient-to-r from-lime-400 to-green-500 text-white p-4 rounded-xl font-semibold text-lg"
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-stone-200 text-stone-700 p-4 rounded-xl font-semibold text-lg"
                    >
                        Cancel
                    </button>
                </div>
            </ModalShell>
        );
    };

    const SettingsModal = ({ isOpen, onClose, onResetDay, onExport, onImport }) => {
        const [showResetConfirm, setShowResetConfirm] = useState(false);
        const fileInputRef = useRef(null);

        if (!isOpen) return null;

        const defaultExport = () => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                data[k] = localStorage.getItem(k);
            }

            const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), storage: data }, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `stru-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };

        const defaultImport = async (file) => {
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const storage = parsed?.storage;
                if (!storage || typeof storage !== "object") return;

                Object.keys(storage).forEach((k) => {
                    const v = storage[k];
                    if (v === null || v === undefined) localStorage.removeItem(k);
                    else localStorage.setItem(k, v);
                });

                window.location.reload();
            } catch {
            }
        };

        const handleFileChange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            (onImport || defaultImport)(file);
            onClose?.();
        };

        const defaultResetDay = (clearType) => {
            if (clearType === "tasks") {
                localStorage.setItem("stru-tasks", JSON.stringify([]));
            } else if (clearType === "everything") {
                [
                    "stru-tasks",
                    "stru-sessions",
                    "stru-breaks",
                    "stru-workevents",
                    "stru-history",
                    "stru-lists",
                ].forEach((key) => localStorage.removeItem(key));
            }
            window.location.reload();
        };

        const handleReset = (clearType) => {
            (onResetDay || defaultResetDay)(clearType);
            setShowResetConfirm(false);
            onClose?.();
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-xl">
                    <h3 className="text-2xl font-bold text-stone-800 mb-6">Settings</h3>

                    <div className="mb-8 border-b-2 border-stone-100 pb-8">
                        <h4 className="text-xl font-bold text-stone-800 mb-4">Backup Data</h4>

                        <div className="flex space-x-4">
                            <button
                                onClick={onExport || defaultExport}
                                className="flex-1 bg-stone-100 text-stone-700 border-2 border-stone-300 p-4 rounded-xl font-semibold hover:bg-stone-200"
                            >
                                Export Backup
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 bg-stone-100 text-stone-700 border-2 border-stone-300 p-4 rounded-xl font-semibold hover:bg-stone-200"
                            >
                                Import Backup
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".json,application/json"
                            />
                        </div>
                    </div>

                    <div className="mb-8">
                        <h4 className="text-xl font-bold text-stone-800 mb-4">Daily Reset</h4>

                        {!showResetConfirm ? (
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="w-full bg-orange-50 border-2 border-orange-300 text-orange-700 px-6 py-4 rounded-xl hover:bg-orange-100 transition-colors font-semibold text-lg"
                            >
                                Start New Day
                            </button>
                        ) : (
                            <div className="bg-orange-50 border-2 border-orange-300 p-6 rounded-xl space-y-3">
                                <button
                                    onClick={() => handleReset("tasks")}
                                    className="w-full bg-white border-2 border-stone-300 text-stone-800 px-5 py-3 rounded-xl font-medium text-left"
                                >
                                    <div>Clear Tasks Only</div>
                                    <div className="text-sm text-stone-600">Removes tasks, keeps history and lists</div>
                                </button>

                                <button
                                    onClick={() => handleReset("everything")}
                                    className="w-full bg-white border-2 border-red-300 text-red-700 px-5 py-3 rounded-xl font-medium text-left"
                                >
                                    <div>Clear Everything</div>
                                    <div className="text-sm text-red-600">Removes tasks, history, and custom lists</div>
                                </button>

                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="w-full bg-stone-200 text-stone-700 px-5 py-3 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-stone-700 text-white px-6 py-4 rounded-xl hover:bg-stone-800 transition-colors font-semibold text-lg"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    };

    const BreakReminderModal = ({ isOpen, onTakeBreak, onSkip }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center">
                    <Icons.Coffee size={64} className="mx-auto mb-4 text-orange-400" />
                    <h3 className="text-2xl font-bold text-stone-800 mb-2">Time for a Break?</h3>
                    <p className="text-lg text-stone-600 mb-6">You&apos;ve completed a session. Taking breaks helps maintain focus.</p>

                    <div className="flex space-x-4">
                        <button
                            onClick={onTakeBreak}
                            className="flex-1 bg-gradient-to-r from-orange-400 to-rose-400 text-white px-6 py-4 rounded-xl hover:from-orange-500 hover:to-rose-500 font-semibold text-lg"
                        >
                            Take a Break
                        </button>
                        <button
                            onClick={onSkip}
                            className="flex-1 bg-stone-200 text-stone-700 px-6 py-4 rounded-xl hover:bg-stone-300 font-semibold text-lg"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const StartDayModal = ({ isOpen, onStart, onClose }) => {
        if (!isOpen) return null;

        const handle = onStart || onClose;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-2xl transform transition-all">
                    <div className="mx-auto bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <Icons.Sun size={48} className="text-orange-500" />
                    </div>

                    <h3 className="text-3xl font-bold text-stone-800 mb-2">Starting Workday</h3>
                    <p className="text-2xl font-medium text-orange-500 mb-4">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-lg text-stone-600 mb-8">Let&apos;s make today productive. You got this!</p>

                    <button
                        onClick={handle}
                        className="w-full bg-gradient-to-r from-orange-400 to-rose-400 text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:opacity-90"
                    >
                        Let&apos;s Go
                    </button>
                </div>
            </div>
        );
    };

    const EndDayModal = ({ isOpen, onEnd, onClose }) => {
        if (!isOpen) return null;

        const handle = onEnd || onClose;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-2xl transform transition-all">
                    <div className="mx-auto bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <Icons.Moon size={48} className="text-indigo-900" />
                    </div>

                    <h3 className="text-3xl font-bold text-stone-800 mb-2">Workday Closed</h3>
                    <p className="text-2xl font-medium text-indigo-900 mb-4">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-lg text-stone-600 mb-8">Great job today. Time to disconnect and recharge.</p>

                    <button
                        onClick={handle}
                        className="w-full bg-gradient-to-r from-indigo-900 via-purple-800 to-purple-900 text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:opacity-90"
                    >
                        Goodnight
                    </button>
                </div>
            </div>
        );
    };

    const BreakSwitchModal = ({ isOpen, onClose, onConfirm, onEndDay }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg border-4 border-indigo-900 shadow-2xl text-center">
                    <div className="flex justify-center mb-4">
                        <Icons.Moon size={56} className="text-indigo-900" />
                    </div>
                    <h3 className="text-3xl font-bold text-indigo-900 mb-4">Past Break Switch</h3>
                    <p className="text-lg text-stone-600 mb-8">It is past 10 PM. To maintain your rhythm, it is recommended to stop for today.</p>

                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={onEndDay}
                            className="w-full bg-indigo-900 text-white p-4 rounded-xl font-bold text-xl hover:bg-indigo-800 shadow-lg"
                        >
                            End Workday
                        </button>
                        <button
                            onClick={onConfirm}
                            className="w-full bg-stone-200 text-stone-700 p-4 rounded-xl font-bold text-lg hover:bg-stone-300"
                        >
                            Override &amp; Start Session
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-6 text-stone-400 font-medium hover:text-stone-600 underline"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    const ExtensionModal = ({ isOpen, onClose, onConfirm, title, themeColor = "orange" }) => {
        const [customAmount, setCustomAmount] = useState("");

        if (!isOpen) return null;

        const themeClasses = {
            orange: {
                btn: "bg-orange-100 text-orange-700 border-orange-300",
                confirm: "from-orange-400 to-rose-400",
            },
            green: {
                btn: "bg-lime-100 text-lime-700 border-lime-300",
                confirm: "from-lime-400 to-green-500",
            },
        };

        const theme = themeClasses[themeColor] || themeClasses.orange;

        const handleConfirm = (amount) => {
            onConfirm?.(amount);
            setCustomAmount("");
            onClose?.();
        };

        const presets = [5, 10, 15, 20, 30, 60];

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
                    <h3 className="text-2xl font-bold text-stone-800 mb-6">{title}</h3>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {presets.map((m) => (
                            <button
                                key={m}
                                onClick={() => handleConfirm(m)}
                                className={`p-3 rounded-xl border-2 font-semibold ${theme.btn} hover:opacity-90`}
                            >
                                +{m}m
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2 mb-6">
                        <input
                            type="number"
                            placeholder="Custom"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="flex-1 p-3 border-2 border-stone-200 rounded-xl outline-none font-bold text-center"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && customAmount) handleConfirm(parseInt(customAmount, 10));
                            }}
                        />
                        <span className="font-bold text-stone-500">min</span>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => {
                                if (customAmount) handleConfirm(parseInt(customAmount, 10));
                            }}
                            disabled={!customAmount}
                            className={`flex-1 bg-gradient-to-r text-white p-3 rounded-xl font-bold ${theme.confirm} disabled:opacity-50`}
                        >
                            Extend
                        </button>
                        <button
                            onClick={() => {
                                setCustomAmount("");
                                onClose?.();
                            }}
                            className="flex-1 bg-stone-200 text-stone-700 p-3 rounded-xl font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const CongratsModal = ({ isOpen, message, onEndSession, onAddMoreTasks, onClose }) => {
        if (!isOpen) return null;

        const fallback = "You finished everything you planned for this session. Solid work.";

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
                    <h3 className="text-3xl font-bold text-stone-800 mb-3">Session complete</h3>
                    <p className="text-stone-600 text-lg mb-8">{message || fallback}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => onEndSession?.()}
                            className="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white p-4 rounded-xl font-bold text-lg"
                        >
                            End Session
                        </button>

                        <button
                            onClick={() => onAddMoreTasks?.()}
                            className="w-full bg-white border-2 border-stone-200 text-stone-700 p-4 rounded-xl font-bold text-lg"
                        >
                            Add More Tasks
                        </button>

                        <button
                            onClick={() => onClose?.()}
                            className="w-full text-stone-400 font-semibold pt-1"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    Stru.Modals = {
        ModalShell,
        AddTaskModal,
        CreateListModal,
        ListsManagerModal,
        AddSubtasksModal,
        EditTaskModal,
        SettingsModal,
        BreakReminderModal,
        StartDayModal,
        EndDayModal,
        BreakSwitchModal,
        ExtensionModal,
        CongratsModal,
    };
})();
