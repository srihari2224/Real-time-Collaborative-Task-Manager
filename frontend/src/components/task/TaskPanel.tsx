'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flag, User, Tag, CheckSquare, Plus, FileText,
  MessageSquare, Paperclip, Activity, Loader2, Trash2
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { tasksApi, type ApiTask, type ApiComment, type ApiAttachment } from '@/lib/apiClient';
import { Priority } from '@/types';
import { ChatTab } from '@/components/chat/ChatTab';
import { PresenceAvatars } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate, isOverdue, formatRelativeTime, PRIORITY_CONFIG, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <FileText size={13} /> },
  { key: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
  { key: 'attachments', label: 'Attachments', icon: <Paperclip size={13} /> },
  { key: 'activity', label: 'Activity', icon: <Activity size={13} /> },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiUserToUser(u: NonNullable<ApiTask['assignee']>) {
  return {
    id: u.id,
    name: u.full_name || u.email,
    email: u.email,
    avatar_url: u.avatar_url ?? undefined,
    created_at: u.created_at,
  };
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TaskPanel() {
  const { taskPanelOpen, activePanelTaskId, activePanelTab, closeTaskPanel, setActivePanelTab } =
    useUIStore();
  const { user } = useAuthStore();

  const [task, setTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  const loadTask = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const t = await tasksApi.get(id);
      setTask(t);
      setTitle(t.title);
    } catch {
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePanelTaskId && taskPanelOpen) {
      loadTask(activePanelTaskId);
    } else {
      setTask(null);
    }
  }, [activePanelTaskId, taskPanelOpen, loadTask]);

  const handleTitleBlur = async () => {
    setEditingTitle(false);
    if (!task || title === task.title) return;
    try {
      const updated = await tasksApi.update(task.id, { title });
      setTask(updated);
      toast.success('Title updated', { duration: 1500, id: 'title-update' });
    } catch {
      setTitle(task.title); // revert
      toast.error('Failed to update title');
    }
  };

  const overdue = isOverdue(task?.due_date ?? undefined);

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
            {loading || !task ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {loading ? 'Loading task...' : 'No task selected'}
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div style={{ padding: '14px 20px 0', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {/* Priority dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280',
                      flexShrink: 0,
                    }} />

                    {/* Editable title */}
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                        style={{
                          flex: 1, background: 'transparent', border: '1px solid var(--accent)',
                          borderRadius: 'var(--radius-sm)', padding: '3px 8px',
                          color: 'var(--text-primary)', fontSize: 15, fontWeight: 700,
                          fontFamily: 'var(--font-display)', outline: 'none',
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

                    <button onClick={closeTaskPanel} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {activePanelTab === 'overview' && (
                    <OverviewTab task={task} overdue={overdue} onUpdate={setTask} currentUser={user} />
                  )}
                  {activePanelTab === 'chat' && (
                    <ChatTab taskId={task.id} currentUserId={(user as any)?.id ?? ''} currentUser={user} />
                  )}
                  {activePanelTab === 'attachments' && (
                    <AttachmentsTab taskId={task.id} />
                  )}
                  {activePanelTab === 'activity' && (
                    <ActivityTab taskId={task.id} />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  task: ApiTask;
  overdue: boolean;
  onUpdate: (task: ApiTask) => void;
  currentUser: any;
}

function OverviewTab({ task, overdue, onUpdate }: OverviewTabProps) {
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<ApiTask['priority']>(task.priority);
  const [savingDesc, setSavingDesc] = useState(false);
  // Local-only subtasks (no backend endpoint for subtasks yet)
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; is_completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  // Sync description & priority if task changes
  useEffect(() => {
    setDescription(task.description ?? '');
    setPriority(task.priority);
  }, [task.id, task.description, task.priority]);

  const saveDescription = async () => {
    if (description === (task.description ?? '')) return;
    setSavingDesc(true);
    try {
      const updated = await tasksApi.update(task.id, { description });
      onUpdate(updated);
      toast.success('Description saved', { duration: 1200, id: 'desc' });
    } catch {
      toast.error('Failed to save description');
    } finally {
      setSavingDesc(false);
    }
  };

  const savePriority = async (p: ApiTask['priority']) => {
    setPriority(p);
    try {
      const updated = await tasksApi.update(task.id, { priority: p });
      onUpdate(updated);
      toast.success('Priority updated', { duration: 1200, id: 'pri' });
    } catch {
      toast.error('Failed to update priority');
      setPriority(task.priority); // revert
    }
  };

  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const assignees = task.assignee
    ? [apiUserToUser(task.assignee)]
    : [];

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Meta fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MetaField label="Assignee" icon={<User size={12} />}>
          {assignees.length > 0 ? (
            <PresenceAvatars users={assignees} size={24} />
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>
          )}
        </MetaField>

        <MetaField label="Due Date" icon={<Calendar size={12} />}>
          <span style={{ fontSize: 13, fontWeight: 500, color: overdue ? '#ef4444' : 'var(--text-primary)' }}>
            {task.due_date ? formatDate(task.due_date) : 'No date'}
          </span>
        </MetaField>

        <MetaField label="Priority" icon={<Flag size={12} />}>
          <select
            value={priority}
            onChange={(e) => savePriority(e.target.value as ApiTask['priority'])}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12.5, padding: '3px 6px', fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
          >
            {(['urgent', 'high', 'medium', 'low'] as ApiTask['priority'][]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p as Priority]?.label ?? p}</option>
            ))}
          </select>
        </MetaField>

        <MetaField label="Status" icon={<Tag size={12} />}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {task.status.replace('_', ' ')}
          </span>
        </MetaField>
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Description
          {savingDesc && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add a description..."
          style={{
            width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)', padding: '10px 12px', color: 'var(--text-primary)',
            fontSize: 13.5, fontFamily: 'var(--font-display)', lineHeight: 1.6, outline: 'none',
            resize: 'vertical', minHeight: 100, transition: 'border-color var(--transition)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        />
      </div>

      {/* Subtasks (local only) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtasks</div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{completedCount}/{subtasks.length}</span>
        </div>

        {subtasks.length > 0 && <ProgressBar value={progress} size="md" />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 'var(--radius-sm)', transition: 'background var(--transition)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <button
                onClick={() => setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_completed: !s.is_completed } : s))}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSubtask.trim()) {
                setSubtasks((prev) => [...prev, { id: `st-${Date.now()}`, title: newSubtask.trim(), is_completed: false }]);
                setNewSubtask('');
              }
            }}
            placeholder="Add a subtask..."
            className="input"
            style={{ flex: 1, fontSize: 13 }}
          />
          <button
            onClick={() => {
              if (!newSubtask.trim()) return;
              setSubtasks((prev) => [...prev, { id: `st-${Date.now()}`, title: newSubtask.trim(), is_completed: false }]);
              setNewSubtask('');
            }}
            className="btn btn-secondary"
            style={{ flexShrink: 0, padding: '6px 10px' }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

function AttachmentsTab({ taskId }: { taskId: string }) {
  const [attachments, setAttachments] = useState<ApiAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tasksApi.listAttachments(taskId)
      .then(setAttachments)
      .catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleDelete = async (attachmentId: string) => {
    try {
      await tasksApi.deleteAttachment(taskId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete attachment');
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
      </div>
    );
  }

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700 }}>Attachments ({attachments.length})</h3>
      </div>

      {attachments.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Paperclip size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No attachments yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Upload files from the backend API</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {attachments.map((att) => (
            <div key={att.id} className="card" style={{ padding: 12, position: 'relative' }}>
              <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }} className="truncate-1">{att.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(att.file_size)}</div>
              </a>
              <button
                onClick={() => handleDelete(att.id)}
                style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                title="Delete attachment"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab (uses comments as activity feed) ────────────────────────────

function ActivityTab({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.listComments(taskId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
      </div>
    );
  }

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Activity</h3>

      {comments.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
          No activity yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {comments.map((comment, i) => {
            const name = comment.user?.full_name || comment.user?.email || 'Unknown';
            const initial = name[0]?.toUpperCase() ?? '?';
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 20 }}>
                {i < comments.length - 1 && (
                  <div style={{ position: 'absolute', left: 12, top: 28, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
                )}
                <div className="avatar" style={{ width: 24, height: 24, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 10, flexShrink: 0 }}>
                  {comment.user?.avatar_url ? (
                    <img src={comment.user.avatar_url} alt={initial} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  ) : initial}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
                  {' '}
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>commented</span>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', marginTop: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', lineHeight: 1.5 }}>
                    {comment.content}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatRelativeTime(comment.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
