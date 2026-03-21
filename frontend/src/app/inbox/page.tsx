'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { formatRelativeTime } from '@/lib/utils';
import { notificationsApi, type ApiNotification } from '@/lib/apiClient';
import {
  Bell, MessageSquare, UserCheck, AlertTriangle,
  CheckCircle2, Activity, CheckCheck, Loader2,
  Inbox as InboxIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
type NotifType =
  | 'task_assigned'
  | 'mention_description'
  | 'mention_chat'
  | 'chat_message'
  | 'task_overdue'
  | 'status_changed';

interface TypeMeta {
  Icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

type FilterKey = 'all' | 'unread' | 'read';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Config                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
const TYPE_META: Record<NotifType, TypeMeta> = {
  task_assigned: { Icon: UserCheck, color: '#16a34a', bg: 'rgba(22,163,74,0.12)', label: 'Task Assigned' },
  mention_description: { Icon: Bell, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', label: 'Mentioned' },
  mention_chat: { Icon: MessageSquare, color: '#2563eb', bg: 'rgba(37,99,235,0.12)', label: 'Chat Mention' },
  chat_message: { Icon: MessageSquare, color: '#2563eb', bg: 'rgba(37,99,235,0.12)', label: 'Message' },
  task_overdue: { Icon: AlertTriangle, color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'Overdue' },
  status_changed: { Icon: Activity, color: '#d97706', bg: 'rgba(217,119,6,0.12)', label: 'Status Changed' },
};

const DEFAULT_META: TypeMeta = {
  Icon: Bell, color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Notification',
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function InboxPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /* Theme init */
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('tf-theme', next);
  };

  /* Data */
  useEffect(() => {
    notificationsApi
      .list()
      .then(({ notifications: list }) => setNotifications(list))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await notificationsApi.markAllRead().catch(() => { });
  };

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await notificationsApi.markRead(id).catch(() => { });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  /* ── Loading state ── */
  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ib-root">
          <TopBar title="Inbox" />
          <div className="ib-loader">
            <Loader2 size={20} className="ib-spin" />
            <span>Loading notifications…</span>
          </div>
        </div>
      </>
    );
  }

  /* ── Main render ── */
  return (
    <>
      <style>{CSS}</style>
      <div className="ib-root">
        <TopBar
          title="Inbox"
          actions={
            unreadCount > 0 ? (
              <button onClick={markAllRead} className="ib-markall-btn" type="button">
                <CheckCheck size={13} />
                Mark all read
              </button>
            ) : undefined
          }
        />

        {/* Body */}
        <div className="ib-body">

          {/* Stats */}
          <div className="ib-stats">
            <StatChip label="Total" count={notifications.length} color="#2563eb" bg="rgba(37,99,235,0.10)" />
            <StatChip label="Unread" count={unreadCount} color="#dc2626" bg="rgba(220,38,38,0.10)" />
            <StatChip label="Read" count={readCount} color="#16a34a" bg="rgba(22,163,74,0.10)" />
          </div>

          {/* Filter tabs */}
          <div className="ib-filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`ib-ftab${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Empty — no notifications at all */}
          {notifications.length === 0 && (
            <EmptyState
              icon={<InboxIcon size={28} />}
              title="All clear!"
              desc="No notifications yet. You're all caught up."
            />
          )}

          {/* Empty — filter has no results */}
          {filtered.length === 0 && notifications.length > 0 && (
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="Nothing here"
              desc={`No ${filter} notifications to show.`}
            />
          )}

          {/* List */}
          <div className="ib-list">
            <AnimatePresence>
              {filtered.map((n, i) => {
                const meta = (TYPE_META as Record<string, TypeMeta>)[n.type] ?? DEFAULT_META;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <NotifCard
                      n={n}
                      meta={meta}
                      onRead={() => markRead(n.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatChip({
  label, count, color, bg,
}: { label: string; count: number; color: string; bg: string }) {
  return (
    <div
      className="ib-stat-chip"
      style={{ background: bg } as CSSProperties}
    >
      <span className="ib-stat-count" style={{ color } as CSSProperties}>{count}</span>
      <span className="ib-stat-label">{label}</span>
    </div>
  );
}

function EmptyState({
  icon, title, desc,
}: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="ib-empty">
      <div className="ib-empty-icon">{icon}</div>
      <h3 className="ib-empty-title">{title}</h3>
      <p className="ib-empty-desc">{desc}</p>
    </div>
  );
}

function NotifCard({
  n, meta, onRead,
}: { n: ApiNotification; meta: TypeMeta; onRead: () => void }) {
  const { Icon } = meta;
  return (
    <div
      className={`ib-notif-card${n.is_read ? ' is-read' : ' is-unread'}`}
      onClick={onRead}
      onKeyDown={(e) => e.key === 'Enter' && onRead()}
      role="button"
      tabIndex={0}
    >
      {/* Unread left bar */}
      {!n.is_read && <span className="ib-unread-bar" />}

      {/* Icon box */}
      <span className="ib-notif-icon" style={{ background: meta.bg } as CSSProperties}>
        <Icon size={15} style={{ color: meta.color } as CSSProperties} />
      </span>

      {/* Content */}
      <div className="ib-notif-content">
        <div className="ib-notif-top">
          <span
            className="ib-type-badge"
            style={{ color: meta.color, background: meta.bg } as CSSProperties}
          >
            {meta.label}
          </span>
          {!n.is_read && <span className="ib-unread-dot" />}
        </div>
        <p className={`ib-notif-msg${n.is_read ? ' read' : ''}`}>
          {n.message || n.type.replace(/_/g, ' ')}
        </p>
        <span className="ib-notif-time">{formatRelativeTime(n.created_at)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CSS — scoped class names to avoid collisions, no CSS custom props on JSX   */
/* ─────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Tokens (light) ── */
.ib-root {
  --ib-font:       'Plus Jakarta Sans', 'Inter', sans-serif;
  --ib-bg:         #f0f4f8;
  --ib-surface:    #ffffff;
  --ib-elevated:   #f7f9fc;
  --ib-overlay:    #eef2f7;
  --ib-txt:        #0f172a;
  --ib-txt2:       #475569;
  --ib-muted:      #94a3b8;
  --ib-border:     rgba(15,23,42,0.08);
  --ib-border2:    rgba(15,23,42,0.14);
  --ib-border3:    rgba(15,23,42,0.24);
  --ib-accent:     #2563eb;
  --ib-acc-soft:   rgba(37,99,235,0.10);
  --ib-radius:     10px;
  --ib-radius-sm:  6px;
  --ib-shadow:     0 1px 4px rgba(15,23,42,0.10);
  --ib-shadow-md:  0 4px 16px rgba(15,23,42,0.10);
  --ib-t:          150ms cubic-bezier(.4,0,.2,1);

  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--ib-font);
  background: var(--ib-bg);
  position: relative;
  color: var(--ib-txt);
}

/* ── Tokens (dark) ── */
html.dark .ib-root {
  --ib-bg:         #0b1120;
  --ib-surface:    #111827;
  --ib-elevated:   #1c2333;
  --ib-overlay:    #243049;
  --ib-txt:        #f1f5f9;
  --ib-txt2:       #94a3b8;
  --ib-muted:      #64748b;
  --ib-border:     rgba(255,255,255,0.06);
  --ib-border2:    rgba(255,255,255,0.11);
  --ib-border3:    rgba(255,255,255,0.20);
  --ib-accent:     #3b82f6;
  --ib-acc-soft:   rgba(59,130,246,0.12);
  --ib-shadow:     0 1px 4px rgba(0,0,0,0.40);
  --ib-shadow-md:  0 4px 16px rgba(0,0,0,0.36);
}

/* ── Mark-all btn ── */
.ib-markall-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: var(--ib-elevated);
  border: 1px solid var(--ib-border2);
  border-radius: var(--ib-radius-sm);
  color: var(--ib-txt2);
  font-size: 12.5px; font-weight: 600;
  font-family: var(--ib-font);
  cursor: pointer;
  transition: all var(--ib-t);
}
.ib-markall-btn:hover {
  background: var(--ib-acc-soft);
  border-color: var(--ib-accent);
  color: var(--ib-accent);
}

/* ── Body ── */
.ib-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--ib-bg);
}

/* ── Stats ── */
.ib-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.ib-stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 22px;
  border-radius: var(--ib-radius);
  border: 1px solid rgba(0,0,0,0.04);
  min-width: 80px;
}
html.dark .ib-stat-chip { border-color: rgba(255,255,255,0.06); }
.ib-stat-count {
  font-size: 24px; font-weight: 800;
  letter-spacing: -0.04em; line-height: 1;
  font-family: var(--ib-font);
}
.ib-stat-label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--ib-muted);
}

/* ── Filter bar ── */
.ib-filter-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--ib-elevated);
  border: 1px solid var(--ib-border);
  border-radius: var(--ib-radius);
  padding: 4px;
  width: fit-content;
}
.ib-ftab {
  padding: 7px 18px;
  border-radius: calc(var(--ib-radius) - 3px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--ib-muted);
  font-size: 13px; font-weight: 600;
  font-family: var(--ib-font);
  cursor: pointer;
  transition: all var(--ib-t);
}
.ib-ftab:hover { color: var(--ib-txt); }
.ib-ftab.active {
  background: var(--ib-surface);
  color: var(--ib-accent);
  border-color: var(--ib-border2);
  box-shadow: var(--ib-shadow);
}

/* ── Empty ── */
.ib-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center;
}
.ib-empty-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--ib-elevated);
  border: 1px solid var(--ib-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--ib-muted); margin-bottom: 16px;
}
.ib-empty-title {
  font-size: 16px; font-weight: 700;
  color: var(--ib-txt2); margin-bottom: 6px;
  font-family: var(--ib-font);
}
.ib-empty-desc { font-size: 13.5px; color: var(--ib-muted); line-height: 1.5; }

/* ── List ── */
.ib-list { display: flex; flex-direction: column; gap: 6px; }

/* ── Notif card ── */
.ib-notif-card {
  display: flex; align-items: flex-start; gap: 13px;
  padding: 14px 18px;
  background: var(--ib-surface);
  border: 1px solid var(--ib-border);
  border-radius: var(--ib-radius);
  cursor: pointer;
  transition: all var(--ib-t);
  position: relative; overflow: hidden;
}
.ib-notif-card.is-unread {
  background: var(--ib-elevated);
  border-color: var(--ib-border2);
}
.ib-notif-card:hover {
  border-color: var(--ib-border3);
  box-shadow: var(--ib-shadow);
  transform: translateY(-1px);
}
.ib-notif-card:focus-visible {
  outline: 2px solid var(--ib-accent);
  outline-offset: 2px;
}

/* Unread bar */
.ib-unread-bar {
  position: absolute; left: 0; top: 10px; bottom: 10px;
  width: 3px; border-radius: 0 3px 3px 0;
  background: var(--ib-accent);
  display: block;
}

/* Icon box */
.ib-notif-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: var(--ib-radius-sm);
  display: flex; align-items: center; justify-content: center;
}

/* Content */
.ib-notif-content { flex: 1; min-width: 0; }
.ib-notif-top {
  display: flex; align-items: center; gap: 8px; margin-bottom: 5px;
}
.ib-type-badge {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  padding: 2px 8px; border-radius: 99px;
  font-family: var(--ib-font);
}
.ib-unread-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--ib-accent); flex-shrink: 0; margin-left: auto;
  display: inline-block;
}
.ib-notif-msg {
  font-size: 13.5px; font-weight: 600;
  color: var(--ib-txt); line-height: 1.5;
  margin: 0 0 4px; word-break: break-word;
  font-family: var(--ib-font);
}
.ib-notif-msg.read { font-weight: 400; color: var(--ib-txt2); }
.ib-notif-time {
  font-size: 11.5px; color: var(--ib-muted); font-weight: 500;
}

/* ── Loader ── */
.ib-loader {
  flex: 1; display: flex; align-items: center;
  justify-content: center; gap: 10px;
  font-size: 14px; color: var(--ib-muted); font-family: var(--ib-font);
}
.ib-spin { animation: ib-spin 1s linear infinite; }
@keyframes ib-spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 640px) {
  .ib-body { padding: 14px; }
  .ib-stats { gap: 8px; }
  .ib-stat-chip { padding: 10px 14px; min-width: 70px; }
  .ib-stat-count { font-size: 20px; }
  .ib-filter-bar { width: 100%; }
  .ib-ftab { flex: 1; text-align: center; padding: 7px 6px; font-size: 12px; }
  .ib-notif-card { padding: 11px 13px; gap: 10px; }
  .ib-notif-icon { width: 30px; height: 30px; }
}
`;