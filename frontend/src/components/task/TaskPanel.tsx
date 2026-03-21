'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate, isOverdue, formatRelativeTime, PRIORITY_CONFIG, formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';

const TABS = [
  { key: 'overview',     label: 'Overview',     icon: <FileText size={13} /> },
  { key: 'chat',         label: 'Chat',          icon: <MessageSquare size={13} /> },
  { key: 'attachments',  label: 'Files',         icon: <Paperclip size={13} /> },
] as const;

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TaskPanel() {
  const { taskPanelOpen, activePanelTaskId, activePanelTab, closeTaskPanel, setActivePanelTab } =
    useUIStore();
  const { user } = useAuthStore();

  const [task, setTask]       = useState<ApiTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle]     = useState('');
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
    if (activePanelTaskId && taskPanelOpen) loadTask(activePanelTaskId);
    else setTask(null);
  }, [activePanelTaskId, taskPanelOpen, loadTask]);

  // ── Real-time task updates via socket ──
  useEffect(() => {
    if (!activePanelTaskId) return;
    let mounted = true;
    getSocket().then((s) => {
      s.on('subtask_created', () => { if (mounted) loadTask(activePanelTaskId); });
      s.on('subtask_updated', () => { if (mounted) loadTask(activePanelTaskId); });
      s.on('subtask_deleted', () => { if (mounted) loadTask(activePanelTaskId); });
    }).catch(() => {});
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

  const overdue = isOverdue(task?.due_date ?? undefined);

  return (
    <AnimatePresence>
      {taskPanelOpen && (
        <>
          <motion.div
            className="task-panel-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeTaskPanel}
          />
          <motion.div
            className="task-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
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
                {/* Header */}
                <div style={{ padding: '14px 20px 0', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_CONFIG[task.priority as Priority]?.color ?? '#6b7280', flexShrink: 0, marginTop: 6 }} />
                    {editingTitle ? (
                      <input
                        autoFocus value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                        style={{ flex: 1, background: 'transparent', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', outline: 'none' }}
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

                  {/* Assignee Avatars mini row */}
                  {task.assignees && task.assignees.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                      <Users size={11} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ display: 'flex', gap: -4 }}>
                        {task.assignees.slice(0, 5).map((a) => (
                          <div
                            key={a.id}
                            title={a.full_name ?? a.email}
                            style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)', marginLeft: -4, overflow: 'hidden' }}
                          >
                            {a.avatar_url
                              ? <img src={a.avatar_url} alt="" style={{ width: 22, height: 22, objectFit: 'cover' }} />
                              : (a.full_name ?? a.email)?.[0]?.toUpperCase()
                            }
                          </div>
                        ))}
                        {task.assignees.length > 5 && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-surface)', marginLeft: -4 }}>
                            +{task.assignees.length - 5}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {task.assignees.map((a) => a.full_name ?? a.email.split('@')[0]).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Subtask progress bar if any */}
                  {(task.subtask_total ?? 0) > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Subtasks</span>
                        <span>{task.subtask_done}/{task.subtask_total}</span>
                      </div>
                      <ProgressBar value={((task.subtask_done ?? 0) / (task.subtask_total ?? 1)) * 100} size="sm" />
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="tab-bar" style={{ borderBottom: 'none' }}>
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActivePanelTab(tab.key)}
                        className={`tab-item ${activePanelTab === tab.key ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        {tab.icon}{tab.label}
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
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ task, overdue, onUpdate }: { task: ApiTask; overdue: boolean; onUpdate: (t: ApiTask) => void }) {
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<ApiTask['priority']>(task.priority);
  const [savingDesc, setSavingDesc] = useState(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<ApiSubtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Links state
  const [links, setLinks] = useState<ApiLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    setDescription(task.description ?? '');
    setPriority(task.priority);
  }, [task.id, task.description, task.priority, task.status]);

  // Load subtasks and links
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

  // Subtask handlers
  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const s = await tasksApi.createSubtask(task.id, newSubtask.trim());
      setSubtasks((prev) => [...prev, s]);
      setNewSubtask('');
      // Also reload parent task for updated counts
      const updated = await tasksApi.get(task.id).catch(() => null);
      if (updated) onUpdate(updated);
    } catch { toast.error('Failed to add subtask'); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtask: ApiSubtask) => {
    // Optimistic
    setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_done: !s.is_done } : s));
    try {
      await tasksApi.updateSubtask(task.id, subtask.id, { is_done: !subtask.is_done });
      // Reload task status from backend (may have auto-updated)
      const updated = await tasksApi.get(task.id).catch(() => null);
      if (updated) { onUpdate(updated); }
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

  // Link handlers
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
    <div className="scroll-y" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MetaField label="Priority" icon={<Flag size={12} />}>
          <select
            value={priority}
            onChange={(e) => savePriority(e.target.value as ApiTask['priority'])}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: PRIORITY_CONFIG[priority as Priority]?.color ?? 'var(--text-primary)', fontSize: 12.5, padding: '3px 6px', fontFamily: 'var(--font-display)', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            {(['urgent', 'high', 'medium', 'low'] as ApiTask['priority'][]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p as Priority]?.label ?? p}</option>
            ))}
          </select>
        </MetaField>

        <MetaField label="Status" icon={<Tag size={12} />}>
          <span
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              padding: '3px 8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {task.status.replace('_', ' ')}
          </span>
        </MetaField>

        <MetaField label="Due Date" icon={<Calendar size={12} />}>
          <span style={{ fontSize: 13, fontWeight: 500, color: overdue ? '#ef4444' : 'var(--text-primary)' }}>
            {task.due_date ? formatDate(task.due_date) : 'No date'}
          </span>
        </MetaField>

        <MetaField label="Assignees" icon={<Users size={12} />}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {task.assignees?.length
              ? task.assignees.map((a) => a.full_name ?? a.email.split('@')[0]).join(', ')
              : 'No assignees'}
          </span>
        </MetaField>
      </div>

      {/* Description */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          Description
          {savingDesc && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          placeholder="Add a description..."
          style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13.5, fontFamily: 'var(--font-display)', lineHeight: 1.6, outline: 'none', resize: 'vertical', minHeight: 90, transition: 'border-color var(--transition)' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        />
      </div>

      {/* Subtasks */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Subtasks
          </div>
          <span style={{ fontSize: 11.5, color: subtasks.length > 0 && doneCount === subtasks.length ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
            {doneCount}/{subtasks.length}
          </span>
        </div>

        {subtasks.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <ProgressBar value={progress} size="md" />
          </div>
        )}

        {loadingSubtasks ? (
          <div style={{ display: 'flex', gap: 6, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {subtasks.map((subtask) => (
              <motion.div
                key={subtask.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 'var(--radius-sm)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${subtask.is_done ? 'var(--accent)' : 'var(--border-strong)'}`, background: subtask.is_done ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                >
                  {subtask.is_done && <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                </button>
                <span style={{ fontSize: 13, color: subtask.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: subtask.is_done ? 'line-through' : 'none', flex: 1, lineHeight: 1.4, transition: 'all 0.15s' }}>
                  {subtask.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, opacity: 0, transition: 'opacity var(--transition)', display: 'flex' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  title="Delete subtask"
                >
                  <Trash2 size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
            placeholder="Add a subtask..."
            className="input"
            style={{ flex: 1, fontSize: 12.5 }}
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtask.trim() || addingSubtask}
            className="btn btn-secondary"
            style={{ flexShrink: 0, padding: '6px 10px' }}
          >
            {addingSubtask ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
          </button>
        </div>
      </div>

      {/* Links */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Links</div>
          <button
            onClick={() => setShowLinkForm((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                <input
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="input"
                  style={{ fontSize: 12.5 }}
                />
                <input
                  placeholder="Label (optional)"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  className="input"
                  style={{ fontSize: 12.5 }}
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>No links yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {links.map((link) => (
              <div
                key={link.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
              >
                <Link2 size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {link.label ?? link.url}
                </a>
                <ExternalLink size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}
                  title="Remove link"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
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
      .then(setAttachments).catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleDelete = async (id: string) => {
    try {
      await tasksApi.deleteAttachment(taskId, id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
    </div>
  );

  return (
    <div className="scroll-y" style={{ flex: 1, padding: '20px' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Attachments ({attachments.length})</h3>
      {attachments.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Paperclip size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No attachments yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {attachments.map((att) => (
            <div key={att.id} className="card" style={{ padding: 12, position: 'relative' }}>
              <a href={att.url ?? att.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }} className="truncate-1">{att.filename ?? att.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(att.size_bytes ?? att.file_size)}</div>
              </a>
              <button
                onClick={() => handleDelete(att.id)}
                style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
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
