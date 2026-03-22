'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import {
  Send, Smile, Search, Pin, Reply, Edit3, Trash2, X, ChevronRight, Loader2, AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { tasksApi, type ApiComment, workspacesApi } from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { notificationsApi } from '@/lib/apiClient';

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '💯', '😂', '😮', '🎉'];

// ─── Shared UI Component: Avatar ─────────────────────────────────────────────

interface UserType {
  id: string;
  name: string;
  avatar_url?: string | null;
  [key: string]: any;
}

interface AvatarProps {
  user: UserType;
  size?: number;
  showPresence?: boolean;
}

const COLORS = ['#ff6b47', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function Avatar({ user, size = 28, showPresence = false }: AvatarProps) {
  const color = colorForUser(user.id);

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      title={user.name}
    >
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div
          className="avatar"
          style={{
            width: size,
            height: size,
            background: color + '20',
            color,
            fontSize: size * 0.38,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
        >
          {getInitials(user.name)}
        </div>
      )}
      {showPresence && <div className="presence-dot" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────


interface LocalMessage {
  id: string;
  task_id: string;
  sender_id: string;
  sender: { id: string; name: string; email: string; avatar_url?: string | null };
  content: string;
  parent_id?: string;
  replies?: LocalMessage[];
  reactions: { emoji: string; user_id: string }[];
  is_edited: boolean;
  is_pinned?: boolean;
  created_at: string;
}

function apiCommentToMessage(c: ApiComment): LocalMessage {
  const u = c.user;
  const displayName =
    u?.full_name?.trim() ||
    c.full_name?.trim() ||
    u?.email ||
    c.email ||
    'User';
  return {
    id: c.id,
    task_id: c.task_id,
    sender_id: c.user_id,
    sender: {
      id: u?.id ?? c.user_id,
      name: displayName,
      email: u?.email ?? c.email ?? '',
      avatar_url: u?.avatar_url ?? c.avatar_url ?? null,
    },
    content: c.content,
    reactions: [],
    is_edited: false,
    created_at: c.created_at,
  };
}

interface ChatTabProps {
  taskId: string;
  currentUserId: string;
  currentUser: any;
  workspaceId?: string;
}

export function ChatTab({ taskId, currentUserId, currentUser, workspaceId }: ChatTabProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMembers, setMentionMembers] = useState<{ id: string; name: string; avatar_url?: string }[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentIdsRef = useRef<Set<string>>(new Set());
  const processedIdsRef = useRef<Set<string>>(new Set());

  const dedupeById = (items: LocalMessage[]) => {
    const seen = new Set<string>();
    return items.filter((m) => seen.has(m.id) ? false : (seen.add(m.id), true));
  };

  const me = {
    id: currentUser?.id ?? currentUserId,
    name: (currentUser as any)?.full_name ?? (currentUser as any)?.name ?? currentUser?.email ?? 'You',
    email: currentUser?.email ?? '',
    avatar_url: (currentUser as any)?.avatar_url ?? null,
  };

  useEffect(() => {
    if (!workspaceId) return;
    workspacesApi.getMembers(workspaceId).then((members) => {
      setMentionMembers(
        members.map((m) => ({
          id: m.user_id,
          name: m.user?.full_name ?? m.user?.email ?? m.user_id,
          avatar_url: m.user?.avatar_url ?? undefined,
        }))
      );
    }).catch(() => { });
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    let socketRef: Awaited<ReturnType<typeof getSocket>> | null = null;

    const init = async () => {
      try {
        const comments = await tasksApi.listComments(taskId);
        if (isMounted) setMessages(comments.map(apiCommentToMessage));
      } catch {
        if (isMounted) setMessages([]);
      } finally {
        if (isMounted) setLoading(false);
      }

      try {
        const s = await getSocket();
        socketRef = s;
        s.emit(SOCKET_EVENTS.JOIN_TASK, taskId);

        s.on(SOCKET_EVENTS.COMMENT_CREATED, (data: { comment: ApiComment }) => {
          if (!isMounted) return;
          const msg = apiCommentToMessage(data.comment);
          if (processedIdsRef.current.has(msg.id)) return;
          processedIdsRef.current.add(msg.id);
          if (sentIdsRef.current.has(msg.id)) { sentIdsRef.current.delete(msg.id); return; }
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        });

        s.on(SOCKET_EVENTS.COMMENT_DELETED, (data: { commentId: string }) => {
          if (!isMounted) return;
          setMessages((prev) => prev.filter((m) => m.id !== data.commentId));
        });
      } catch { /* REST only */ }
    };

    init();
    return () => {
      isMounted = false;
      if (socketRef) {
        socketRef.emit(SOCKET_EVENTS.LEAVE_TASK, taskId);
        socketRef.off(SOCKET_EVENTS.COMMENT_CREATED);
        socketRef.off(SOCKET_EVENTS.COMMENT_DELETED);
      }
    };
  }, [taskId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const q = val.slice(lastAtPos + 1);
      if (!q.includes(' ')) {
        setMentionQuery(q.toLowerCase());
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const filteredMentionMembers = mentionMembers.filter(
    (m) => m.name.toLowerCase().includes(mentionQuery)
  ).slice(0, 5);

  const insertMention = (member: { id: string; name: string }) => {
    const lastAtPos = input.lastIndexOf('@');
    setInput(input.slice(0, lastAtPos) + `@${member.name} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const pinnedMessage = messages.find((m) => m.is_pinned);
  const filteredMessages = searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setMentionOpen(false);
    setSending(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimistic: LocalMessage = {
      id: optimisticId,
      task_id: taskId,
      sender_id: me.id,
      sender: me,
      content,
      reactions: [],
      is_edited: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);

    const mentionedNames = [...content.matchAll(/@(\w[\w\s]*?)(?=\s|$)/g)].map((m) => m[1].trim());

    try {
      const saved = await tasksApi.addComment(taskId, content);
      sentIdsRef.current.add(saved.id);
      setMessages((prev) => dedupeById(prev.map((m) => m.id === optimisticId ? apiCommentToMessage(saved) : m)));

      for (const name of mentionedNames) {
        const member = mentionMembers.find((mm) => mm.name.toLowerCase() === name.toLowerCase());
        if (member && member.id !== me.id) {
          notificationsApi.create?.({
            user_id: member.id,
            type: 'mention_chat',
            title: `${me.name} mentioned you`,
            message: content.slice(0, 100),
            entity_id: taskId,
            entity_type: 'task',
          }).catch(() => { });
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && filteredMentionMembers.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMentionMembers.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMentionMembers[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await tasksApi.deleteComment(taskId, msgId);
    } catch {
      toast.error('Failed to delete message');
      tasksApi.listComments(taskId).then((cs) => setMessages(cs.map(apiCommentToMessage))).catch(() => { });
    }
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find((r) => r.emoji === emoji && r.user_id === me.id);
      if (existing) return { ...m, reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.user_id === me.id)) };
      return { ...m, reactions: [...m.reactions, { emoji, user_id: me.id }] };
    }));
    setEmojiPickerFor(null);
  };

  const saveEdit = (msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: editContent, is_edited: true } : m));
    setEditingId(null);
  };

  const togglePin = (msg: LocalMessage) => {
    setMessages((prev) => prev.map((m) => ({ ...m, is_pinned: m.id === msg.id ? !m.is_pinned : false })));
    toast.success(msg.is_pinned ? 'Unpinned' : 'Pinned!');
  };

  function groupReactions(reactions: LocalMessage['reactions']) {
    const map: Record<string, { emoji: string; count: number; reacted: boolean }> = {};
    for (const r of reactions) {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
      map[r.emoji].count++;
      if (r.user_id === me.id) map[r.emoji].reacted = true;
    }
    return Object.values(map);
  }

  function renderContent(text: string) {
    const parts = text.split(/(@\w[\w\s]*?(?=\s|$)|`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={i} className="chat-mention">{part}</span>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="chat-code-inline">{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  }

  return (
    <div className="chat-container">
      {/* Pinned Banner */}
      {pinnedMessage && (
        <div className="pinned-banner">
          <Pin size={11} />
          <span className="pinned-label">Pinned:</span>
          <span className="pinned-content">{pinnedMessage.content}</span>
          <ChevronRight size={11} style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
          >
            <div className="chat-search-bar">
              <Search size={13} style={{ color: 'var(--accent)' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="chat-search-input"
              />
              {searchQuery && (
                <span className="chat-search-count">{filteredMessages.length} results</span>
              )}
              <button className="chat-search-close" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="chat-messages scroll-y">
        {loading ? (
          <div className="chat-loading">
            <Loader2 size={14} className="spin" />
            <span>Loading messages...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <Send size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="chat-empty-title">No messages yet</p>
            <p className="chat-empty-subtitle">Start the conversation with your team</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isOwn = msg.sender_id === me.id;
            const isEditing = editingId === msg.id;
            const grouped = groupReactions(msg.reactions);
            const senderUser = {
              id: msg.sender.id,
              name: msg.sender.name,
              email: msg.sender.email,
              avatar_url: msg.sender.avatar_url ?? undefined,
              created_at: msg.created_at,
            };

            return (
              <div
                key={msg.id}
                className={`chat-message ${hoveredMsgId === msg.id ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => { setHoveredMsgId(null); setEmojiPickerFor(null); }}
              >
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  <Avatar user={senderUser} size={28} />
                </div>

                <div className="chat-message-body">
                  <div className="chat-message-meta">
                    <span className="chat-sender-name">{msg.sender.name}</span>
                    <span className="chat-timestamp">{formatRelativeTime(msg.created_at)}</span>
                    {msg.is_edited && <span className="chat-edited">edited</span>}
                    {msg.is_pinned && <span className="chat-pinned-tag">Pinned</span>}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        autoFocus
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="chat-edit-textarea"
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button onClick={() => saveEdit(msg.id)} className="btn btn-primary btn-sm">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="chat-message-text">{renderContent(msg.content)}</p>
                  )}

                  {grouped.length > 0 && (
                    <div className="chat-reactions">
                      {grouped.map(({ emoji, count, reacted }) => (
                        <button
                          key={emoji}
                          className={`reaction-chip ${reacted ? 'reacted' : ''}`}
                          onClick={() => addReaction(msg.id, emoji)}
                        >
                          {emoji} <span>{count}</span>
                        </button>
                      ))}
                      <button
                        className="reaction-chip"
                        onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                      >
                        +
                      </button>
                    </div>
                  )}

                  <AnimatePresence>
                    {emojiPickerFor === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="emoji-picker"
                      >
                        {EMOJI_LIST.map((e) => (
                          <button
                            key={e}
                            onClick={() => addReaction(msg.id, e)}
                            className="emoji-btn"
                          >
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hover actions */}
                <div className="chat-msg-actions">
                  <ActionBtn onClick={() => addReaction(msg.id, '👍')} title="Like">👍</ActionBtn>
                  <ActionBtn onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)} title="React">
                    <Smile size={12} />
                  </ActionBtn>
                  <ActionBtn onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} title="Reply">
                    <Reply size={12} />
                  </ActionBtn>
                  <ActionBtn onClick={() => togglePin(msg)} title="Pin">
                    <Pin size={12} />
                  </ActionBtn>
                  {isOwn && (
                    <ActionBtn onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} title="Edit">
                      <Edit3 size={12} />
                    </ActionBtn>
                  )}
                  {isOwn && (
                    <Trash2
                      size={16}
                      strokeWidth={2}
                      role="button"
                      aria-label="Delete"
                      tabIndex={0}
                      onClick={() => deleteMessage(msg.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') deleteMessage(msg.id); }}
                      style={{ cursor: 'pointer', color: 'var(--error)' }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="reply-banner"
            style={{ overflow: 'hidden' }}
          >
            <div className="reply-banner-inner">
              <Reply size={11} style={{ color: 'var(--accent)' }} />
              <span>Replying to <strong style={{ color: 'var(--accent)' }}>{replyTo.sender.name}</strong></span>
              <span className="reply-preview">{replyTo.content.slice(0, 60)}</span>
              <button onClick={() => setReplyTo(null)} className="reply-close-btn">
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="chat-input-area">
        <div style={{ position: 'relative' }}>
          {/* Mention Dropdown */}
          <AnimatePresence>
            {mentionOpen && filteredMentionMembers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mention-dropdown"
              >
                {filteredMentionMembers.map((m, i) => (
                  <div
                    key={m.id}
                    className={`mention-item ${i === mentionIndex ? 'active' : ''}`}
                    onClick={() => insertMention(m)}
                  >
                    <div className="mention-avatar">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <span className="mention-name">{m.name}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="chat-input-box">
            <textarea
              ref={inputRef}
              className="chat-input-textarea"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Replying to ${replyTo.sender.name}...` : 'Message the team... (@ to mention)'}
              rows={1}
              disabled={sending}
            />
            <div className="chat-input-footer">
              <div className="chat-input-tools">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  title="Search messages"
                  className="chat-tool-btn"
                >
                  <Search size={13} />
                </button>
                <button title="Emoji" className="chat-tool-btn">
                  <Smile size={13} />
                </button>
                <button
                  title="Mention"
                  onClick={() => { setInput(input + '@'); inputRef.current?.focus(); handleInputChange(input + '@'); }}
                  className="chat-tool-btn"
                >
                  <AtSign size={13} />
                </button>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="chat-send-btn"
                style={{ opacity: input.trim() && !sending ? 1 : 0.45 }}
              >
                {sending ? <Loader2 size={12} className="spin" /> : <Send size={12} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Pinned banner */
        .pinned-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          background: rgba(37,99,235,0.07);
          border-bottom: 1px solid rgba(37,99,235,0.12);
          font-size: 12px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .pinned-label { font-weight: 700; color: var(--accent); }
        .pinned-content { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Search bar */
        .chat-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-elevated);
        }
        .chat-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 13px;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .chat-search-count { font-size: 11px; color: var(--text-muted); font-weight: 600; }
        .chat-search-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition: color var(--transition);
        }
        .chat-search-close:hover { color: var(--text-primary); }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chat-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100px;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
        }
        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 160px;
          gap: 8px;
          color: var(--text-muted);
        }
        .chat-empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(37,99,235,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .chat-empty-title { font-size: 14px; font-weight: 700; color: var(--text-secondary); }
        .chat-empty-subtitle { font-size: 12.5px; color: var(--text-muted); }

        /* Message */
        .chat-message {
          position: relative;
          display: flex;
          gap: 10px;
          padding: 6px 16px;
          transition: background var(--transition);
          border-radius: 0;
        }
        .chat-message.hovered { background: var(--bg-elevated); }
        .chat-message-body { flex: 1; min-width: 0; }
        .chat-message-meta {
          display: flex;
          align-items: baseline;
          gap: 7px;
          margin-bottom: 3px;
        }
        .chat-sender-name {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        html.dark .chat-sender-name {
          color: #f8fafc;
        }
        .chat-timestamp { font-size: 10.5px; color: var(--text-muted); font-weight: 500; }
        .chat-edited { font-size: 10px; color: var(--text-muted); font-style: italic; }
        .chat-pinned-tag { font-size: 10px; color: var(--accent); font-weight: 700; }
        .chat-message-text {
          font-size: 13.5px;
          color: var(--text-primary);
          line-height: 1.55;
          word-break: break-word;
          letter-spacing: -0.01em;
        }

        :global(.chat-mention) {
          color: var(--accent);
          background: rgba(37,99,235,0.1);
          border-radius: 4px;
          padding: 0 3px;
          font-weight: 600;
          cursor: pointer;
        }
        :global(.chat-code-inline) {
          background: var(--bg-overlay);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--accent);
        }

        /* Reactions */
        .chat-reactions {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 5px;
        }
        :global(.reaction-chip) {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 99px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          cursor: pointer;
          font-size: 13px;
          transition: all 150ms ease;
          color: var(--text-secondary);
          font-family: var(--font-display);
        }
        :global(.reaction-chip span) { font-size: 11px; font-weight: 700; }
        :global(.reaction-chip:hover) { border-color: var(--accent); background: rgba(37,99,235,0.08); }
        :global(.reaction-chip.reacted) {
          background: rgba(37,99,235,0.1);
          border-color: rgba(37,99,235,0.3);
          color: var(--accent);
        }

        /* Emoji picker */
        .emoji-picker {
          position: absolute;
          left: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius);
          padding: 6px 8px;
          display: flex;
          gap: 4px;
          z-index: 10;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .emoji-btn {
          font-size: 18px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: transform 100ms ease;
        }
        .emoji-btn:hover { transform: scale(1.3); }

        /* Hover actions */
        .chat-msg-actions {
          position: absolute;
          top: 4px;
          right: 8px;
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 150ms ease;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius);
          padding: 2px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .chat-message.hovered .chat-msg-actions { opacity: 1; }

        /* Edit textarea */
        .chat-edit-textarea {
          width: 100%;
          background: var(--bg-elevated);
          border: 1.5px solid var(--accent);
          border-radius: var(--radius-sm);
          padding: 7px 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: var(--font-display);
          outline: none;
          resize: none;
          line-height: 1.5;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        /* Reply banner */
        .reply-banner {
          padding: 7px 16px;
          background: rgba(37,99,235,0.06);
          border-top: 1px solid rgba(37,99,235,0.12);
          flex-shrink: 0;
        }
        .reply-banner-inner {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .reply-preview {
          color: var(--text-muted);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .reply-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          padding: 2px;
          border-radius: 4px;
          transition: color var(--transition);
        }
        .reply-close-btn:hover { color: var(--text-primary); }

        /* Mention dropdown */
        .mention-dropdown {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 20;
        }
        .mention-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background var(--transition);
        }
        .mention-item:hover, .mention-item.active { background: var(--bg-hover); }
        .mention-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(37,99,235,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: var(--accent);
          flex-shrink: 0;
        }
        .mention-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }

        /* Input area */
        .chat-input-area {
          padding: 10px 14px 12px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-surface);
        }
        .chat-input-box {
          background: var(--bg-elevated);
          border: 1.5px solid var(--border-default);
          border-radius: var(--radius);
          overflow: hidden;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .chat-input-box:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .chat-input-textarea {
          width: 100%;
          padding: 10px 12px 6px;
          background: transparent;
          border: none;
          outline: none;
          font-size: 13.5px;
          font-family: var(--font-display);
          color: var(--text-primary);
          resize: none;
          min-height: 38px;
          max-height: 120px;
          line-height: 1.5;
          letter-spacing: -0.01em;
        }
        .chat-input-textarea::placeholder { color: var(--text-muted); }
        .chat-input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px 6px;
          border-top: 1px solid var(--border-subtle);
        }
        .chat-input-tools { display: flex; gap: 2px; }
        .chat-tool-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
        }
        .chat-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

        .chat-send-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 150ms ease;
          letter-spacing: -0.01em;
        }
        .chat-send-btn:not(:disabled):hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }
        .chat-send-btn:disabled { cursor: not-allowed; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ActionBtn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26,
        height: 26,
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: danger ? '#ef4444' : 'var(--text-muted)',
        transition: 'all var(--transition)',
        fontSize: 13,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-overlay)';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-muted)';
      }}
    >
      {children}
    </button>
  );
}