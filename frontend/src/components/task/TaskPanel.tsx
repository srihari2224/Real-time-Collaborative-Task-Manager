'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, Flag, User, Tag, CheckSquare, Plus, Clock, FileText, MessageSquare, Paperclip, Activity } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { TASKS, ACTIVITY_LOGS, CURRENT_USER } from '@/data/seed';
import { Task, Priority } from '@/types';
import { ChatTab } from '@/components/chat/ChatTab';
import { Avatar, PresenceAvatars } from '@/components/ui/Avatar';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate, isOverdue, formatRelativeTime, PRIORITY_CONFIG, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <FileText size={13} /> },
  { key: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
  { key: 'attachments', label: 'Attachments', icon: <Paperclip size={13} /> },
  { key: 'activity', label: 'Activity', icon: <Activity size={13} /> },
] as const;

export function TaskPanel() {
  const { taskPanelOpen, activePanelTaskId, activePanelTab, closeTaskPanel, setActivePanelTab } = useUIStore();
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    if (activePanelTaskId) {
      const found = TASKS.find((t) => t.id === activePanelTaskId) || null;
      setTask(found);
      if (found) setTitle(found.title);
    }
  }, [activePanelTaskId]);

  if (!task) return null;

  const completedSubtasks = task.subtasks.filter((s) => s.is_completed).length;
  const subtaskProgress = task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : 0;
  const overdue = isOverdue(task.due_date);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title !== task.title) toast.success('Title updated', { duration: 1500, id: 'title-update' });
  };

  return (
    <AnimatePresence>
      {taskPanelOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="task-panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTaskPanel}
          />

          {/* Panel */}
          <motion.div
            className="task-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Panel Header */}
            <div style={{ padding: '14px 20px 0', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {/* Priority dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_CONFIG[task.priority].color, flexShrink: 0 }} />

                {/* Editable title */}
                {editingTitle ? (
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid var(--accent)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '3px 8px',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <h2
                    onClick={() => setEditingTitle(true)}
                    style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', cursor: 'text', lineHeight: 1.3, letterSpacing: '-0.01em' }}
                    title="Click to edit"
                  >
                    {title}
                  </h2>
                )}

                <button onClick={closeTaskPanel} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all var(--transition)' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Tabs */}
              <div className="tab-bar" style={{ borderBottom: 'none' }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActivePanelTab(tab.key)}
                    className={`tab-item ${activePanelTab === tab.key ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.key === 'chat' && task.unread_chat_count > 0 && (
                      <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 99, padding: '0 5px', fontSize: 9, fontWeight: 700, minWidth: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {task.unread_chat_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activePanelTab === 'overview' && <OverviewTab task={task} completedSubtasks={completedSubtasks} subtaskProgress={subtaskProgress} overdue={overdue} />}
              {activePanelTab === 'chat' && <ChatTab task={task} />}
              {activePanelTab === 'attachments' && <AttachmentsTab task={task} />}
              {activePanelTab === 'activity' && <ActivityTab taskId={task.id} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ task, completedSubtasks, subtaskProgress, overdue }: { task: Task; completedSubtasks: number; subtaskProgress: number; overdue: boolean }) {
  const [subtasks, setSubtasks] = useState(task.subtasks);
  const [newSubtask, setNewSubtask] = useState('');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [description, setDescription] = useState(task.description || '');

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, is_completed: !s.is_completed } : s));
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: `st-${Date.now()}`, task_id: task.id, title: newSubtask.trim(), is_completed: false, position: prev.length }]);
    setNewSubtask('');
  };

  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Meta fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MetaField label="Assignees" icon={<User size={12} />}>
          <PresenceAvatars users={task.assignees} size={24} />
        </MetaField>

        <MetaField label="Due Date" icon={<Calendar size={12} />}>
          <span style={{ fontSize: 13, fontWeight: 500, color: overdue ? '#ef4444' : 'var(--text-primary)' }}>
            {task.due_date ? formatDate(task.due_date) : 'No date'}
          </span>
        </MetaField>

        <MetaField label="Priority" icon={<Flag size={12} />}>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value as Priority); toast.success('Priority updated', { duration: 1200, id: 'pri' }); }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12.5, padding: '3px 6px', fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
          >
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </MetaField>

        <MetaField label="Labels" icon={<Tag size={12} />}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {task.labels.map((l) => (
              <span key={l.id} style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: l.color + '18', color: l.color, border: `1px solid ${l.color}30` }}>
                {l.name}
              </span>
            ))}
          </div>
        </MetaField>
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description... (Markdown supported)"
          style={{
            width: '100%',
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
            color: 'var(--text-primary)',
            fontSize: 13.5,
            fontFamily: 'var(--font-display)',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'vertical',
            minHeight: 100,
            transition: 'border-color var(--transition)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
        />
      </div>

      {/* Subtasks */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtasks</div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{completedCount}/{subtasks.length}</span>
        </div>

        <ProgressBar value={progress} size="md" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {subtasks.map((subtask) => (
            <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 'var(--radius-sm)', transition: 'background var(--transition)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <button
                onClick={() => toggleSubtask(subtask.id)}
                style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${subtask.is_completed ? 'var(--accent)' : 'var(--border-strong)'}`, background: subtask.is_completed ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all var(--transition)' }}
              >
                {subtask.is_completed && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
              </button>
              <span style={{ fontSize: 13, color: subtask.is_completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: subtask.is_completed ? 'line-through' : 'none', flex: 1 }}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
            placeholder="Add a subtask..."
            className="input"
            style={{ flex: 1, fontSize: 13 }}
          />
          <button onClick={addSubtask} className="btn btn-secondary" style={{ flexShrink: 0, padding: '6px 10px' }}>
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

// ─── Attachments Tab ──────────────────────────────────────────────────────────

function AttachmentsTab({ task }: { task: Task }) {
  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700 }}>Attachments ({task.attachments.length})</h3>
        <button className="btn btn-secondary" style={{ fontSize: 12 }}>
          <Plus size={12} /> Upload
        </button>
      </div>

      {task.attachments.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Paperclip size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No attachments yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Drag and drop files here or click Upload</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {task.attachments.map((att) => (
            <div key={att.id} className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }} className="truncate-1">{att.file_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(att.file_size)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, (log: typeof ACTIVITY_LOGS[0]) => string> = {
  created: () => 'created this task',
  assigned: (l) => `assigned ${l.new_value}`,
  status_changed: (l) => `moved to ${l.new_value}`,
  moved: (l) => `moved to ${l.new_value}`,
  due_date_updated: (l) => `updated due date to ${l.new_value}`,
  priority_changed: (l) => `changed priority to ${l.new_value}`,
};

function ActivityTab({ taskId }: { taskId: string }) {
  const logs = ACTIVITY_LOGS.filter((l) => l.task_id === taskId);

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Activity</h3>

      {logs.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No activity yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {logs.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 20 }}>
              {/* Timeline line */}
              {i < logs.length - 1 && (
                <div style={{ position: 'absolute', left: 12, top: 28, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
              )}

              <Avatar user={log.user} size={24} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{log.user.name}</span>
                {' '}
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {ACTION_LABELS[log.action_type] ? ACTION_LABELS[log.action_type](log) : log.action_type}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatRelativeTime(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
