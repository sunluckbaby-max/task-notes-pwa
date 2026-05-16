/**
 * Cute Cat Cartoon Theme - Mobile Task Notes PWA
 * - Soft peach, cream, rose, and lavender palette
 * - Cat mascot header, paw-like chips, rounded note cards
 * - Keeps task create, edit, delete, complete, filters, tags, localStorage
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Calendar, CheckCircle2, Circle, Clock, Eye, EyeOff, Folder, Lock, PawPrint, Pencil, Plus, Search, Sparkles, Tag, Trash2, X } from "lucide-react";
import { getTasks, addTask, updateTask, deleteTask, getCategories } from "@/lib/storage";
import type { Task } from "@/lib/storage";
import { formatDate, isToday, isOverdue } from "@/lib/utils";

type FilterType = "all" | "today" | "upcoming" | "completed" | "overdue";
type AppTab = "tasks" | "notes";
type NoteCategory = "tech" | "career" | "life" | "other";

const emptyFormData = {
  title: "",
  description: "",
  category: "work",
  tags: "",
  dueDate: "",
  reminderTime: "",
};

const emptyNoteForm = {
  title: "",
  body: "",
  category: "tech" as NoteCategory,
  photo: "",
};

const DEFAULT_SPACE_CODE = "CAT-TASKS";
const SPACE_CODE_KEY = "cat_task_space_code";
const SPACE_AUTH_KEY = "cat_task_space_auth";
const MIGRATED_SPACE_KEY_PREFIX = "cat_task_migrated_";
const LOCAL_NOTES_KEY_PREFIX = "cat_notes_";
const PENDING_NOTES_KEY_PREFIX = "cat_notes_pending_";

const noteCategories: Array<{ id: NoteCategory; name: string; color: string; tint: string }> = [
  { id: "tech", name: "科技", color: "#38BDF8", tint: "bg-sky-100 text-sky-500" },
  { id: "career", name: "职业", color: "#8B5CF6", tint: "bg-violet-100 text-violet-500" },
  { id: "life", name: "生活", color: "#FB7185", tint: "bg-rose-100 text-rose-500" },
  { id: "other", name: "其他", color: "#F59E0B", tint: "bg-amber-100 text-amber-600" },
];

const filterLabels: Record<FilterType, string> = {
  all: "全部",
  today: "今天",
  upcoming: "即将",
  overdue: "逾期",
  completed: "完成",
};

const normalizeCategoryId = (categoryId: string) => (categoryId === "shopping" ? "personal" : categoryId);

const normalizeCategories = (categories: ReturnType<typeof getCategories>) =>
  categories
    .filter((category) => category.id !== "shopping")
    .map((category) => (category.id === "personal" ? { ...category, name: "生活" } : category));

const getTaskDueTime = (task: Task) => {
  if (!task.dueDate) return Number.POSITIVE_INFINITY;
  const time = task.reminderTime || "23:59";
  return new Date(`${task.dueDate}T${time}`).getTime();
};

const formatDueTime = (time?: string) => (time ? time.slice(0, 5) : "");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const canSync = Boolean(supabaseUrl && supabaseAnonKey);

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[] | null;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type TaskSpaceRow = {
  id: string;
  code: string;
  password_hash: string;
};

type CatNote = {
  id: string;
  title: string;
  body: string;
  category: NoteCategory;
  photo: string;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  title: string;
  body: string | null;
  category: NoteCategory | null;
  photo: string | null;
  created_at: string;
  updated_at: string;
};

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  category: normalizeCategoryId(row.category || "work"),
  tags: row.tags || [],
  dueDate: row.due_date || "",
  reminderTime: row.due_time || "",
  completed: row.completed,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toNote = (row: NoteRow): CatNote => ({
  id: row.id,
  title: row.title,
  body: row.body || "",
  category: (row.category || "other") as NoteCategory,
  photo: row.photo || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getLocalNotesKey = (spaceCode: string) => `${LOCAL_NOTES_KEY_PREFIX}${spaceCode}`;

const getLocalNotes = (spaceCode: string): CatNote[] => {
  try {
    const saved = localStorage.getItem(getLocalNotesKey(spaceCode));
    if (!saved) return [];
    return JSON.parse(saved) as CatNote[];
  } catch {
    return [];
  }
};

const saveLocalNotes = (spaceCode: string, notes: CatNote[]) => {
  localStorage.setItem(getLocalNotesKey(spaceCode), JSON.stringify(notes));
};

const getPendingNotesKey = (spaceCode: string) => `${PENDING_NOTES_KEY_PREFIX}${spaceCode}`;

const getPendingNotes = (spaceCode: string): CatNote[] => {
  try {
    const saved = localStorage.getItem(getPendingNotesKey(spaceCode));
    if (!saved) return [];
    return JSON.parse(saved) as CatNote[];
  } catch {
    return [];
  }
};

const savePendingNotes = (spaceCode: string, notes: CatNote[]) => {
  localStorage.setItem(getPendingNotesKey(spaceCode), JSON.stringify(notes));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const trySaveLocalNotes = (spaceCode: string, notes: CatNote[]) => {
  try {
    saveLocalNotes(spaceCode, notes);
    return true;
  } catch {
    return false;
  }
};

const remoteRequest = async (path: string, options: RequestInit = {}) => {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase is not configured");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
};

const hashPassword = async (code: string, password: string) => {
  const input = `${code.trim()}::${password}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const loadSavedSpaceAuth = () => {
  try {
    const saved = localStorage.getItem(SPACE_AUTH_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { code?: string; passwordHash?: string };
    if (!parsed.code || !parsed.passwordHash) return null;
    return parsed;
  } catch {
    return null;
  }
};

export default function Home() {
  const savedAuth = loadSavedSpaceAuth();
  const [activeTab, setActiveTab] = useState<AppTab>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<CatNote[]>([]);
  const [categories] = useState(() => normalizeCategories(getCategories()));
  const allTags = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [tasks]
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<NoteCategory | "all">("all");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailDraft, setDetailDraft] = useState({ title: "", description: "" });
  const [noteDetailEditing, setNoteDetailEditing] = useState(false);
  const [noteDetailDraft, setNoteDetailDraft] = useState(emptyNoteForm);
  const [formData, setFormData] = useState(emptyFormData);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [spaceCode, setSpaceCode] = useState(() => savedAuth?.code || localStorage.getItem(SPACE_CODE_KEY) || DEFAULT_SPACE_CODE);
  const [spaceDraft, setSpaceDraft] = useState(() => savedAuth?.code || localStorage.getItem(SPACE_CODE_KEY) || DEFAULT_SPACE_CODE);
  const [spacePassword, setSpacePassword] = useState("");
  const [showSpacePassword, setShowSpacePassword] = useState(false);
  const [spaceUnlocked, setSpaceUnlocked] = useState(!canSync || Boolean(savedAuth));
  const [syncMessage, setSyncMessage] = useState(canSync ? "云端同步已开启" : "本地模式：请检查 Vercel 环境变量");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const headerTimeText = useMemo(() => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const hours = currentTime.getHours();
    const greeting = hours < 12 ? "Good Morning" : hours < 18 ? "Good Afternoon" : "Good Evening";
    return `${weekdays[currentTime.getDay()]} · ${months[currentTime.getMonth()]} ${currentTime.getDate()} · ${greeting}`;
  }, [currentTime]);

  useEffect(() => {
    document.documentElement.style.background = "#fff7ed";
    document.body.style.background = "#fff7ed";

    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    ensureMeta("theme-color", "#fff7ed");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshTasks = async (targetSpaceCode = spaceCode) => {
    if (!canSync) {
      setTasks(getTasks());
      setSyncMessage("本地模式：请检查 Vercel 环境变量");
      return;
    }

    try {
      const query = `tasks?select=*&space_code=eq.${encodeURIComponent(targetSpaceCode)}&order=updated_at.desc`;
      const data = (await remoteRequest(query, { method: "GET" })) as TaskRow[];
      const localTasks = getTasks();
      const migratedKey = `${MIGRATED_SPACE_KEY_PREFIX}${targetSpaceCode}`;

      if ((!data || data.length === 0) && localTasks.length > 0 && !localStorage.getItem(migratedKey)) {
        const migratedRows = localTasks.map((task) => ({
          space_code: targetSpaceCode,
          title: task.title,
          description: task.description || null,
          category: normalizeCategoryId(task.category || "work"),
          tags: task.tags || [],
          due_date: task.dueDate || null,
          due_time: task.reminderTime || null,
          completed: task.completed || false,
        }));
        const migrated = (await remoteRequest("tasks", { method: "POST", body: JSON.stringify(migratedRows) })) as TaskRow[];
        localStorage.setItem(migratedKey, "1");
        setTasks((migrated || []).map(toTask));
        setSyncMessage(`已把本地任务同步到：${targetSpaceCode}`);
        return;
      }

      setTasks((data || []).map(toTask));
      setSyncMessage(`正在同步：${targetSpaceCode}`);
    } catch (error) {
      setTasks(getTasks());
      setSyncMessage(error instanceof Error ? error.message : "同步失败，已切回本地数据");
    }
  };

  const refreshNotes = async (targetSpaceCode = spaceCode) => {
    if (!canSync) {
      setNotes(getLocalNotes(targetSpaceCode));
      return;
    }

    try {
      const query = `cat_notes?select=*&space_code=eq.${encodeURIComponent(targetSpaceCode)}&order=updated_at.desc`;
      const data = (await remoteRequest(query, { method: "GET" })) as NoteRow[];
      const remoteNotes = (data || []).map(toNote);
      const localNotes = getPendingNotes(targetSpaceCode);
      const mergedNotes = [
        ...localNotes.filter((localNote) => !remoteNotes.some((remoteNote) => remoteNote.id === localNote.id)),
        ...remoteNotes,
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(mergedNotes);
    } catch {
      setNotes(getPendingNotes(targetSpaceCode));
    }
  };

  useEffect(() => {
    if (!spaceUnlocked) return undefined;

    refreshTasks(spaceCode);
    refreshNotes(spaceCode);
    if (!canSync) return undefined;

    const timer = window.setInterval(() => {
      refreshTasks(spaceCode);
      refreshNotes(spaceCode);
    }, 12000);

    return () => window.clearInterval(timer);
  }, [spaceCode, spaceUnlocked]);

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingTaskId(null);
  };

  const openNewTaskForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTaskId(task.id);
    setFormData({
      title: task.title,
      description: task.description,
      category: normalizeCategoryId(task.category),
      tags: task.tags.join(", "),
      dueDate: task.dueDate || "",
      reminderTime: task.reminderTime || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const resetNoteForm = () => {
    setNoteForm(emptyNoteForm);
    setEditingNoteId(null);
  };

  const openNewNoteForm = () => {
    resetNoteForm();
    setSyncMessage("");
    setShowNoteForm(true);
  };

  const openEditNoteForm = (note: CatNote) => {
    setEditingNoteId(note.id);
    setSyncMessage("");
    setNoteForm({
      title: note.title,
      body: note.body,
      category: note.category,
      photo: "",
    });
    setShowNoteForm(true);
  };

  const closeNoteForm = () => {
    setShowNoteForm(false);
    resetNoteForm();
  };

  const viewingTask = viewingTaskId ? tasks.find((task) => task.id === viewingTaskId) || null : null;
  const viewingNote = viewingNoteId ? notes.find((note) => note.id === viewingNoteId) || null : null;

  useEffect(() => {
    if (!viewingTask) {
      setDetailEditing(false);
      setDetailDraft({ title: "", description: "" });
      return;
    }

    setDetailDraft({ title: viewingTask.title, description: viewingTask.description || "" });
  }, [viewingTask?.id]);

  useEffect(() => {
    if (!viewingNote) {
      setNoteDetailEditing(false);
      setNoteDetailDraft(emptyNoteForm);
      return;
    }

    setNoteDetailDraft({
      title: viewingNote.title,
      body: viewingNote.body,
      category: viewingNote.category,
      photo: "",
    });
  }, [viewingNote?.id]);

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "today") return task.dueDate && isToday(task.dueDate) && !task.completed;
      if (filter === "upcoming") return task.dueDate && !task.completed && !isToday(task.dueDate);
      if (filter === "overdue") return task.dueDate && isOverdue(task.dueDate) && !task.completed;
      if (!task.completed) return true;
      return false;
    })
    .filter((task) => !selectedCategory || normalizeCategoryId(task.category) === selectedCategory)
    .filter((task) => !selectedTag || task.tags.includes(selectedTag))
    .filter(
      (task) =>
        !searchText ||
        task.title.toLowerCase().includes(searchText.toLowerCase()) ||
        task.description.toLowerCase().includes(searchText.toLowerCase())
    );
  const sortedTasks = [...filteredTasks].sort((first, second) => {
    if (first.completed !== second.completed) return first.completed ? 1 : -1;
    const dueDiff = getTaskDueTime(first) - getTaskDueTime(second);
    if (dueDiff !== 0) return dueDiff;
    return new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime();
  });

  const filteredNotes = notes
    .filter((note) => noteCategoryFilter === "all" || note.category === noteCategoryFilter)
    .filter(
      (note) =>
        !searchText ||
        note.title.toLowerCase().includes(searchText.toLowerCase()) ||
        note.body.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((first, second) => new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime());

  const enterSpace = async () => {
    const nextCode = spaceDraft.trim();
    const nextPassword = spacePassword.trim();

    if (!nextCode || !nextPassword) {
      setSyncMessage("请输入同步码和密码");
      return;
    }

    if (!canSync) {
      setSpaceCode(nextCode);
      setSpaceUnlocked(true);
      setSyncMessage("本地模式：请检查 Vercel 环境变量");
      return;
    }

    try {
      const passwordHash = await hashPassword(nextCode, nextPassword);
      const existing = (await remoteRequest(`task_spaces?select=*&code=eq.${encodeURIComponent(nextCode)}&limit=1`, {
        method: "GET",
      })) as TaskSpaceRow[];

      if (existing?.length) {
        if (existing[0].password_hash !== passwordHash) {
          setSyncMessage("同步空间密码不对");
          return;
        }
      } else {
        await remoteRequest("task_spaces", {
          method: "POST",
          body: JSON.stringify({ code: nextCode, password_hash: passwordHash }),
        });
      }

      localStorage.setItem(SPACE_CODE_KEY, nextCode);
      localStorage.setItem(SPACE_AUTH_KEY, JSON.stringify({ code: nextCode, passwordHash }));
      setSpaceCode(nextCode);
      setSpaceUnlocked(true);
      setSelectedCategory(null);
      setSelectedTag(null);
      setNoteCategoryFilter("all");
      setSearchText("");
      setSyncMessage(`已进入同步空间：${nextCode}`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "进入同步空间失败");
    }
  };

  const leaveSpace = () => {
    localStorage.removeItem(SPACE_AUTH_KEY);
    setSpaceUnlocked(false);
    setTasks([]);
    setNotes([]);
    setSpacePassword("");
    setSyncMessage("请输入同步码和密码");
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      return;
    }

    const tags = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title.trim(),
      description: formData.description,
      category: formData.category,
      tags,
      dueDate: formData.dueDate,
      reminderTime: formData.reminderTime,
      completed: editingTaskId ? tasks.find((task) => task.id === editingTaskId)?.completed ?? false : false,
    };

    if (!canSync) {
      if (editingTaskId) {
        updateTask(editingTaskId, payload);
      } else {
        addTask(payload);
      }

      await refreshTasks();
      closeForm();
      return;
    }

    try {
      if (editingTaskId) {
        await remoteRequest(`tasks?id=eq.${editingTaskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: payload.title,
            description: payload.description || null,
            category: payload.category,
            tags: payload.tags,
            due_date: payload.dueDate || null,
            due_time: payload.reminderTime || null,
            completed: payload.completed,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await remoteRequest("tasks", {
          method: "POST",
          body: JSON.stringify({
            space_code: spaceCode,
            title: payload.title,
            description: payload.description || null,
            category: payload.category,
            tags: payload.tags,
            due_date: payload.dueDate || null,
            due_time: payload.reminderTime || null,
            completed: false,
          }),
        });
      }

      await refreshTasks();
      closeForm();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "保存失败");
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    if (!canSync) {
      updateTask(id, { completed: !completed });
      await refreshTasks();
      return;
    }

    try {
      await remoteRequest(`tasks?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !completed, updated_at: new Date().toISOString() }),
      });
      await refreshTasks();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "更新失败");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!canSync) {
      deleteTask(id);
      await refreshTasks();
      return;
    }

    try {
      await remoteRequest(`tasks?id=eq.${id}`, { method: "DELETE" });
      await refreshTasks();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "删除失败");
    }
  };

  const handleSaveDetail = async () => {
    if (!viewingTask || !detailDraft.title.trim()) return;

    const title = detailDraft.title.trim();
    const description = detailDraft.description;

    if (!canSync) {
      updateTask(viewingTask.id, { title, description });
      await refreshTasks();
      setDetailEditing(false);
      return;
    }

    try {
      await remoteRequest(`tasks?id=eq.${viewingTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description: description || null,
          updated_at: new Date().toISOString(),
        }),
      });
      await refreshTasks();
      setDetailEditing(false);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "保存详情失败");
    }
  };

  const handleSaveNote = async () => {
    try {
      if (!noteForm.title.trim()) {
        setSyncMessage("请先填写笔记标题");
        return;
      }

      const payload = {
        title: noteForm.title.trim(),
        body: noteForm.body,
        category: noteForm.category,
        photo: "",
      };

      const now = new Date().toISOString();
      const localId = editingNoteId || createId();
      const optimisticNote: CatNote = editingNoteId
        ? {
            ...(notes.find((note) => note.id === editingNoteId) || { id: localId, createdAt: now, updatedAt: now, ...payload }),
            ...payload,
            updatedAt: now,
          }
        : { id: localId, ...payload, createdAt: now, updatedAt: now };
      const optimisticNotes = editingNoteId ? notes.map((note) => (note.id === editingNoteId ? optimisticNote : note)) : [optimisticNote, ...notes];

      setActiveTab("notes");
      setNoteCategoryFilter("all");
      setSearchText("");
      setNotes(optimisticNotes);
      closeNoteForm();
      setSyncMessage(canSync ? "笔记已先保存，正在同步云端" : "笔记已保存到本机");
      if (canSync) {
        savePendingNotes(spaceCode, editingNoteId ? getPendingNotes(spaceCode).filter((note) => note.id !== editingNoteId) : [optimisticNote, ...getPendingNotes(spaceCode)]);
      } else {
        trySaveLocalNotes(spaceCode, optimisticNotes);
      }

      if (!canSync) return;

      try {
        if (editingNoteId) {
          await remoteRequest(`cat_notes?id=eq.${editingNoteId}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: payload.title,
              body: payload.body || null,
              category: payload.category,
              photo: payload.photo || null,
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          const created = (await remoteRequest("cat_notes", {
            method: "POST",
            body: JSON.stringify({
              space_code: spaceCode,
              title: payload.title,
              body: payload.body || null,
              category: payload.category,
              photo: payload.photo || null,
            }),
          })) as NoteRow[];

          const remoteNote = created?.[0] ? toNote(created[0]) : null;
          if (remoteNote) {
            setNotes((current) => current.map((note) => (note.id === localId ? remoteNote : note)));
            savePendingNotes(spaceCode, getPendingNotes(spaceCode).filter((note) => note.id !== localId));
          }
        }

        setSyncMessage("笔记已保存");
      } catch (error) {
        setSyncMessage(error instanceof Error ? `笔记已保存在本机，云端同步失败：${error.message}` : "笔记已保存在本机，云端同步失败");
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? `笔记保存失败：${error.message}` : "笔记保存失败");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!canSync) {
      const nextNotes = getLocalNotes(spaceCode).filter((note) => note.id !== id);
      saveLocalNotes(spaceCode, nextNotes);
      setNotes(nextNotes);
      return;
    }

    const nextPendingNotes = getPendingNotes(spaceCode).filter((note) => note.id !== id);
    savePendingNotes(spaceCode, nextPendingNotes);
    setNotes((current) => current.filter((note) => note.id !== id));

    try {
      await remoteRequest(`cat_notes?id=eq.${id}`, { method: "DELETE" });
      await refreshNotes();
    } catch (error) {
      setSyncMessage(error instanceof Error ? `删除本地笔记：${error.message}` : "删除本地笔记");
    }
  };

  const handleSaveNoteDetail = async () => {
    if (!viewingNote || !noteDetailDraft.title.trim()) return;

      const payload = {
        title: noteDetailDraft.title.trim(),
        body: noteDetailDraft.body,
        category: noteDetailDraft.category,
        photo: "",
      };

    if (!canSync) {
      const now = new Date().toISOString();
      const nextNotes = getLocalNotes(spaceCode).map((note) => (note.id === viewingNote.id ? { ...note, ...payload, updatedAt: now } : note));
      if (!trySaveLocalNotes(spaceCode, nextNotes)) {
        setSyncMessage("笔记保存失败：本地空间已满，请先删除旧大图笔记，或确认 Supabase 笔记表已创建。");
        return;
      }
      setNotes(nextNotes);
      setNoteDetailEditing(false);
      return;
    }

    try {
      await remoteRequest(`cat_notes?id=eq.${viewingNote.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: payload.title,
          body: payload.body || null,
          category: payload.category,
          photo: payload.photo || null,
          updated_at: new Date().toISOString(),
        }),
      });
      setNotes((current) => current.map((note) => (note.id === viewingNote.id ? { ...note, ...payload, updatedAt: new Date().toISOString() } : note)));
      setNoteDetailEditing(false);
    } catch (error) {
      setSyncMessage(error instanceof Error ? `保存笔记失败：${error.message}` : "保存笔记失败");
    }
  };

  const handleDeleteEditingTask = async () => {
    if (!editingTaskId) return;
    await handleDeleteTask(editingTaskId);
    closeForm();
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((category) => category.id === normalizeCategoryId(categoryId));
    return cat?.color || "#FB7185";
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    today: tasks.filter((task) => task.dueDate && isToday(task.dueDate) && !task.completed).length,
    upcoming: tasks.filter((task) => task.dueDate && !task.completed && !isToday(task.dueDate) && !isOverdue(task.dueDate)).length,
    overdue: tasks.filter((task) => task.dueDate && isOverdue(task.dueDate) && !task.completed).length,
  };
  const remainingTasks = Math.max(stats.total - stats.completed, 0);
  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const summaryHint =
    stats.total === 0
      ? "猫窝还很安静，先放进一个小任务吧 ✨"
      : remainingTasks === 0
        ? "今天的小事都收好啦，摸摸小猫休息一下 🐾"
        : `还有 ${remainingTasks} 件小事，慢慢来也没关系 ✨`;
  const iconStroke = 2.35;

  if (!spaceUnlocked) {
    return (
      <div className="fixed inset-0 overflow-hidden overscroll-none bg-[radial-gradient(circle_at_12%_0%,#fde8c8_0,#fff7ed_34%,#fff1f3_72%,#fffaf5_100%)] text-stone-800 [touch-action:pan-y]">
        <div className="mx-auto flex h-[100dvh] min-h-[100svh] w-full max-w-[430px] flex-col justify-center overflow-hidden px-4 py-[calc(1rem+env(safe-area-inset-top))]">
          <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/80 p-6 shadow-[0_12px_34px_rgba(120,80,50,0.10)] backdrop-blur-xl">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-rose-200/70" />
            <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-amber-200/70" />
            <div className="relative">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-500">
                    <Lock className="h-3.5 w-3.5" strokeWidth={iconStroke} />
                    同步空间登录
                  </div>
                  <h1 className="text-3xl font-black tracking-normal text-stone-900">任务记事本</h1>
                  <p className="mt-2 text-sm font-bold leading-6 text-stone-500">输入同一个同步码和密码，就会进入同一个猫咪任务空间。</p>
                </div>
                <img
                  src="/cat-cutout.png"
                  alt="我的猫咪"
                  className="h-28 w-28 shrink-0 object-contain drop-shadow-[0_12px_18px_rgba(120,80,50,0.18)]"
                />
              </div>

              <div className="space-y-3">
                <label className="grid gap-2 text-sm font-black text-stone-600">
                  <span>同步码</span>
                  <input
                    value={spaceDraft}
                    onChange={(event) => setSpaceDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") enterSpace();
                    }}
                    placeholder="比如 MYTASK2026"
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-stone-600">
                  <span>空间密码</span>
                  <div className="flex items-center rounded-2xl border border-rose-100 bg-white px-4 focus-within:ring-2 focus-within:ring-rose-200">
                    <input
                      type={showSpacePassword ? "text" : "password"}
                      value={spacePassword}
                      onChange={(event) => setSpacePassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") enterSpace();
                      }}
                      placeholder="输入只有你知道的密码"
                      className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300"
                    />
                    <button type="button" onClick={() => setShowSpacePassword((current) => !current)} className="grid h-10 w-10 place-items-center text-stone-400">
                      {showSpacePassword ? <EyeOff className="h-5 w-5" strokeWidth={iconStroke} /> : <Eye className="h-5 w-5" strokeWidth={iconStroke} />}
                    </button>
                  </div>
                </label>

                <button type="button" onClick={enterSpace} className="mt-2 w-full rounded-2xl bg-stone-900 px-4 py-3 font-black text-white shadow-[0_10px_24px_rgba(39,39,42,0.16)]">
                  进入任务空间
                </button>
              </div>

              <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-stone-500">
                {syncMessage || "首次输入会自动创建同步空间。请把同步码和密码截图保存，忘记后无法找回。"}
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-[radial-gradient(circle_at_12%_0%,#fde8c8_0,#fff7ed_30%,#fff1f3_68%,#fffaf5_100%)] text-stone-800 [touch-action:pan-y]">
      <style>{`
        html,
        body,
        #root {
          min-height: 100%;
          background: radial-gradient(circle at 12% 0%, #fde8c8 0, #fff7ed 30%, #fff1f3 68%, #fffaf5 100%) !important;
        }

        @keyframes catFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-0.4deg); }
          50% { transform: translate3d(0, 6px, 0) rotate(0.5deg); }
        }

        @keyframes softGlow {
          0%, 100% { opacity: 0.42; transform: scale(0.98); }
          50% { opacity: 0.68; transform: scale(1.04); }
        }

        @keyframes headerDrift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .cat-float {
          animation: catFloat 5.8s ease-in-out infinite;
          will-change: transform;
        }

        .cat-soft-glow {
          animation: softGlow 4.8s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .header-soft-drift {
          background-image: linear-gradient(120deg, rgba(255,255,255,.84), rgba(255,250,243,.9), rgba(255,241,243,.76));
          background-size: 180% 180%;
          animation: headerDrift 12s ease-in-out infinite;
        }

        .task-title-clamp,
        .task-description-clamp {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .task-title-clamp {
          -webkit-line-clamp: 2;
        }

        .task-description-clamp {
          -webkit-line-clamp: 2;
        }

        .app-tabbar {
          position: fixed !important;
          left: 50%;
          right: auto;
          bottom: 0 !important;
          width: 100%;
          max-width: 430px;
          height: calc(56px + env(safe-area-inset-bottom, 0px));
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
          gap: 0.5rem;
          padding: 0.35rem 1rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.72);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 250, 243, 1) 68%, rgba(255, 250, 243, 1));
          box-shadow: 0 -8px 22px rgba(120, 80, 50, 0.055);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          z-index: 30;
        }

        .scroll-end-spacer {
          height: calc(18rem + env(safe-area-inset-bottom, 0px));
          flex: 0 0 auto;
        }

        @media (prefers-reduced-motion: reduce) {
          .cat-float,
          .cat-soft-glow,
          .header-soft-drift {
            animation: none;
          }
        }
      `}</style>
      <div className="mx-auto h-[100dvh] min-h-[100svh] w-full max-w-[430px] overflow-hidden">
        <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 pb-[calc(18rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="header-soft-drift relative mb-2 min-h-[112px] overflow-hidden rounded-[22px] border border-white/80 bg-white/80 p-3 shadow-[0_7px_18px_rgba(120,80,50,0.07)] backdrop-blur-xl">
          <div className="absolute -right-8 -top-9 h-24 w-24 rounded-full bg-rose-200/70" />
          <div className="absolute -bottom-10 left-7 h-22 w-22 rounded-full bg-amber-200/70" />
          <div className="relative flex h-full items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex min-w-0 items-center gap-2">
                <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-100 px-2.5 py-1.5 text-[18px] font-black leading-none text-rose-500 shadow-[0_5px_12px_rgba(251,113,133,0.09)]">
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={iconStroke} />
                  <span>{activeTab === "tasks" ? "任务小窝" : "猫咪笔记本"}</span>
                </div>
                <p className="min-w-0 flex-1 truncate text-[10px] font-bold leading-4 text-stone-500">{activeTab === "tasks" ? "整理每日任务" : "收好生活碎片"}</p>
              </div>
              <div className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/60 px-2.5 py-0.5 text-[10px] font-bold text-stone-500 shadow-sm backdrop-blur-sm">
                <Clock className="h-3 w-3 shrink-0 text-amber-500" strokeWidth={iconStroke} />
                <span className="truncate">{headerTimeText}</span>
              </div>
              <button type="button" onClick={leaveSpace} className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-rose-400">
                切换同步空间
              </button>
            </div>
            <div className="cat-float relative -mr-2 mt-2 h-[88px] w-[88px] shrink-0">
              <div className="cat-soft-glow absolute inset-x-5 bottom-2 h-10 rounded-full bg-rose-200/40 blur-xl" />
              <img
                src="/cat-cutout.png"
                alt="我的猫咪"
                className="relative h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(120,80,50,0.18)]"
              />
            </div>
          </div>
        </header>

        {activeTab === "tasks" ? (
          <>
        <section className="mb-2 rounded-[22px] border border-white/80 bg-white/75 p-2.5 shadow-[0_6px_16px_rgba(120,80,50,0.05)] backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="inline-flex min-w-0 items-center gap-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-rose-100 text-sm">🐾</span>
              <div className="min-w-0">
                <p className="text-[12px] font-black leading-4 text-stone-800">任务状态</p>
                <p className="truncate text-[10px] font-bold leading-4 text-stone-400">{summaryHint}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-rose-50 px-2 py-1 text-right">
              <p className="text-[12px] font-black leading-4 text-rose-500">{stats.completed}/{stats.total}</p>
              <p className="text-[9px] font-black leading-3 text-stone-400">已完成</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-rose-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-200 transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[9px] font-black text-stone-300">
            <span>慢慢完成</span>
            <span>{completionPercent}%</span>
          </div>
        </section>

        <label className="mb-2 flex min-h-10 w-full items-center gap-2 rounded-[20px] border border-white/80 bg-white/80 px-3 shadow-[0_6px_16px_rgba(120,80,50,0.045)] backdrop-blur">
          <Search className="h-4 w-4 text-rose-300" strokeWidth={iconStroke} />
          <input
            type="text"
            placeholder="搜索猫窝里的任务..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <nav className="mb-4 grid grid-cols-5 gap-2">
          {(["all", "today", "upcoming", "overdue", "completed"] as FilterType[]).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-full px-2 text-xs font-black transition ${
                filter === item
                  ? "bg-stone-900 text-white shadow-[0_8px_20px_rgba(39,39,42,0.16)]"
                  : "border border-white/80 bg-white/70 text-stone-500"
              }`}
            >
              <PawPrint className="h-3.5 w-3.5" strokeWidth={iconStroke} />
              {filterLabels[item]}
            </button>
          ))}
        </nav>

        {categories.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-stone-400">分类</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`min-h-10 rounded-full px-3 text-sm font-black ${
                  selectedCategory === null ? "bg-rose-400 text-white" : "border border-white/80 bg-white/70 text-stone-500"
                }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-full border border-white/80 bg-white/70 px-2 text-sm font-black text-stone-500"
                  style={{
                    color: selectedCategory === category.id ? category.color : undefined,
                    boxShadow: selectedCategory === category.id ? `inset 0 0 0 2px ${category.color}55` : undefined,
                  }}
                >
                  <Folder className="h-4 w-4 shrink-0" strokeWidth={iconStroke} />
                  <span className="truncate">{category.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {allTags.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-stone-400">标签</p>
            <div className="flex flex-wrap gap-2 pb-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${
                    selectedTag === tag ? "bg-violet-400 text-white" : "border border-white/80 bg-white/70 text-stone-500"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" strokeWidth={iconStroke} />
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-1 flex-col gap-3">
          {filteredTasks.length === 0 ? (
            <div className="grid min-h-[230px] place-items-center rounded-[32px] border border-dashed border-rose-200 bg-white/60 p-6 text-center">
              <div>
                <div className="mb-3 text-6xl">(=^･ω･^=)</div>
                <p className="font-black text-stone-700">猫窝现在很安静</p>
                <p className="mt-1 text-sm font-medium text-stone-400">点右下角的小爪子添加任务</p>
              </div>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <article key={task.id} className="rounded-[24px] border border-white/80 bg-white/80 p-3 shadow-[0_7px_20px_rgba(120,80,50,0.06)] backdrop-blur">
                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="mt-1 shrink-0 text-rose-300 transition hover:text-rose-500"
                    aria-label={task.completed ? "标记为未完成" : "标记为完成"}
                  >
                    {task.completed ? <CheckCircle2 className="h-6 w-6 text-emerald-400" strokeWidth={iconStroke} /> : <Circle className="h-6 w-6" strokeWidth={iconStroke} />}
                  </button>

                  <button type="button" onClick={() => setViewingTaskId(task.id)} className="min-w-0 flex-1 text-left" aria-label="查看任务详情">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className={`task-title-clamp text-[15px] font-black leading-5 ${task.completed ? "text-stone-400 line-through" : "text-stone-900"}`}>{task.title}</h3>
                    </div>
                    {task.description && <p className="task-description-clamp mb-2 text-xs font-medium leading-5 text-stone-500">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-black text-white"
                        style={{ backgroundColor: getCategoryColor(task.category) }}
                      >
                        {categories.find((category) => category.id === normalizeCategoryId(task.category))?.name}
                      </span>
                      {(task.dueDate || task.reminderTime) && (
                        <span className="inline-flex shrink-0 items-center gap-1.5">
                          {task.dueDate && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${isOverdue(task.dueDate) && !task.completed ? "bg-rose-100 text-rose-500" : "bg-sky-100 text-sky-500"}`}>
                              <Calendar className="h-3 w-3" strokeWidth={iconStroke} />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.reminderTime && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-600">
                              <Clock className="h-3 w-3" strokeWidth={iconStroke} />
                              {formatDueTime(task.reminderTime)}
                            </span>
                          )}
                        </span>
                      )}
                      {task.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-black text-violet-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </button>

                  <button
                    onClick={() => openEditTaskForm(task)}
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 text-rose-300 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="编辑任务"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={iconStroke} />
                  </button>

                  <button onClick={() => handleDeleteTask(task.id)} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-rose-50/80 text-rose-300 transition hover:bg-rose-100 hover:text-rose-500" aria-label="删除任务">
                    <Trash2 className="h-4 w-4" strokeWidth={iconStroke} />
                  </button>
                </div>
              </article>
            ))
          )}
          <div aria-hidden="true" className="scroll-end-spacer" />
        </section>

          </>
        ) : (
          <>
            <section className="mb-4 rounded-[28px] border border-white/80 bg-white/75 p-4 shadow-[0_8px_24px_rgba(120,80,50,0.07)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-800">笔记小窝</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-stone-400">已经收好 {notes.length} 条笔记，想法都可以慢慢整理。</p>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                  <BookOpen className="h-6 w-6" strokeWidth={iconStroke} />
                </div>
              </div>
            </section>

            <label className="mb-4 flex min-h-14 w-full items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 shadow-[0_8px_24px_rgba(120,80,50,0.06)] backdrop-blur">
              <Search className="h-5 w-5 text-rose-300" strokeWidth={iconStroke} />
              <input
                type="text"
                placeholder="搜索猫咪笔记本..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </label>

            <section className="mb-5">
              <p className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-stone-400">笔记分类</p>
              <div className="grid grid-cols-5 gap-2">
                <button type="button" onClick={() => setNoteCategoryFilter("all")} className={`min-h-10 rounded-full px-2 text-xs font-black ${noteCategoryFilter === "all" ? "bg-rose-400 text-white" : "border border-white/80 bg-white/70 text-stone-500"}`}>
                  全部
                </button>
                {noteCategories.map((category) => (
                  <button key={category.id} type="button" onClick={() => setNoteCategoryFilter(category.id)} className={`min-h-10 rounded-full px-2 text-xs font-black ${noteCategoryFilter === category.id ? "text-white" : "border border-white/80 bg-white/70 text-stone-500"}`} style={{ backgroundColor: noteCategoryFilter === category.id ? category.color : undefined }}>
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-1 flex-col gap-3">
              {filteredNotes.length === 0 ? (
                <div className="grid min-h-[230px] place-items-center rounded-[32px] border border-dashed border-rose-200 bg-white/60 p-6 text-center">
                  <div>
                    <div className="mb-3 text-6xl">ฅ^•ﻌ•^ฅ</div>
                    <p className="font-black text-stone-700">笔记本还很干净</p>
                    <p className="mt-1 text-sm font-medium text-stone-400">点右下角添加第一条猫咪笔记</p>
                  </div>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const category = noteCategories.find((item) => item.id === note.category) || noteCategories[3];
                  return (
                    <article key={note.id} className="rounded-[24px] border border-white/80 bg-white/80 p-3 shadow-[0_7px_20px_rgba(120,80,50,0.06)] backdrop-blur">
                      <div className="flex gap-2.5">
                        <button type="button" onClick={() => setViewingNoteId(note.id)} className="min-w-0 flex-1 text-left">
                          <h3 className="task-title-clamp text-[16px] font-black leading-5 text-stone-900">{note.title}</h3>
                          {note.body && <p className="task-description-clamp mt-2 text-xs font-medium leading-5 text-stone-500">{note.body}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${category.tint}`}>{category.name}</span>
                            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-black text-stone-400">{formatDate(note.updatedAt.slice(0, 10))}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setViewingNoteId(note.id);
                            setNoteDetailDraft({ title: note.title, body: note.body, category: note.category, photo: "" });
                            setNoteDetailEditing(true);
                          }}
                          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/80 text-rose-300 transition hover:bg-rose-50 hover:text-rose-500"
                          aria-label="编辑笔记"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={iconStroke} />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-rose-50/80 text-rose-300 transition hover:bg-rose-100 hover:text-rose-500" aria-label="删除笔记">
                          <Trash2 className="h-4 w-4" strokeWidth={iconStroke} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
              <div aria-hidden="true" className="scroll-end-spacer" />
            </section>
          </>
        )}

        <button
          onClick={activeTab === "tasks" ? openNewTaskForm : openNewNoteForm}
          className="fixed bottom-[calc(6.2rem+env(safe-area-inset-bottom))] right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-300 text-white shadow-[0_12px_26px_rgba(251,113,133,0.24)] transition active:scale-95"
          aria-label={activeTab === "tasks" ? "新建任务" : "新建笔记"}
        >
          <Plus className="h-8 w-8" strokeWidth={iconStroke} />
        </button>

        {viewingTask && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#fff7ed]/70 px-3 backdrop-blur-md">
            <article className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overflow-x-hidden rounded-t-[34px] border border-white/80 bg-[#fffdf8] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-14px_34px_rgba(120,80,50,0.12)]">
              <div className="mb-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewingTaskId(null)}
                  className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-500"
                >
                  返回
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailDraft({ title: viewingTask.title, description: viewingTask.description || "" });
                      setDetailEditing(true);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-rose-400 shadow-sm"
                    aria-label="编辑任务"
                  >
                    <Pencil className="h-5 w-5" strokeWidth={iconStroke} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteTask(viewingTask.id);
                      setViewingTaskId(null);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-400"
                    aria-label="删除任务"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={iconStroke} />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-rose-300">Task Note</p>
                  {detailEditing ? (
                    <input
                      value={detailDraft.title}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-3xl border border-rose-100 bg-white/80 px-4 py-3 text-[24px] font-black leading-tight text-stone-900 outline-none focus:ring-2 focus:ring-rose-200"
                    />
                  ) : (
                    <h2 className={`break-words text-3xl font-black leading-tight ${viewingTask.completed ? "text-stone-400 line-through" : "text-stone-900"}`}>
                      {viewingTask.title}
                    </h2>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-black text-white"
                    style={{ backgroundColor: getCategoryColor(viewingTask.category) }}
                  >
                    {categories.find((category) => category.id === normalizeCategoryId(viewingTask.category))?.name}
                  </span>
                  {(viewingTask.dueDate || viewingTask.reminderTime) && (
                    <span className="inline-flex shrink-0 items-center gap-2">
                      {viewingTask.dueDate && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${isOverdue(viewingTask.dueDate) && !viewingTask.completed ? "bg-rose-100 text-rose-500" : "bg-sky-100 text-sky-500"}`}>
                          <Calendar className="h-3 w-3" strokeWidth={iconStroke} />
                          {formatDate(viewingTask.dueDate)}
                        </span>
                      )}
                      {viewingTask.reminderTime && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-600">
                          <Clock className="h-3 w-3" strokeWidth={iconStroke} />
                          {formatDueTime(viewingTask.reminderTime)}
                        </span>
                      )}
                    </span>
                  )}
                  {viewingTask.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-500">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="rounded-[26px] bg-white/70 px-3.5 py-4">
                  {detailEditing ? (
                    <textarea
                      value={detailDraft.description}
                      onChange={(event) => setDetailDraft((current) => ({ ...current, description: event.target.value }))}
                      placeholder="写一点备注，小猫会帮你记住"
                      className="min-h-[280px] w-full resize-none bg-transparent text-[15px] font-medium leading-7 text-stone-600 outline-none placeholder:text-stone-300"
                    />
                  ) : viewingTask.description ? (
                    <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-stone-600">{viewingTask.description}</p>
                  ) : (
                    <p className="text-[15px] font-bold text-stone-300">这里还没有写描述。</p>
                  )}
                </div>

                {detailEditing && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailDraft({ title: viewingTask.title, description: viewingTask.description || "" });
                        setDetailEditing(false);
                      }}
                      className="flex-1 rounded-2xl bg-white px-4 py-3 font-black text-stone-500 shadow-sm"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDetail}
                      className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 font-black text-white shadow-[0_10px_24px_rgba(39,39,42,0.16)]"
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>
            </article>
          </div>
        )}

        {viewingNote && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#fff7ed]/70 px-3 backdrop-blur-md">
            <article className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overflow-x-hidden rounded-t-[34px] border border-white/80 bg-[#fffdf8] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-14px_34px_rgba(120,80,50,0.12)]">
              <div className="mb-6 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setViewingNoteId(null)} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-500">
                  返回
                </button>
                {noteDetailEditing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNoteDetailDraft({ title: viewingNote.title, body: viewingNote.body, category: viewingNote.category, photo: "" });
                        setNoteDetailEditing(false);
                      }}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-stone-500 shadow-sm"
                    >
                      取消
                    </button>
                    <button type="button" onClick={handleSaveNoteDetail} className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(39,39,42,0.16)]">
                      保存
                    </button>
                  </div>
                ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDetailDraft({ title: viewingNote.title, body: viewingNote.body, category: viewingNote.category, photo: "" });
                      setNoteDetailEditing(true);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-rose-400 shadow-sm"
                    aria-label="编辑笔记"
                  >
                    <Pencil className="h-5 w-5" strokeWidth={iconStroke} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteNote(viewingNote.id);
                      setViewingNoteId(null);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-400"
                    aria-label="删除笔记"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={iconStroke} />
                  </button>
                </div>
                )}
              </div>

              {noteDetailEditing ? (
                <div className="space-y-4">
                  <FieldLabel label="笔记标题" required>
                    <input
                      value={noteDetailDraft.title}
                      onChange={(event) => setNoteDetailDraft((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-3xl border border-rose-100 bg-white/80 px-4 py-3 text-[24px] font-black leading-tight text-stone-900 outline-none focus:ring-2 focus:ring-rose-200"
                    />
                  </FieldLabel>
                  <FieldLabel label="分类">
                    <select
                      value={noteDetailDraft.category}
                      onChange={(event) => setNoteDetailDraft((current) => ({ ...current, category: event.target.value as NoteCategory }))}
                      className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-rose-200"
                    >
                      {noteCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <FieldLabel label="正文">
                    <textarea
                      value={noteDetailDraft.body}
                      onChange={(event) => setNoteDetailDraft((current) => ({ ...current, body: event.target.value }))}
                      placeholder="写下笔记内容..."
                      className="min-h-[280px] w-full resize-none rounded-[26px] bg-white/70 px-3.5 py-4 text-[15px] font-medium leading-7 text-stone-600 outline-none placeholder:text-stone-300"
                    />
                  </FieldLabel>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-rose-300">Cat Note</p>
                  <h2 className="break-words text-3xl font-black leading-tight text-stone-900">{viewingNote.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(() => {
                      const category = noteCategories.find((item) => item.id === viewingNote.category) || noteCategories[3];
                      return <span className={`rounded-full px-3 py-1 text-xs font-black ${category.tint}`}>{category.name}</span>;
                    })()}
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-400">{formatDate(viewingNote.updatedAt.slice(0, 10))}</span>
                  </div>
                  <div className="mt-5 rounded-[26px] bg-white/70 px-3.5 py-4">
                    {viewingNote.body ? (
                      <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-stone-600">{viewingNote.body}</p>
                    ) : (
                      <p className="text-[15px] font-bold text-stone-300">这条笔记还没有正文。</p>
                    )}
                  </div>
                </>
              )}
            </article>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/30 px-3 backdrop-blur-sm">
            <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-[34px] border border-white/80 bg-[#fffaf3] p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-22px_70px_rgba(120,80,50,0.20)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-rose-400">{editingTaskId ? "修改猫咪任务" : "新任务进猫窝"}</p>
                  <h2 className="text-2xl font-black text-stone-900">{editingTaskId ? "编辑任务" : "新建任务"}</h2>
                </div>
                <button onClick={closeForm} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-stone-400 shadow-sm">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <FieldLabel label="任务标题" required>
                  <input
                    type="text"
                    placeholder="比如：整理明天计划"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </FieldLabel>

                <FieldLabel label="描述">
                  <textarea
                    placeholder="写一点备注，小猫会帮你记住"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </FieldLabel>

                <FieldLabel label="分类">
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="标签">
                  <input
                    type="text"
                    placeholder="用逗号分隔，例如：紧急, 重要"
                    value={formData.tags}
                    onChange={(event) => setFormData({ ...formData, tags: event.target.value })}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </FieldLabel>

                <div className="grid grid-cols-2 gap-3">
                  <FieldLabel label="截止日期">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                      className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                    />
                  </FieldLabel>
                  <FieldLabel label="截止时间">
                    <input
                      type="time"
                      value={formData.reminderTime}
                      onChange={(event) => setFormData({ ...formData, reminderTime: event.target.value })}
                      className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                    />
                  </FieldLabel>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingTaskId && (
                    <button onClick={handleDeleteEditingTask} className="rounded-2xl bg-rose-100 px-4 py-3 font-black text-rose-500">
                      删除
                    </button>
                  )}
                  <button onClick={closeForm} className="flex-1 rounded-2xl bg-white px-4 py-3 font-black text-stone-500 shadow-sm">
                    取消
                  </button>
                  <button onClick={handleSaveTask} className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 font-black text-white shadow-[0_10px_26px_rgba(39,39,42,0.22)]">
                    {editingTaskId ? "保存修改" : "创建任务"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showNoteForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/30 px-3 backdrop-blur-sm">
            <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-[34px] border border-white/80 bg-[#fffaf3] p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-22px_70px_rgba(120,80,50,0.20)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-rose-400">{editingNoteId ? "修改猫咪笔记" : "新笔记进小窝"}</p>
                  <h2 className="text-2xl font-black text-stone-900">{editingNoteId ? "编辑笔记" : "新建笔记"}</h2>
                </div>
                <button onClick={closeNoteForm} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-stone-400 shadow-sm">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {(syncMessage.includes("笔记") || syncMessage.includes("标题")) && (
                <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black leading-5 text-rose-500">{syncMessage}</p>
              )}

              <div className="space-y-4">
                <FieldLabel label="笔记标题" required>
                  <input
                    type="text"
                    placeholder="比如：今天学到的新东西"
                    value={noteForm.title}
                    onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </FieldLabel>

                <FieldLabel label="分类">
                  <select
                    value={noteForm.category}
                    onChange={(event) => setNoteForm({ ...noteForm, category: event.target.value as NoteCategory })}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  >
                    {noteCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </FieldLabel>

                <FieldLabel label="正文">
                  <textarea
                    placeholder="写下笔记内容..."
                    value={noteForm.body}
                    onChange={(event) => setNoteForm({ ...noteForm, body: event.target.value })}
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-rose-100 bg-white px-4 py-3 text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-rose-200"
                  />
                </FieldLabel>

                <div className="flex gap-3 pt-2">
                  {editingNoteId && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleDeleteNote(editingNoteId);
                        closeNoteForm();
                      }}
                      className="rounded-2xl bg-rose-100 px-4 py-3 font-black text-rose-500"
                    >
                      删除
                    </button>
                  )}
                  <button type="button" onClick={closeNoteForm} className="flex-1 rounded-2xl bg-white px-4 py-3 font-black text-stone-500 shadow-sm">
                    取消
                  </button>
                  <button type="button" onClick={handleSaveNote} className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 font-black text-white shadow-[0_10px_26px_rgba(39,39,42,0.22)]">
                    {editingNoteId ? "保存修改" : "创建笔记"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="app-tabbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab("tasks");
              setSearchText("");
            }}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${activeTab === "tasks" ? "bg-rose-100 text-rose-500" : "text-stone-400"}`}
          >
            <PawPrint className="h-5 w-5" strokeWidth={iconStroke} />
            任务
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("notes");
              setSearchText("");
            }}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${activeTab === "notes" ? "bg-rose-100 text-rose-500" : "text-stone-400"}`}
          >
            <BookOpen className="h-5 w-5" strokeWidth={iconStroke} />
            笔记
          </button>
        </nav>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-stone-600">
      <span>
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
      {children}
    </label>
  );
}


