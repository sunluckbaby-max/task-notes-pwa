/**
 * Cute Cat Cartoon Theme - Mobile Task Notes PWA
 * - Soft peach, cream, rose, and lavender palette
 * - Cat mascot header, paw-like chips, rounded note cards
 * - Keeps task create, edit, delete, complete, filters, tags, localStorage
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Calendar, CheckCircle2, Circle, Clock, Folder, PawPrint, Pencil, Plus, Search, Sparkles, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getTasks, addTask, updateTask, deleteTask, getCategories } from "@/lib/storage";
import type { Task } from "@/lib/storage";
import { formatDate, isToday, isOverdue } from "@/lib/utils";

type FilterType = "all" | "today" | "upcoming" | "completed" | "overdue";

const emptyFormData = {
  title: "",
  description: "",
  category: "work",
  tags: "",
  dueDate: "",
  reminderTime: "",
};

const filterLabels: Record<FilterType, string> = {
  all: "全部",
  today: "今天",
  upcoming: "即将",
  overdue: "逾期",
  completed: "完成",
};

const catMoods = ["ฅ^•ﻌ•^ฅ", "(=^･ω･^=)", "ฅ(＾・ω・＾ฅ)", "(=^ ◡ ^=)"];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories] = useState(getCategories());
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
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const refreshTasks = () => setTasks(getTasks());

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
      category: task.category,
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

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "today") return task.dueDate && isToday(task.dueDate) && !task.completed;
      if (filter === "upcoming") return task.dueDate && !task.completed && !isToday(task.dueDate);
      if (filter === "overdue") return task.dueDate && isOverdue(task.dueDate) && !task.completed;
      if (!task.completed) return true;
      return false;
    })
    .filter((task) => !selectedCategory || task.category === selectedCategory)
    .filter((task) => !selectedTag || task.tags.includes(selectedTag))
    .filter(
      (task) =>
        !searchText ||
        task.title.toLowerCase().includes(searchText.toLowerCase()) ||
        task.description.toLowerCase().includes(searchText.toLowerCase())
    );

  const handleSaveTask = () => {
    if (!formData.title.trim()) {
      toast.error("小猫还不知道任务标题");
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

    if (editingTaskId) {
      updateTask(editingTaskId, payload);
      toast.success("猫咪已经更新任务");
    } else {
      addTask(payload);
      toast.success("猫咪已经收好新任务");
    }

    refreshTasks();
    closeForm();
  };

  const handleToggleTask = (id: string, completed: boolean) => {
    updateTask(id, { completed: !completed });
    refreshTasks();
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    refreshTasks();
    toast.success("任务已从猫窝移除");
  };

  const handleDeleteEditingTask = () => {
    if (!editingTaskId) return;
    handleDeleteTask(editingTaskId);
    closeForm();
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((category) => category.id === categoryId);
    return cat?.color || "#FB7185";
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    today: tasks.filter((task) => task.dueDate && isToday(task.dueDate) && !task.completed).length,
    overdue: tasks.filter((task) => task.dueDate && isOverdue(task.dueDate) && !task.completed).length,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,#fed7aa_0,#fff7ed_28%,#fdf2f8_62%,#ede9fe_100%)] text-stone-800">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-24 pt-4">
        <header className="relative mb-5 overflow-hidden rounded-[32px] border border-white/80 bg-white/75 p-5 shadow-[0_18px_60px_rgba(251,146,60,0.22)] backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-200/70" />
          <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-amber-200/70" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-500">
                <Sparkles className="h-3.5 w-3.5" />
                猫咪任务小窝
              </div>
              <h1 className="text-3xl font-black tracking-normal text-stone-900">任务记事本</h1>
              <p className="mt-2 text-sm font-medium text-stone-500">让小猫陪你整理每日任务</p>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[28px] border border-rose-100 bg-gradient-to-br from-amber-100 to-rose-100 text-3xl shadow-inner">
              {catMoods[stats.total % catMoods.length]}
            </div>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-4 gap-2">
          {[
            { label: "全部", value: stats.total, tone: "bg-rose-100 text-rose-600" },
            { label: "完成", value: stats.completed, tone: "bg-emerald-100 text-emerald-600" },
            { label: "今天", value: stats.today, tone: "bg-amber-100 text-amber-700" },
            { label: "逾期", value: stats.overdue, tone: "bg-violet-100 text-violet-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/80 bg-white/70 p-3 text-center shadow-[0_12px_35px_rgba(120,80,50,0.10)] backdrop-blur">
              <div className={`mx-auto mb-1 grid h-10 w-10 place-items-center rounded-2xl text-lg font-black ${stat.tone}`}>{stat.value}</div>
              <div className="text-xs font-bold text-stone-500">{stat.label}</div>
            </div>
          ))}
        </section>

        <label className="mb-4 flex min-h-14 w-full items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 shadow-[0_12px_35px_rgba(120,80,50,0.10)] backdrop-blur">
          <Search className="h-5 w-5 text-rose-300" />
          <input
            type="text"
            placeholder="搜索猫窝里的任务..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-stone-800 outline-none placeholder:text-stone-400"
          />
        </label>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", "today", "upcoming", "overdue", "completed"] as FilterType[]).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                filter === item
                  ? "bg-stone-900 text-white shadow-[0_10px_28px_rgba(39,39,42,0.22)]"
                  : "border border-white/80 bg-white/70 text-stone-500"
              }`}
            >
              <PawPrint className="h-4 w-4" />
              {filterLabels[item]}
            </button>
          ))}
        </nav>

        {categories.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-stone-400">分类</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                  selectedCategory === null ? "bg-rose-400 text-white" : "border border-white/80 bg-white/70 text-stone-500"
                }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-black text-stone-500"
                  style={{
                    color: selectedCategory === category.id ? category.color : undefined,
                    boxShadow: selectedCategory === category.id ? `inset 0 0 0 2px ${category.color}55` : undefined,
                  }}
                >
                  <Folder className="h-4 w-4" />
                  {category.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {allTags.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-stone-400">标签</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${
                    selectedTag === tag ? "bg-violet-400 text-white" : "border border-white/80 bg-white/70 text-stone-500"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
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
            filteredTasks.map((task) => (
              <article key={task.id} className="rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-[0_14px_42px_rgba(120,80,50,0.12)] backdrop-blur">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="mt-1 shrink-0 text-rose-300 transition hover:text-rose-500"
                    aria-label={task.completed ? "标记为未完成" : "标记为完成"}
                  >
                    {task.completed ? <CheckCircle2 className="h-7 w-7 text-emerald-400" /> : <Circle className="h-7 w-7" />}
                  </button>

                  <button type="button" onClick={() => openEditTaskForm(task)} className="min-w-0 flex-1 text-left" aria-label="编辑任务">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className={`text-base font-black ${task.completed ? "text-stone-400 line-through" : "text-stone-900"}`}>{task.title}</h3>
                      <Pencil className="h-4 w-4 shrink-0 text-rose-300" />
                    </div>
                    {task.description && <p className="mb-3 text-sm font-medium leading-6 text-stone-500">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-black text-white"
                        style={{ backgroundColor: getCategoryColor(task.category) }}
                      >
                        {categories.find((category) => category.id === task.category)?.name}
                      </span>
                      {task.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-500">
                          #{tag}
                        </span>
                      ))}
                      {task.dueDate && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${isOverdue(task.dueDate) && !task.completed ? "bg-rose-100 text-rose-500" : "bg-sky-100 text-sky-500"}`}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.reminderTime && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-600">
                          <Clock className="h-3 w-3" />
                          {task.reminderTime}
                        </span>
                      )}
                    </div>
                  </button>

                  <button onClick={() => handleDeleteTask(task.id)} className="shrink-0 rounded-2xl bg-rose-50 p-2 text-rose-300 transition hover:bg-rose-100 hover:text-rose-500" aria-label="删除任务">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <button
          onClick={openNewTaskForm}
          className="fixed bottom-7 right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-amber-300 text-white shadow-[0_16px_36px_rgba(251,113,133,0.38)] transition active:scale-95"
          aria-label="新建任务"
        >
          <Plus className="h-8 w-8" />
        </button>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/30 px-3 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-[34px] border border-white/80 bg-[#fffaf3] p-5 pb-8 shadow-[0_-22px_70px_rgba(120,80,50,0.20)]">
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
                  <FieldLabel label="提醒时间">
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
