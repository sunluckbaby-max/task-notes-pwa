/**
 * Design: Dark Tech Craft
 * - Background: Deep space black (#0F0F13)
 * - Primary: Purple (#8B5CF6)
 * - Cards: Glassmorphism (backdrop-blur, semi-transparent)
 * - Typography: Space Grotesk (headings) + Noto Sans SC (body)
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Bell, Tag, Folder, Search, X, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    tags: [] as string[],
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
    addTask({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      tags: formData.tags,
      dueDate: formData.dueDate,
      reminderTime: formData.reminderTime,
      completed: false,
    });
    setTasks(getTasks());
    setFormData({ title: "", description: "", category: "work", tags: [], dueDate: "", reminderTime: "" });
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
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F13] via-[#1a1a2e] to-[#0F0F13] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0F0F13]/80 backdrop-blur-xl">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">任务记事本</h1>
              <p className="text-slate-500 text-sm">管理你的每日任务和提醒</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg shadow-purple-500/30"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "总计", value: stats.total },
              { label: "完成", value: stats.completed },
              { label: "今天", value: stats.today },
              { label: "逾期", value: stats.overdue },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                <div className="text-lg font-bold text-purple-400">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索任务..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {(["all", "today", "upcoming", "overdue", "completed"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "全部" : f === "today" ? "今天" : f === "upcoming" ? "即将" : f === "overdue" ? "逾期" : "已完成"}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 py-6">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">分类</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8"
                }`}
              >
                全部分类
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id ? "text-white border-2" : "text-slate-400 border border-white/10"
                  }`}
                  style={{
                    borderColor: selectedCategory === cat.id ? cat.color : "rgba(255,255,255,0.1)",
                    backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Folder className="w-3.5 h-3.5 inline mr-1.5" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">标签</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8"
                  }`}
                >
                  <Tag className="w-3 h-3 inline mr-1" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-400 mb-2">没有任务</p>
              <p className="text-slate-500 text-sm">点击右上角的 + 按钮添加新任务</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all group animate-slide-up"
              >
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="flex-shrink-0 mt-1 text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className={`font-semibold text-base ${
                          task.completed
                            ? "text-slate-500 line-through"
                            : "text-slate-200"
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
                      <p className="text-slate-400 text-sm mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(task.category) + "40", borderLeft: `2px solid ${getCategoryColor(task.category)}` }}
                      >
                        {categories.find((c) => c.id === task.category)?.name}
                      </span>
                      {task.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30">
                          #{tag}
                        </span>
                      ))}
                      {task.dueDate && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          isOverdue(task.dueDate) && !task.completed
                            ? "bg-red-600/20 text-red-300 border border-red-500/30"
                            : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.reminderTime && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-600/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
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
      </main>

      {/* Add Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-[#1a1a2e] border-t border-white/10 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">新建任务</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">任务标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入任务标题"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入任务描述"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags.join(", ")}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="例如：紧急，重要"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">截止日期</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">提醒时间</label>
                <input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddTask}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                >
                  创建任务
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
