'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatMessage as ChatMsg, Task } from '@/types';
import { CHAT_MESSAGES, USERS, CURRENT_USER } from '@/data/seed';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import {
  Send, Paperclip, Smile, Search, Pin, MoreHorizontal,
  Reply, Edit3, Trash2, X, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '💯', '😂', '😮', '🎉'];

interface ChatTabProps {
  task: Task;
}

export function ChatTab({ task }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMsg[]>(
    CHAT_MESSAGES.filter((m) => m.task_id === task.id)
  );
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pinnedMessage = messages.find((m) => m.is_pinned);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.random() > 0.7) {
        const user = USERS[Math.floor(Math.random() * USERS.length)];
        if (user.id !== CURRENT_USER.id) {
          setTypingUsers([user.name]);
          setTimeout(() => setTypingUsers([]), 2500);
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [messages]);

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMsg: ChatMsg = {
      id: `cm-${Date.now()}`,
      task_id: task.id,
      sender_id: CURRENT_USER.id,
      sender: CURRENT_USER,
      content: input.trim(),
      parent_id: replyTo?.id,
      reactions: [],
      is_edited: false,
      created_at: new Date().toISOString(),
    };

    if (replyTo) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyTo.id
            ? { ...m, replies: [...(m.replies || []), newMsg] }
            : m
        )
      );
    } else {
      setMessages((prev) => [...prev, newMsg]);
    }

    setInput('');
    setReplyTo(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji && r.user_id === CURRENT_USER.id);
        if (existing) {
          return { ...m, reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.user_id === CURRENT_USER.id)) };
        }
        return {
          ...m,
          reactions: [
            ...m.reactions,
            { id: `r-${Date.now()}`, message_id: msgId, user_id: CURRENT_USER.id, emoji, user: CURRENT_USER },
          ],
        };
      })
    );
    setEmojiPickerFor(null);
  };

  const deleteMessage = (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast.success('Message deleted');
  };

  const saveEdit = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, content: editContent, is_edited: true } : m)
    );
    setEditingId(null);
  };

  const togglePin = (msg: ChatMsg) => {
    setMessages((prev) =>
      prev.map((m) => ({ ...m, is_pinned: m.id === msg.id ? !m.is_pinned : false }))
    );
    toast.success(msg.is_pinned ? 'Message unpinned' : 'Message pinned');
  };

  // Group reactions by emoji
  function groupReactions(reactions: ChatMsg['reactions']) {
    const map: Record<string, { emoji: string; count: number; reacted: boolean }> = {};
    for (const r of reactions) {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false };
      map[r.emoji].count++;
      if (r.user_id === CURRENT_USER.id) map[r.emoji].reacted = true;
    }
    return Object.values(map);
  }

  return (
    <div className="chat-container">
      {/* Pinned Banner */}
      {pinnedMessage && (
        <div className="pinned-banner">
          <Pin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--accent)', marginRight: 4 }}>Pinned:</span>
          <span className="truncate-1" style={{ flex: 1 }}>{pinnedMessage.content}</span>
          <ChevronRight size={11} style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="chat-messages scroll-y">
        {/* Unread separator (demo) */}
        {messages.length > 2 && (
          <div className="unread-separator">New messages</div>
        )}

        {filteredMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.sender_id === CURRENT_USER.id}
            hoveredMsgId={hoveredMsgId}
            setHoveredMsgId={setHoveredMsgId}
            emojiPickerFor={emojiPickerFor}
            setEmojiPickerFor={setEmojiPickerFor}
            editingId={editingId}
            editContent={editContent}
            setEditContent={setEditContent}
            onReply={() => { setReplyTo(msg); inputRef.current?.focus(); }}
            onReact={(emoji) => addReaction(msg.id, emoji)}
            onEdit={() => { setEditingId(msg.id); setEditContent(msg.content); }}
            onDelete={() => deleteMessage(msg.id)}
            onPin={() => togglePin(msg)}
            onSaveEdit={() => saveEdit(msg.id)}
            onCancelEdit={() => setEditingId(null)}
            groupReactions={groupReactions}
            expandedThread={expandedThread}
            setExpandedThread={setExpandedThread}
          />
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}
          >
            <div style={{ width: 28, height: 28 }} />
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {typingUsers.join(', ')} is typing
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: '6px 16px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <Reply size={11} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Replying to <strong style={{ color: 'var(--text-primary)' }}>{replyTo.sender.name}</strong></span>
              <span style={{ color: 'var(--text-muted)', flex: 1 }} className="truncate-1">{replyTo.content.slice(0, 50)}</span>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { label: 'B', style: { fontWeight: 800 } },
              { label: 'I', style: { fontStyle: 'italic' } },
              { label: '</', style: { fontFamily: 'var(--font-mono)', fontSize: 11 } },
            ].map((btn) => (
              <button
                key={btn.label}
                style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--bg-overlay)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...btn.style }}
                title={btn.label}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setShowSearch(!showSearch)} title="Search chat" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--transition)' }}>
              <Search size={13} />
            </button>
            <button title="Attach file" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paperclip size={13} />
            </button>
            <button title="Emoji" style={{ width: 28, height: 28, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smile size={13} />
            </button>
          </div>
        </div>

        <div className="chat-input-box">
          <textarea
            ref={inputRef}
            className="chat-input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Replying to ${replyTo.sender.name}...` : 'Message the team... (Enter to send, Shift+Enter for newline)'}
            rows={1}
            style={{ minHeight: 36 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                background: input.trim() ? 'var(--accent)' : 'var(--bg-overlay)',
                color: input.trim() ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                transition: 'all var(--transition)',
              }}
            >
              <Send size={12} />
              Send
            </button>
          </div>
        </div>

        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMsg;
  isOwn: boolean;
  hoveredMsgId: string | null;
  setHoveredMsgId: (id: string | null) => void;
  emojiPickerFor: string | null;
  setEmojiPickerFor: (id: string | null) => void;
  editingId: string | null;
  editContent: string;
  setEditContent: (v: string) => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  groupReactions: (reactions: ChatMsg['reactions']) => { emoji: string; count: number; reacted: boolean }[];
  expandedThread: string | null;
  setExpandedThread: (id: string | null) => void;
}

function MessageBubble({
  msg, isOwn, hoveredMsgId, setHoveredMsgId,
  emojiPickerFor, setEmojiPickerFor, editingId, editContent,
  setEditContent, onReply, onReact, onEdit, onDelete, onPin,
  onSaveEdit, onCancelEdit, groupReactions, expandedThread, setExpandedThread
}: MessageBubbleProps) {
  const grouped = groupReactions(msg.reactions);
  const isEditing = editingId === msg.id;
  const isHovered = hoveredMsgId === msg.id;

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+\s?\w*|`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={i} className="mention">{part}</span>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="chat-code-inline">{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  };

  return (
    <div>
      <div
        className="chat-message"
        onMouseEnter={() => setHoveredMsgId(msg.id)}
        onMouseLeave={() => { setHoveredMsgId(null); setEmojiPickerFor(null); }}
      >
        {/* Avatar */}
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          <Avatar user={msg.sender} size={28} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.sender.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(msg.created_at)}</span>
            {msg.is_edited && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>edited</span>}
            {msg.is_pinned && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Pinned</span>}
          </div>

          {/* Content */}
          {isEditing ? (
            <div>
              <textarea
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 10px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                }}
                rows={2}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={onSaveEdit} className="btn btn-primary" style={{ fontSize: 11.5, padding: '3px 10px' }}>Save</button>
                <button onClick={onCancelEdit} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '3px 10px' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {renderContent(msg.content)}
            </p>
          )}

          {/* Reactions */}
          {grouped.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {grouped.map(({ emoji, count, reacted }) => (
                <button
                  key={emoji}
                  className={`reaction-chip ${reacted ? 'reacted' : ''}`}
                  onClick={() => onReact(emoji)}
                >
                  {emoji} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{count}</span>
                </button>
              ))}
              <button
                className="reaction-chip"
                onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                style={{ fontSize: 14 }}
              >
                +
              </button>
            </div>
          )}

          {/* Emoji Picker Popover */}
          <AnimatePresence>
            {emojiPickerFor === msg.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius)',
                  padding: '6px 8px',
                  display: 'flex',
                  gap: 4,
                  zIndex: 10,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {EMOJI_LIST.map((e) => (
                  <button
                    key={e}
                    onClick={() => onReact(e)}
                    style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: 4, transition: 'transform var(--transition)' }}
                    onMouseEnter={(el) => (el.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={(el) => (el.currentTarget.style.transform = 'scale(1)')}
                  >
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thread Replies */}
          {msg.replies && msg.replies.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setExpandedThread(expandedThread === msg.id ? null : msg.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--accent)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Reply size={11} />
                {expandedThread === msg.id ? 'Hide' : `View ${msg.replies.length} ${msg.replies.length === 1 ? 'reply' : 'replies'}`}
              </button>

              <AnimatePresence>
                {expandedThread === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: 6 }}
                  >
                    <div style={{
                      borderLeft: '2px solid var(--border-default)',
                      paddingLeft: 12,
                      marginLeft: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}>
                      {msg.replies.map((reply) => (
                        <div key={reply.id} style={{ display: 'flex', gap: 8 }}>
                          <Avatar user={reply.sender} size={22} />
                          <div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{reply.sender.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatRelativeTime(reply.created_at)}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="chat-message-actions">
          <ActionBtn onClick={() => onReact('👍')} title="React"><span style={{ fontSize: 13 }}>👍</span></ActionBtn>
          <ActionBtn onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)} title="More reactions"><Smile size={12} /></ActionBtn>
          <ActionBtn onClick={onReply} title="Reply"><Reply size={12} /></ActionBtn>
          <ActionBtn onClick={onPin} title="Pin"><Pin size={12} /></ActionBtn>
          {isOwn && <ActionBtn onClick={onEdit} title="Edit"><Edit3 size={12} /></ActionBtn>}
          {isOwn && <ActionBtn onClick={onDelete} title="Delete" danger><Trash2 size={12} /></ActionBtn>}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, danger, children }: { onClick: () => void; title: string; danger?: boolean; children: React.ReactNode }) {
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
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-overlay)'; e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? '#ef4444' : 'var(--text-muted)'; }}
    >
      {children}
    </button>
  );
}
