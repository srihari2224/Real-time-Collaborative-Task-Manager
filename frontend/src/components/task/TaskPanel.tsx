'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flag, Tag, CheckSquare, Plus, FileText,
  MessageSquare, Paperclip, Loader2, Trash2, Link2, ExternalLink,
  Users, ChevronRight
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import {
  tasksApi, type ApiTask, type ApiComment, type ApiAttachment,
  type ApiSubtask, type ApiLink, type ApiAssignee,
} from '@/lib/apiClient';
import { Priority } from '@/types';
import { ChatTab } from '@/components/chat/ChatTab';
import { formatDate, isOverdue, formatRelativeTime, PRIORITY_CONFIG, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <FileText size={13} /> },
  { key: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
  { key: 'attachments', label: 'Files', icon: <Paperclip size={13} /> },
] as const;

export function TaskPanel() {
  const { taskPanelOpen, activePanelTaskId, activePanelTab, closeTaskPanel, setActivePanelTab } =
    useUIStore();
  const { user } = useAuthStore();
  const pathname = usePathname();
  const isMyTasks = pathname === '/my-tasks';

  const [task, setTask] = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    if (activePanelTaskId && taskPanelOpen) loadTask(activePanelTaskId);
    else setTask(null);
  }, [activePanelTaskId, taskPanelOpen, loadTask]);

  useEffect(() => {
    if (!activePanelTaskId) return;
    let mounted = true;
    getSocket().then((s) => {
      s.on('subtask_created', () => { if (mounted) loadTask(activePanelTaskId); });
      s.on('subtask_updated', () => { if (mounted) loadTask(activePanelTaskId); });
      s.on('subtask_deleted', () => { if (mounted) loadTask(activePanelTaskId); });
    }).catch(() => { });
    return () => { mounted = false; };
  }, [activePanelTaskId, loadTask]);

  const handleTitleBlur = async () => {
    setEditingTitle(false);
    if (!task || title === task.title) return;
    try {
      const updated = await tasksApi.update(task.id, { title });
      setTask(updated);
      toast.success('Title updated', { duration: 1500, id: 'title-update' });
    } catch {
      setTitle(task.title);
      toast.error('Failed to update title');
    }
  };

  const handleDeleteTask = () => { if (task) setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    if (!task) return;
    setShowDeleteConfirm(false);
    try {
      await tasksApi.delete(task.id);
      toast.success('Task deleted');
      closeTaskPanel();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const overdue = isOverdue(task?.due_date ?? undefined);

  return (
    <AnimatePresence>
      {taskPanelOpen && (
        <>
          {/* ── Custom delete confirmation modal ── */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                style={{ position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.72)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  style={{ background:'var(--bg-surface)',border:'1px solid var(--border-strong)',padding:24,width:340,maxWidth:'90vw',boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}
                  initial={{ scale:0.95,y:10 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95 }}
                  onClick={e => e.stopPropagation()}
                >
                  <p style={{ fontSize:11,fontWeight:800,color:'#ef4444',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10,fontFamily:'var(--font-mono)' }}>Delete Task?</p>
                  <p style={{ fontSize:13.5,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:20 }}>
                    Permanently remove <strong style={{ color:'var(--text-primary)' }}>"{task?.title}"</strong> and all subtasks, comments, and files?
                  </p>
                  <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ padding:'8px 16px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',color:'var(--text-secondary)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Cancel</button>
                    <button onClick={confirmDelete} style={{ padding:'8px 16px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.4)',color:'#ef4444',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Delete</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="task-panel-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeTaskPanel}
          />
          <motion.div
            className="task-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {loading || !task ? (
              <div className="panel-loading-state">
                <Loader2 size={18} className="spin" />
                <span>{loading ? 'Loading task...' : 'No task selected'}</span>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className="panel-header">
                  <div className="panel-title-row">
                    <div
                      className="panel-priority-dot"
                      style={{ background: PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280' }}
                    />
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                        className="panel-title-input"
                      />
                    ) : (
                      <h2
                        onClick={() => setEditingTitle(true)}
                        className="panel-title"
                        title="Click to edit"
                      >
                        {title}
                      </h2>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!isMyTasks && (
                        <Trash2
                          size={20}
                          strokeWidth={2}
                          role="button"
                          aria-label="Delete Task"
                          tabIndex={0}
                          onClick={handleDeleteTask}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteTask(); }}
                          style={{ cursor: 'pointer', color: 'var(--error)' }}
                        />
                      )}
                      <button className="panel-close-btn" onClick={closeTaskPanel} aria-label="Close panel">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Assignee mini row */}
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="panel-assignee-row">
                      <Users size={11} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ display: 'flex' }}>
                        {task.assignees.slice(0, 5).map((a, i) => (
                          <div
                            key={a.id}
                            title={a.full_name ?? a.email}
                            className="panel-assignee-avatar"
                            style={{ marginLeft: i === 0 ? 0 : -6 }}
                          >
                            {a.avatar_url
                              ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (a.full_name ?? a.email)?.[0]?.toUpperCase()
                            }
                          </div>
                        ))}
                      </div>
                      <span className="panel-assignee-names">
                        {task.assignees.map((a) => a.full_name ?? a.email.split('@')[0]).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Subtask progress */}
                    {(task.subtask_total ?? 0) > 0 && (
                      <div style={{ marginBottom: 10 }} className="section-block">
                        <div className="panel-progress-header">
                          <span>Subtasks</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{task.subtask_done}/{task.subtask_total}</span>
                        </div>
                        <ProgressBar value={((task.subtask_done ?? 0) / (task.subtask_total ?? 1)) * 100} size="sm" />
                      </div>
                    )}

                  {/* Tabs */}
                  <div className="panel-tab-bar">
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActivePanelTab(tab.key)}
                        className={`panel-tab-item ${activePanelTab === tab.key ? 'active' : ''}`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.key === 'chat' && (task as any).unread_chat_count > 0 && (
                          <span className="panel-tab-badge">{(task as any).unread_chat_count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {activePanelTab === 'overview' && (
                    <OverviewTab task={task} overdue={overdue} onUpdate={setTask} />
                  )}
                  {activePanelTab === 'chat' && (
                    <ChatTab taskId={task.id} currentUserId={(user as any)?.id ?? ''} currentUser={user} />
                  )}
                  {activePanelTab === 'attachments' && (
                    <AttachmentsTab taskId={task.id} />
                  )}
                </div>
              </>
            )}
          </motion.div>

          <style jsx global>{`
            .task-panel-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.25);
              backdrop-filter: blur(2px);
              z-index: 400;
            }
            .task-panel {
              position: fixed;
              top: 0;
              right: 0;
              bottom: 0;
              width: 440px;
              max-width: 100vw;
              background: var(--bg-surface);
              border-left: 1px solid var(--border-subtle);
              z-index: 401;
              display: flex;
              flex-direction: column;
              box-shadow: -12px 0 40px rgba(0,0,0,0.1);
            }
            .panel-loading-state {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              color: var(--text-muted);
              font-size: 13px;
            }
            .panel-header {
              padding: 16px 20px 0;
              flex-shrink: 0;
              border-bottom: 1px solid var(--border-subtle);
            }
            .panel-title-row {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 12px;
            }
            .panel-priority-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              flex-shrink: 0;
              margin-top: 6px;
            }
            .panel-title {
              flex: 1;
              font-size: 15px;
              font-weight: 700;
              color: var(--text-primary);
              cursor: text;
              line-height: 1.35;
              letter-spacing: -0.02em;
            }
            .panel-title:hover { color: var(--accent); }
            .panel-title-input {
              flex: 1;
              background: transparent;
              border: 1px solid var(--accent);
              border-radius: var(--radius-sm);
              padding: 3px 8px;
              color: var(--text-primary);
              font-size: 15px;
              font-weight: 700;
              font-family: var(--font-display);
              outline: none;
              letter-spacing: -0.02em;
              box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
            }
            .panel-close-btn {
              width: 28px;
              height: 28px;
              border-radius: var(--radius-sm);
              background: transparent;
              border: none;
              color: var(--text-muted);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              transition: all var(--transition);
            }
            .panel-close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

            .panel-assignee-row {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 10px;
            }
            .panel-assignee-avatar {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: rgba(37,99,235,0.12);
              color: var(--accent);
              font-size: 9px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid var(--bg-surface);
              overflow: hidden;
              flex-shrink: 0;
            }
            .panel-assignee-names {
              font-size: 11px;
              color: var(--text-muted);
              font-weight: 500;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .panel-progress-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: var(--text-muted);
              font-weight: 600;
              margin-bottom: 5px;
              letter-spacing: 0.02em;
            }

            .panel-tab-bar {
              display: flex;
              gap: 0;
              margin-top: 4px;
            }
            .panel-tab-item {
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 9px 14px;
              border: none;
              background: transparent;
              font-family: var(--font-display);
              font-size: 13px;
              font-weight: 600;
              color: var(--text-muted);
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all var(--transition);
              position: relative;
              top: 1px;
              letter-spacing: -0.01em;
            }
            .panel-tab-item:hover { color: var(--text-secondary); }
            .panel-tab-item.active {
              color: var(--accent);
              border-bottom-color: var(--accent);
            }
            .panel-tab-badge {
              font-size: 9px;
              font-weight: 800;
              background: var(--accent);
              color: white;
              border-radius: 99px;
              padding: 1px 5px;
              line-height: 1.4;
            }

            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Shared UI Component: ProgressBar ──────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  size?: 'sm' | 'md';
}

function ProgressBar({ value, label, size = 'sm' }: ProgressBarProps) {
  const h = size === 'sm' ? 5 : 7;

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="progress-bar-bg" style={{ height: h }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ task, overdue, onUpdate }: { task: ApiTask; overdue: boolean; onUpdate: (t: ApiTask) => void }) {
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<ApiTask['priority']>(task.priority);
  const [savingDesc, setSavingDesc] = useState(false);
  const [subtasks, setSubtasks] = useState<ApiSubtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [links, setLinks] = useState<ApiLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    setDescription(task.description ?? '');
    setPriority(task.priority);
  }, [task.id, task.description, task.priority, task.status]);

  useEffect(() => {
    setLoadingSubtasks(true);
    Promise.all([
      tasksApi.listSubtasks(task.id).catch(() => [] as ApiSubtask[]),
      tasksApi.listLinks(task.id).catch(() => [] as ApiLink[]),
    ]).then(([subs, lnks]) => {
      setSubtasks(subs);
      setLinks(lnks);
    }).finally(() => setLoadingSubtasks(false));
  }, [task.id]);

  const saveDescription = async () => {
    if (description === (task.description ?? '')) return;
    setSavingDesc(true);
    try {
      const updated = await tasksApi.update(task.id, { description });
      onUpdate(updated);
      toast.success('Saved', { duration: 1000, id: 'desc' });
    } catch { toast.error('Failed to save'); }
    finally { setSavingDesc(false); }
  };

  const savePriority = async (p: ApiTask['priority']) => {
    setPriority(p);
    try {
      const updated = await tasksApi.update(task.id, { priority: p });
      onUpdate(updated);
      toast.success('Priority updated', { duration: 1000, id: 'pri' });
    } catch { setPriority(task.priority); toast.error('Failed'); }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const s = await tasksApi.createSubtask(task.id, newSubtask.trim());
      setSubtasks((prev) => [...prev, s]);
      setNewSubtask('');
      const updated = await tasksApi.get(task.id).catch(() => null);
      if (updated) onUpdate(updated);
    } catch { toast.error('Failed to add subtask'); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtask: ApiSubtask) => {
    setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_done: !s.is_done } : s));
    try {
      await tasksApi.updateSubtask(task.id, subtask.id, { is_done: !subtask.is_done });
      const updated = await tasksApi.get(task.id).catch(() => null);
      if (updated) onUpdate(updated);
    } catch {
      setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_done: subtask.is_done } : s));
      toast.error('Failed');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    try {
      await tasksApi.deleteSubtask(task.id, subtaskId);
      const updated = await tasksApi.get(task.id).catch(() => null);
      if (updated) onUpdate(updated);
    } catch { toast.error('Failed to delete subtask'); }
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim() || addingLink) return;
    setAddingLink(true);
    try {
      const l = await tasksApi.addLink(task.id, newLinkUrl.trim(), newLinkLabel.trim() || undefined);
      setLinks((prev) => [...prev, l]);
      setNewLinkUrl('');
      setNewLinkLabel('');
      setShowLinkForm(false);
    } catch { toast.error('Failed to add link'); }
    finally { setAddingLink(false); }
  };

  const handleDeleteLink = async (linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    try { await tasksApi.removeLink(task.id, linkId); }
    catch { toast.error('Failed to delete link'); }
  };

  const doneCount = subtasks.filter((s) => s.is_done).length;
  const progress = subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : 0;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Meta grid */}
      <div className="meta-grid">
        <MetaField label="Priority" icon={<Flag size={11} />}>
          <select
            value={priority}
            onChange={(e) => savePriority(e.target.value as ApiTask['priority'])}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: PRIORITY_CONFIG[priority as Priority]?.color ?? 'var(--text-primary)',
              fontSize: 12.5,
              padding: '4px 8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color var(--transition)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
          >
            {(['urgent', 'high', 'medium', 'low'] as ApiTask['priority'][]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p as Priority]?.label ?? p}</option>
            ))}
          </select>
        </MetaField>

        <MetaField label="Status" icon={<Tag size={11} />}>
          <span className="meta-status-badge">
            {task.status.replace('_', ' ')}
          </span>
        </MetaField>

        <MetaField label="Due Date" icon={<Calendar size={11} />}>
          <span style={{ fontSize: 13, fontWeight: 600, color: overdue ? '#ef4444' : 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {task.due_date ? formatDate(task.due_date) : (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>No date</span>
            )}
          </span>
        </MetaField>

        <MetaField label="Assignees" icon={<Users size={11} />}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {task.assignees?.length
              ? task.assignees.map((a) => a.full_name ?? a.email.split('@')[0]).join(', ')
              : <span style={{ color: 'var(--text-muted)' }}>No assignees</span>}
          </span>
        </MetaField>
      </div>

      {/* Description */}
      <div className="section-block">
        <div className="section-label-row">
          <span className="section-label">Description</span>
          {savingDesc && <Loader2 size={11} className="spin" />}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add a description..."
          className="panel-textarea"
        />
      </div>

      {/* Subtasks */}
      <div className="section-block">
        <div className="section-label-row" style={{ marginBottom: subtasks.length > 0 ? 10 : 8 }}>
          <span className="section-label">Subtasks</span>
          <span style={{ fontSize: 11.5, color: subtasks.length > 0 && doneCount === subtasks.length ? '#22c55e' : 'var(--text-muted)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {doneCount}/{subtasks.length}
          </span>
        </div>

        {subtasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <ProgressBar value={progress} size="md" />
          </div>
        )}

        {loadingSubtasks ? (
          <div style={{ display: 'flex', gap: 6, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }}>
            <Loader2 size={12} className="spin" /> Loading...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {subtasks.map((subtask) => (
              <motion.div
                key={subtask.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="subtask-row"
              >
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  className="subtask-checkbox"
                  style={{
                    borderColor: subtask.is_done ? 'var(--accent)' : 'var(--border-strong)',
                    background: subtask.is_done ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {subtask.is_done && <span style={{ color: 'white', fontSize: 9, fontWeight: 900 }}>✓</span>}
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: subtask.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: subtask.is_done ? 'line-through' : 'none',
                    flex: 1,
                    lineHeight: 1.4,
                    transition: 'all 150ms ease',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {subtask.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="subtask-delete-btn"
                  title="Delete subtask"
                >
                  <Trash2 size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
            placeholder="Add a subtask..."
            className="input"
            style={{ flex: 1, fontSize: 13 }}
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtask.trim() || addingSubtask}
            className="btn btn-secondary"
            style={{ flexShrink: 0, padding: '6px 10px' }}
          >
            {addingSubtask ? <Loader2 size={12} className="spin" /> : <Plus size={13} />}
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="section-block">
        <div className="section-label-row">
          <span className="section-label">Links</span>
          <button
            onClick={() => setShowLinkForm((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <Plus size={12} /> Add link
          </button>
        </div>

        <AnimatePresence>
          {showLinkForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 10 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                <input
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="input"
                  style={{ fontSize: 13 }}
                />
                <input
                  placeholder="Label (optional)"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  className="input"
                  style={{ fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowLinkForm(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleAddLink} disabled={!newLinkUrl.trim() || addingLink}>
                    {addingLink ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {links.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0', fontWeight: 400 }}>No links yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {links.map((link) => (
              <div key={link.id} className="link-row">
                <Link2 size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}
                >
                  {link.label ?? link.url}
                </a>
                <ExternalLink size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, display: 'flex', borderRadius: 4, transition: 'color var(--transition)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .section-block {
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }
        .section-block:first-child { border-top: none; padding-top: 0; }
        .meta-status-badge {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 12.5px;
          padding: 4px 9px;
          font-family: var(--font-display);
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          text-transform: capitalize;
        }
        .section-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .panel-textarea {
          width: 100%;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius);
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 13.5px;
          font-family: var(--font-display);
          line-height: 1.6;
          outline: none;
          resize: vertical;
          min-height: 90px;
          transition: border-color var(--transition), box-shadow var(--transition);
          letter-spacing: -0.01em;
        }
        .panel-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .panel-textarea::placeholder { color: var(--text-muted); }

        .subtask-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 6px;
          border-radius: var(--radius-sm);
          transition: background var(--transition);
        }
        .subtask-row:hover { background: var(--bg-hover); }
        .subtask-row:hover .subtask-delete-btn { opacity: 1; }
        .subtask-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 2px solid var(--border-strong);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 150ms ease;
        }
        .subtask-delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          opacity: 0;
          transition: opacity var(--transition), color var(--transition);
          display: flex;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .subtask-delete-btn:hover { color: #ef4444; }

        .link-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          background: var(--bg-elevated);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          transition: border-color var(--transition);
        }
        .link-row:hover { border-color: rgba(37,99,235,0.25); }
        /* Make panel icons adapt to theme and be larger */
        .panel-tab-item svg, .panel-close-btn svg { color: currentColor; width: 18px; height: 18px; }
      `}</style>
    </div>
  );
}

function MetaField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
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
  const [uploading, setUploading] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<ApiAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    tasksApi.listAttachments(taskId)
      .then(setAttachments).catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await tasksApi.uploadAttachment(taskId, file);
      setAttachments((prev) => [attachment, ...prev]);
      toast.success('File uploaded successfully');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.deleteAttachment(taskId, id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8, fontSize: 13 }}>
      <Loader2 size={14} className="spin" /> Loading files...
    </div>
  );

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Files <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({attachments.length})</span>
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {uploading ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}
          {uploading ? 'Uploading...' : 'Add File'}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
      </div>

      {attachments.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Paperclip size={28} style={{ opacity: 0.25 }} />
          <p style={{ fontSize: 13, fontWeight: 500 }}>No attachments yet</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Click "Add File" to upload</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          {attachments.map((att) => {
            const url = att.url ?? att.file_url ?? '';
            const filename = (att.filename ?? att.file_name ?? '').toLowerCase();
            const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
            const isPdf = /\.pdf$/i.test(filename);
            const canPreview = isImage || isPdf;

            return (
              <div
                key={att.id}
                style={{
                  position: 'relative',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  transition: 'border-color var(--transition)'
                }}
              >
                {canPreview ? (
                  <button
                    onClick={() => setPreviewAtt(att)}
                    style={{
                      width: '100%',
                      height: 100,
                      background: 'var(--bg-surface)',
                      display: 'block',
                      border: 'none',
                      padding: 0,
                      cursor: 'zoom-in'
                    }}
                  >
                    {isImage && (
                      <img src={url} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {isPdf && (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,0.05)', color: 'var(--accent)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>PDF</div>
                      </div>
                    )}
                  </button>
                ) : (
                  <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }}>
                    <Paperclip size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div style={{ padding: 10 }}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                      {att.filename ?? att.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatFileSize(att.size_bytes ?? att.file_size)}
                    </div>
                  </a>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(att.id); }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: 'white', padding: 4, display: 'flex', borderRadius: 4, transition: 'all var(--transition)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Overlay */}
      <AnimatePresence>
        {previewAtt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewAtt(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 999999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 40
            }}
          >
            <button
              onClick={() => setPreviewAtt(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={24} />
            </button>
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              {/\.(png|jpe?g|gif|webp|svg)$/i.test(previewAtt.filename ?? previewAtt.file_name ?? '') ? (
                <img
                  src={previewAtt.url ?? previewAtt.file_url}
                  alt={previewAtt.filename ?? previewAtt.file_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                />
              ) : (
                <iframe
                  src={(previewAtt.url ?? previewAtt.file_url) + '#toolbar=0'}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: 'white' }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}