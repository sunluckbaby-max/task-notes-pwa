/**
 * Design: Dark Tech Craft - iPhone Style
 * - Background: Deep space black (#0F0F13)
 * - Primary: Purple (#8B5CF6)
 * - Cards: Glassmorphism (backdrop-blur, semi-transparent)
 * - Typography: Space Grotesk (headings) + Noto Sans SC (body)
 * - Layout: Mobile-first, max-width 430px, centered
 */

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Tag, Folder, Search, X, Clock, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getTasks, addTask, updateTask, deleteTask, getCategories, Task } from "@/lib/storage";
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

  const handleSaveTask = () => {
    if (!formData.title.trim()) {
      toast.error("请输入任务标题");
      return;
    }

    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const payload = {
      title: formData.title.trim(),
