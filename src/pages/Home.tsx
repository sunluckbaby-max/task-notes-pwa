/**
 * Design: Dark Tech Craft - iPhone Style
 * - Background: Deep space black (#0F0F13)
 * - Primary: Purple (#8B5CF6)
 * - Cards: Glassmorphism (backdrop-blur, semi-transparent)
 * - Typography: Space Grotesk (headings) + Noto Sans SC (body)
 * - Layout: Mobile-first, max-width 430px, centered
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Bell, Tag, Folder, Search, X, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getTasks, addTask, updateTask, deleteTask, getCategories, getAllTagsFromTasks, Task } from "@/lib/storage";
import { formatDate, isToday, isTomorrow, isOverdue } from "@/lib/utils";

type FilterType = "all" | "today" | "upcoming" | "completed" | "overdue";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories] = useState(getCategories());
  const [allTags] = useState(getAllTagsFromTasks());
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "work",
    tags: "",
    dueDate: "",
    reminderTime: "",
  });

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "today") return task.dueDate && isToday(task.dueDate) && !task.completed;
    if (filter === "upcoming") return task.dueDate && !task.completed && !isToday(task.dueDate);
    if (filter === "overdue") return task.dueDate && isOverdue(task.dueDate) && !task.completed;
    if (!task.completed) return true;
    return false;
  })
    .filter((task) => !selectedCategory || task.category === selectedCategory)
    .filter((task) => !selectedTag || task.tags.includes(selectedTag))
    .filter((task) => !searchText || task.title.toLowerCase().includes(searchText.toLowerCase()) || task.description.toLowerCase().includes(searchText.toLowerCase()));

  const handleAddTask = () => {
    if (!formData.title.trim()) {
      toast.error("请输入任务标题");
      return;
    }
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    addTask({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      tags: tags,
      dueDate: formData.dueDate,
      reminderTime: formData.reminderTime,
      completed: false,
    });
    setTasks(getTasks());
    setFormData({ title: "", description: "", category: "work", tags: "", dueDate: "", reminderTime: "" });
    setShowForm(false);
    toast.success("任务已添加");
  };

  const handleToggleTask = (id: string, completed: boolean) => {
    updateTask(id, { completed: !completed });
    setTasks(getTasks());
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setTasks(getTasks());
    toast.success("任务已删除");
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || "#8B5CF6";
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    today: tasks.filter((t) => t.dueDate && isToday(t.dueDate) && !t.completed).length,
    overdue: tasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && !t.completed).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F13] via-[#1a1a2e] to-[#0F0F13] flex items-start justify-center pt-4 pb-20">
      <div className="w-full max-w-[430px] px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-1">任务记事本</h1>
          <p className="text-slate-400 text-sm">管理你的每日任务和提醒</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "总计", value: stats.total, color: "from-blue-600 to-blue-500" },
            { label: "完成", value: stats.completed, color: "from-emerald-600 to-emerald-500" },
            { label: "今天", value: stats.today, color: "from-orange-600 to-orange-500" },
            { label: "逾期", value: stats.overdue, color: "from-red-600 to-red-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center hover:bg-white/8 transition-all"
            >
              <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {(["all", "today", "upcoming", "overdue", "completed"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8"
              }`}
            >
              {f === "all" ? "全部" : f === "today" ? "今天" : f === "upcoming" ? "即将" : f === "overdue" ? "逾期" : "已完成"}
            </button>
          ))}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">分类</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8"
                }`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id ? "text-white" : "text-slate-400"
                  }`}
                  style={{
                    borderColor: selectedCategory === cat.id ? cat.color : "rgba(255,255,255,0.1)",
                    backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                  }}
                >
                  <Folder className="w-4 h-4" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">标签</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedTag === tag
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3 mb-8">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-400 mb-2 font-medium">没有任务</p>
              <p className="text-slate-500 text-sm">点击右下角的 + 按钮添加新任务</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all group"
              >
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3
                        className={`font-semibold text-base ${
                          task.completed ? "text-slate-500 line-through" : "text-slate-100"
                        }`}
                      >
                        {task.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-slate-400 text-sm mb-3">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{
                          backgroundColor: getCategoryColor(task.category) + "30",
                          borderLeft: `3px solid ${getCategoryColor(task.category)}`,
                        }}
                      >
                        {categories.find((c) => c.id === task.category)?.name}
                      </span>
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30"
                        >
                          #{tag}
                        </span>
                      ))}
                      {task.dueDate && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            isOverdue(task.dueDate) && !task.completed
                              ? "bg-red-600/20 text-red-300 border border-red-500/30"
                              : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.reminderTime && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-600/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Add Button */}
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => setShowForm(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* Modal Overlay */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
            <div className="w-full bg-gradient-to-t from-[#0F0F13] to-[#1a1a2e] rounded-t-3xl border-t border-white/10 p-6 pb-8 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">新建任务</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    任务标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="输入任务标题..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">描述</label>
                  <textarea
                    placeholder="输入任务描述..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-100">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">标签</label>
                  <input
                    type="text"
                    placeholder="用逗号分隔，例如：紧急, 重要"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">截止日期</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                {/* Reminder Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">提醒时间</label>
                  <input
                    type="time"
                    value={formData.reminderTime}
                    onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 font-medium hover:bg-white/10 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 rounded-xl text-white font-medium shadow-lg shadow-purple-500/20 transition-all"
                  >
                    创建任务
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
