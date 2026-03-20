import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import { Priority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isPast(new Date(dateStr)) && !isToday(new Date(dateStr));
}

export function isDueToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isToday(new Date(dateStr));
}

export function isDueThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  return isThisWeek(new Date(dateStr), { weekStartsOn: 1 });
}

export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(d, 'MMM d');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; border: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444', border: 'border-l-red-500', bg: 'bg-red-500/10' },
  high: { label: 'High', color: '#f97316', border: 'border-l-orange-500', bg: 'bg-orange-500/10' },
  medium: { label: 'Medium', color: '#3b82f6', border: 'border-l-blue-500', bg: 'bg-blue-500/10' },
  low: { label: 'Low', color: '#6b7280', border: 'border-l-gray-400', bg: 'bg-gray-400/10' },
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
