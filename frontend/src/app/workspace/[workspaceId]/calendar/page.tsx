'use client';

import { useState, CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { useUIStore } from '@/stores/uiStore';
import { projectsApi, tasksApi, type ApiTask } from '@/lib/apiClient';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const PRIORITY_STYLE: Record<string, { color: string; bg: string; stripe: string }> = {
  urgent: { color: '#dc2626', bg: 'rgba(220,38,38,0.09)', stripe: '#dc2626' },
  high: { color: '#ea580c', bg: 'rgba(234,88,12,0.09)', stripe: '#ea580c' },
  medium: { color: '#2563eb', bg: 'rgba(37,99,235,0.09)', stripe: '#2563eb' },
  low: { color: '#64748b', bg: 'rgba(100,116,139,0.09)', stripe: '#94a3b8' },
};

async function fetchWorkspaceTasks(workspaceId: string): Promise<ApiTask[]> {
  const projects = await projectsApi.listByWorkspace(workspaceId);
  const taskArrays = await Promise.all(
    projects.map((p) => tasksApi.listByProject(p.id).catch(() => [] as ApiTask[])),
  );
  return taskArrays.flat();
}

export default function WorkspaceCalendarPage() {
  const params = useParams();
  const workspaceId = params?.workspaceId as string;
  const { openTaskPanel } = useUIStore();
  const [cursor, setCursor] = useState(() => new Date());

  const { data, isPending } = useQuery({
    queryKey: ['workspace-calendar-tasks', workspaceId],
    queryFn: () => fetchWorkspaceTasks(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
    gcTime: 300_000,
    placeholderData: (prev) => prev,
  });

  const tasks = data ?? [];
  const today = new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  const tasksByDay: Record<number, ApiTask[]> = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const d = new Date(t.due_date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    const day = d.getDate();
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(t);
  });

  const initialLoad = !!workspaceId && isPending && data === undefined;

  return (
    <>
      <style>{CSS}</style>
      <div className="wcal-root">
        <TopBar title="Calendar" />
        <div className="wcal-body">
          {initialLoad ? (
            <div className="wcal-loader">
              <Loader2 size={20} className="wcal-spin" />
              <span>Loading calendar…</span>
            </div>
          ) : (
            <>
              <div className="wcal-nav">
                <button
                  type="button"
                  className="wcal-nav-btn"
                  onClick={() => setCursor(new Date(year, month - 1, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <h1 className="wcal-title">{monthLabel}</h1>
                <button
                  type="button"
                  className="wcal-nav-btn"
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="wcal-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="wcal-dow">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`e-${i}`} className="wcal-cell wcal-cell-empty" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayTasks = tasksByDay[day] ?? [];
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`wcal-cell${isToday ? ' today' : ''}${dayTasks.length ? ' has-tasks' : ''}`}
                    >
                      <div className="wcal-day-row">
                        <span className={`wcal-day-num${isToday ? ' today-num' : ''}`}>{day}</span>
                        {dayTasks.length > 0 && (
                          <span className="wcal-dot" title={`${dayTasks.length} task(s)`} />
                        )}
                      </div>
                      {dayTasks.slice(0, 2).map((t) => {
                        const ps = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.low;
                        return (
                          <div
                            key={t.id}
                            className="wcal-task-chip"
                            role="button"
                            tabIndex={0}
                            onClick={() => openTaskPanel(t.id)}
                            onKeyDown={(e) => e.key === 'Enter' && openTaskPanel(t.id)}
                            style={
                              {
                                borderLeftColor: ps.stripe,
                                background: ps.bg,
                                color: ps.color,
                              } as CSSProperties
                            }
                          >
                            {t.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <span className="wcal-more">+{dayTasks.length - 2} more</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.wcal-root {
  --wcal-font: 'Plus Jakarta Sans', 'Inter', sans-serif;
  --wcal-bg: #f0f4f8;
  --wcal-surface: #ffffff;
  --wcal-elev: #f7f9fc;
  --wcal-txt: #0f172a;
  --wcal-txt2: #475569;
  --wcal-muted: #94a3b8;
  --wcal-border: rgba(15,23,42,0.08);
  --wcal-border2: rgba(15,23,42,0.14);
  --wcal-accent: #2563eb;
  --wcal-radius: 10px;
  --wcal-radius-sm: 6px;
  --wcal-shadow: 0 1px 4px rgba(15,23,42,0.10);
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--wcal-font);
  background: var(--wcal-bg);
  color: var(--wcal-txt);
}
html.dark .wcal-root {
  --wcal-bg: #0b1120;
  --wcal-surface: #111827;
  --wcal-elev: #1c2333;
  --wcal-txt: #f1f5f9;
  --wcal-txt2: #94a3b8;
  --wcal-muted: #64748b;
  --wcal-border: rgba(255,255,255,0.06);
  --wcal-border2: rgba(255,255,255,0.12);
  --wcal-accent: #3b82f6;
  --wcal-shadow: 0 1px 4px rgba(0,0,0,0.40);
}
.wcal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 28px;
}
.wcal-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 200px;
  color: var(--wcal-muted);
  font-size: 14px;
  font-weight: 600;
}
.wcal-spin { animation: wcal-spin 1s linear infinite; }
@keyframes wcal-spin { to { transform: rotate(360deg); } }
.wcal-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 18px;
}
.wcal-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--wcal-radius-sm);
  border: 1px solid var(--wcal-border2);
  background: var(--wcal-surface);
  color: var(--wcal-txt2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
}
.wcal-nav-btn:hover {
  border-color: var(--wcal-accent);
  color: var(--wcal-accent);
  background: rgba(37,99,235,0.08);
}
html.dark .wcal-nav-btn:hover {
  background: rgba(59,130,246,0.12);
}
.wcal-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}
.wcal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.wcal-dow {
  padding: 8px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--wcal-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.wcal-cell {
  min-height: 88px;
  padding: 6px 7px;
  background: var(--wcal-surface);
  border: 1px solid var(--wcal-border);
  border-radius: var(--wcal-radius-sm);
  box-shadow: var(--wcal-shadow);
}
.wcal-cell-empty {
  background: transparent;
  border: none;
  box-shadow: none;
  min-height: 0;
}
.wcal-cell.today {
  border-color: var(--wcal-accent);
}
.wcal-day-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 4px;
}
.wcal-day-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
  color: var(--wcal-txt2);
}
.wcal-day-num.today-num {
  background: var(--wcal-accent);
  color: white;
  font-weight: 800;
}
.wcal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wcal-accent);
  flex-shrink: 0;
  opacity: 0.85;
}
.wcal-task-chip {
  padding: 2px 5px;
  border-radius: 3px;
  border-left: 2px solid transparent;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  transition: opacity 150ms ease;
}
.wcal-task-chip:hover { opacity: 0.85; }
.wcal-more {
  font-size: 10px;
  color: var(--wcal-muted);
  display: block;
  margin-top: 2px;
}
@media (max-width: 640px) {
  .wcal-body { padding: 14px; }
  .wcal-cell { min-height: 72px; }
}
`;
