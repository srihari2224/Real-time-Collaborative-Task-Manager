'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import {
  Send, Smile, Search, Pin, Reply, Edit3, Trash2, X, ChevronRight, Loader2, AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { tasksApi, type ApiComment, workspacesApi } from '@/lib/apiClient';
import { getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { notificationsApi } from '@/lib/apiClient';

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '💯', '😂', '😮', '🎉'];

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
  return {
    id: c.id,
    task_id: c.task_id,
    sender_id: c.user_id,
    sender: {
      id: c.user?.id ?? c.user_id,
      name: c.user?.full_name ?? c.user?.email ?? 'User',
      email: c.user?.email ?? '',
      avatar_url: c.user?.avatar_url,
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
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMembers, setMentionMembers] = useState<{ id: string; name: string; avatar_url?: string }[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Tracks real IDs of messages we sent so socket echo is ignored
  const sentIdsRef = useRef<Set<string>>(new Set());

  const me = {
    id: currentUser?.id ?? currentUserId,
    name: (currentUser as any)?.full_name ?? (currentUser as any)?.name ?? currentUser?.email ?? 'You',
    email: currentUser?.email ?? '',
    avatar_url: (currentUser as any)?.avatar_url ?? null,
  };

  // Load workspace members for @mention
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
    }).catch(() => {});
  }, [workspaceId]);

  // ── Load comments & subscribe to socket ─────────────────────────────────
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
          // Skip our own optimistically-added messages
          if (sentIdsRef.current.has(msg.id)) {
            sentIdsRef.current.delete(msg.id);
            return;
          }
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        });

        s.on(SOCKET_EVENTS.COMMENT_DELETED, (data: { commentId: string }) => {
          if (!isMounted) return;
          setMessages((prev) => prev.filter((m) => m.id !== data.commentId));
        });
      } catch {
        // Socket unavailable — REST only
      }
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse @mention trigger from input
  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const q = val.slice(lastAtPos + 1);
      if (!q.includes(' ') && q.length >= 0) {
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
    const newInput = input.slice(0, lastAtPos) + `@${member.name} `;
    setInput(newInput);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const pinnedMessage = messages.find((m) => m.is_pinned);
  const filteredMessages = searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Send message ─────────────────────────────────────────────────────────
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

    // Detect @mentions and create notifications for those users
    const mentionedNames = [...content.matchAll(/@(\w[\w\s]*?)(?=\s|$)/g)].map((m) => m[1].trim());

    try {
      const saved = await tasksApi.addComment(taskId, content);
      sentIdsRef.current.add(saved.id);
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? apiCommentToMessage(saved) : m));

      // Create notifications for mentioned members
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
          }).catch(() => {});
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
      tasksApi.listComments(taskId).then((cs) => setMessages(cs.map(apiCommentToMessage))).catch(() => {});
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
    toast.success(msg.is_pinned ? 'Unpinned' : 'Pinned! 📌');
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
      if (part.startsWith('@')) return <span key={i} className="mention">{part}</span>;
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
          <Pin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--accent)', marginRight: 4 }}>Pinned:</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pinnedMessage.content}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-elevated)' }}>
              <Search size={13} style={{ color: 'var(--accent)' }} />
              <input
                autoFocus value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              />
              {searchQuery && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{filteredMessages.length} results</span>}
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="chat-messages scroll-y">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8, color: 'var(--text-muted)' }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading messages...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No messages yet</p>
              <p style={{ fontSize: 13 }}>Start the conversation with your team</p>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isOwn = msg.sender_id === me.id;
            const isEditing = editingId === msg.id;
            const grouped = groupReactions(msg.reactions);
            const senderUser = { id: msg.sender.id, name: msg.sender.name, email: msg.sender.email, avatar_url: msg.sender.avatar_url ?? undefined, created_at: msg.created_at };

            return (
              <div key={msg.id}>
                <div
                  className="chat-message"
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => { setHoveredMsgId(null); setEmojiPickerFor(null); }}
                >
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <Avatar user={senderUser} size={28} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.sender.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(msg.created_at)}</span>
                      {msg.is_edited && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>edited</span>}
                      {msg.is_pinned && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>📌 Pinned</span>}
                    </div>

                    {isEditing ? (
                      <div>
                        <textarea
                          autoFocus value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{ width: '100%', background: 'var(--bg-elevated)', border: '1.5px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-display)', outline: 'none', resize: 'none', lineHeight: 1.5 }}
                          rows={2}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button onClick={() => saveEdit(msg.id)} className="btn btn-primary btn-sm">Save</button>
                          <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                        {renderContent(msg.content)}
                      </p>
                    )}

                    {grouped.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {grouped.map(({ emoji, count, reacted }) => (
                          <button key={emoji} className={`reaction-chip ${reacted ? 'reacted' : ''}`} onClick={() => addReaction(msg.id, emoji)}>
                            {emoji} <span style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>
                          </button>
                        ))}
                        <button className="reaction-chip" onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)} style={{ fontSize: 14 }}>+</button>
                      </div>
                    )}

                    <AnimatePresence>
                      {emojiPickerFor === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          style={{ position: 'absolute', left: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '6px 8px', display: 'flex', gap: 4, zIndex: 10, boxShadow: 'var(--shadow-md)' }}
                        >
                          {EMOJI_LIST.map((e) => (
                            <button key={e} onClick={() => addReaction(msg.id, e)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: 4, transition: 'transform var(--transition)' }} onMouseEnter={(el) => (el.currentTarget.style.transform = 'scale(1.3)')} onMouseLeave={(el) => (el.currentTarget.style.transform = 'scale(1)')}>
                              {e}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Hover Actions */}
                  <div className="chat-message-actions">
                    <ActionBtn onClick={() => addReaction(msg.id, '👍')} title="Like">👍</ActionBtn>
                    <ActionBtn onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)} title="React"><Smile size={12} /></ActionBtn>
                    <ActionBtn onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} title="Reply"><Reply size={12} /></ActionBtn>
                    <ActionBtn onClick={() => togglePin(msg)} title="Pin"><Pin size={12} /></ActionBtn>
                    {isOwn && <ActionBtn onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} title="Edit"><Edit3 size={12} /></ActionBtn>}
                    {isOwn && <ActionBtn onClick={() => deleteMessage(msg.id)} title="Delete" danger><Trash2 size={12} /></ActionBtn>}
                  </div>
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
            style={{ padding: '6px 16px', background: 'var(--accent-soft)', borderTop: '1px solid rgba(37,99,235,0.15)', flexShrink: 0, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <Reply size={11} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Replying to <strong style={{ color: 'var(--accent)' }}>{replyTo.sender.name}</strong></span>
              <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content.slice(0, 60)}</span>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={12} /></button>
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
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="mention-dropdown" style={{ bottom: '100%', marginBottom: 4 }}>
                {filteredMentionMembers.map((m, i) => (
                  <div key={m.id} className={`mention-item ${i === mentionIndex ? 'active' : ''}`} onClick={() => insertMention(m)}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
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
              placeholder={replyTo ? `Replying to ${replyTo.sender.name}... (Enter to send)` : 'Message the team... (Enter to send, @ to mention)'}
              rows={1}
              style={{ minHeight: 36 }}
              disabled={sending}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setShowSearch(!showSearch)} title="Search messages" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                  <Search size={13} />
                </button>
                <button title="Emoji" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                  <Smile size={13} />
                </button>
                <button
                  title="Mention someone"
                  onClick={() => { setInput(input + '@'); inputRef.current?.focus(); handleInputChange(input + '@'); }}
                  className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}
                >
                  <AtSign size={13} />
                </button>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="btn btn-primary btn-sm"
                style={{ opacity: input.trim() && !sending ? 1 : 0.5 }}
              >
                {sending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>Enter to send · Shift+Enter for new line · @ to mention</p>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? 'var(--error)' : 'var(--text-muted)', transition: 'all var(--transition)', fontSize: 13 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'var(--error-soft)' : 'var(--bg-overlay)'; e.currentTarget.style.color = danger ? 'var(--error)' : 'var(--text-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? 'var(--error)' : 'var(--text-muted)'; }}
    >
      {children}
    </button>
  );
}
