export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  dueDate?: string;
  reminderTime?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

const TASKS_KEY = "tasks_v1";
const CATEGORIES_KEY = "categories_v1";
const TAGS_KEY = "tags_v1";

// Tasks
export const getTasks = (): Task[] => {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTasks = (tasks: Task[]): void => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const addTask = (task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task => {
  const newTask: Task = {
    ...task,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const tasks = getTasks();
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | null => {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[index];
};

export const deleteTask = (id: string): boolean => {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
};

// Categories
export const getCategories = (): Category[] => {
  const data = localStorage.getItem(CATEGORIES_KEY);
  return data ? JSON.parse(data) : getDefaultCategories();
};

export const getDefaultCategories = (): Category[] => [
  { id: "work", name: "工作", color: "#8B5CF6" },
  { id: "personal", name: "个人", color: "#06B6D4" },
  { id: "health", name: "健康", color: "#10B981" },
  { id: "shopping", name: "购物", color: "#F59E0B" },
];

export const saveCategories = (categories: Category[]): void => {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const addCategory = (name: string, color: string): Category => {
  const newCategory: Category = {
    id: Date.now().toString(),
    name,
    color,
  };
  const categories = getCategories();
  categories.push(newCategory);
  saveCategories(categories);
  return newCategory;
};

// Tags
export const getTags = (): string[] => {
  const data = localStorage.getItem(TAGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTags = (tags: string[]): void => {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

export const addTag = (tag: string): void => {
  const tags = getTags();
  if (!tags.includes(tag)) {
    tags.push(tag);
    saveTags(tags);
  }
};

export const getAllTagsFromTasks = (): string[] => {
  const tasks = getTasks();
  const tagsSet = new Set<string>();
  tasks.forEach((task) => {
    task.tags.forEach((tag) => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
};
