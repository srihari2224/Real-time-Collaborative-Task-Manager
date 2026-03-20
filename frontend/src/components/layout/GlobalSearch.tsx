'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, FolderOpen, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { TASKS, PROJECTS, CHAT_MESSAGES } from '@/data/seed';
import { useRouter } from 'next/navigation';
import { WORKSPACE } from '@/data/seed';

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, openTaskPanel } = useUIStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  const q = query.toLowerCase().trim();

  const taskResults = q ? TASKS.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) : [];
  const projectResults = q ? PROJECTS.filter((p) => p.name.toLowerCase().includes(q)) : [];
  const chatResults = q ? CHAT_MESSAGES.filter((m) => m.content.toLowerCase().includes(q)) : [];

  const hasResults = taskResults.length > 0 || projectResults.length > 0 || chatResults.length > 0;

  function highlight(text: string) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          <motion.div
            className="search-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              className="search-modal"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks, projects, messages..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                  }}
                />
                <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-overlay)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-default)' }}>ESC</kbd>
              </div>

              {/* Results */}
              <div className="scroll-y" style={{ maxHeight: 380, overflowY: 'auto' }}>
                {!q && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Type to search tasks, projects, and chat messages
                  </div>
                )}
                {q && !hasResults && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}

                {taskResults.length > 0 && (
                  <SearchGroup label="Tasks" icon={<FileText size={12} />}>
                    {taskResults.slice(0, 4).map((task) => (
                      <SearchItem
                        key={task.id}
                        onClick={() => { openTaskPanel(task.id); setSearchOpen(false); }}
                        label={highlight(task.title)}
                        sub={highlight(task.description?.slice(0, 60) + '...' || '')}
                      />
                    ))}
                  </SearchGroup>
                )}

                {projectResults.length > 0 && (
                  <SearchGroup label="Projects" icon={<FolderOpen size={12} />}>
                    {projectResults.map((project) => (
                      <SearchItem
                        key={project.id}
                        onClick={() => { router.push(`/workspace/${WORKSPACE.id}/project/${project.id}`); setSearchOpen(false); }}
                        label={highlight(project.name)}
                        sub={project.description || ''}
                      />
                    ))}
                  </SearchGroup>
                )}

                {chatResults.length > 0 && (
                  <SearchGroup label="Chat Messages" icon={<MessageSquare size={12} />}>
                    {chatResults.slice(0, 3).map((msg) => (
                      <SearchItem
                        key={msg.id}
                        onClick={() => { openTaskPanel(msg.task_id, 'chat'); setSearchOpen(false); }}
                        label={msg.sender.name}
                        sub={highlight(msg.content.slice(0, 80))}
                      />
                    ))}
                  </SearchGroup>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SearchGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function SearchItem({ label, sub, onClick }: { label: React.ReactNode; sub: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '8px 16px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{sub}</div>}
      </div>
      <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}
