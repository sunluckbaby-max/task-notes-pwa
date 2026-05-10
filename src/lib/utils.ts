import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function formatTime(time: string): string {
  return time;
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function isToday(date: string): boolean {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
}

export function isTomorrow(date: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = new Date(date);
  return d.toDateString() === tomorrow.toDateString();
}
