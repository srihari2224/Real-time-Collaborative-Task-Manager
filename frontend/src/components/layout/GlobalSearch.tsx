'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, FolderOpen, MessageSquare, ArrowRight, Command } from 'lucide-react';
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
        <mark style={{
          background: 'rgba(37,99,235,0.15)',
          color: 'var(--accent)',
          borderRadius: 3,
          padding: '0 2px',
          fontWeight: 700,
        }}>
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
            className="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          />
          <motion.div
            className="search-modal-wrapper"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="search-modal" onClick={(e) => e.stopPropagation()}>
              {/* Input row */}
              <div className="search-input-row">
                <Search size={15} className="search-icon" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks, projects, messages..."
                  className="search-input"
                />
                {query && (
                  <button className="search-clear-btn" onClick={() => setQuery('')}>
                    <X size={13} />
                  </button>
                )}
                <kbd className="search-esc-kbd">ESC</kbd>
              </div>

              {/* Results */}
              <div className="search-results">
                {!q && (
                  <div className="search-empty-state">
                    <div className="search-empty-icon">
                      <Command size={20} style={{ opacity: 0.3 }} />
                    </div>
                    <p>Type to search across tasks, projects, and chat</p>
                  </div>
                )}
                {q && !hasResults && (
                  <div className="search-empty-state">
                    <p>No results for <strong>"{query}"</strong></p>
                  </div>
                )}

                {taskResults.length > 0 && (
                  <SearchGroup label="Tasks" icon={<FileText size={11} />}>
                    {taskResults.slice(0, 4).map((task) => (
                      <SearchItem
                        key={task.id}
                        onClick={() => { openTaskPanel(task.id); setSearchOpen(false); }}
                        label={highlight(task.title)}
                        sub={highlight(task.description?.slice(0, 60) + '...' || '')}
                        type="task"
                      />
                    ))}
                  </SearchGroup>
                )}

                {projectResults.length > 0 && (
                  <SearchGroup label="Projects" icon={<FolderOpen size={11} />}>
                    {projectResults.map((project) => (
                      <SearchItem
                        key={project.id}
                        onClick={() => { router.push(`/workspace/${WORKSPACE.id}/project/${project.id}`); setSearchOpen(false); }}
                        label={highlight(project.name)}
                        sub={project.description || ''}
                        type="project"
                      />
                    ))}
                  </SearchGroup>
                )}

                {chatResults.length > 0 && (
                  <SearchGroup label="Chat Messages" icon={<MessageSquare size={11} />}>
                    {chatResults.slice(0, 3).map((msg) => (
                      <SearchItem
                        key={msg.id}
                        onClick={() => { openTaskPanel(msg.task_id, 'chat'); setSearchOpen(false); }}
                        label={msg.sender.name}
                        sub={highlight(msg.content.slice(0, 80))}
                        type="chat"
                      />
                    ))}
                  </SearchGroup>
                )}
              </div>

              {/* Footer hint */}
              <div className="search-footer">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SearchGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="search-group">
      <div className="search-group-label">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function SearchItem({
  label,
  sub,
  onClick,
  type,
}: {
  label: React.ReactNode;
  sub: React.ReactNode;
  onClick: () => void;
  type?: string;
}) {
  return (
    <button className="search-item" onClick={onClick}>
      <div className="search-item-content">
        <div className="search-item-label">{label}</div>
        {sub && <div className="search-item-sub">{sub}</div>}
      </div>
      <ArrowRight size={12} className="search-item-arrow" />

      <style jsx>{`
        .search-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          color: var(--text-primary);
          font-family: var(--font-display);
          transition: background var(--transition);
          border-radius: 0;
        }
        .search-item:hover { background: var(--bg-hover); }
        .search-item:hover .search-item-arrow { opacity: 1; transform: translateX(2px); }

        .search-item-content { flex: 1; overflow: hidden; }

        .search-item-label {
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .search-item-sub {
          font-size: 11.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }
        .search-item-arrow {
          color: var(--text-muted);
          flex-shrink: 0;
          opacity: 0;
          transition: all 150ms ease;
        }
      `}</style>
    </button>
  );
}

/* Inject global styles once */
if (typeof document !== 'undefined') {
  const styleId = 'global-search-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .search-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(6px);
        z-index: 1000;
      }
      .search-modal-wrapper {
        position: fixed;
        top: 90px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1001;
        width: 560px;
        max-width: calc(100vw - 40px);
      }
      .search-modal {
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(37,99,235,0.08);
        overflow: hidden;
      }
      .search-input-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-subtle);
      }
      .search-icon { color: var(--accent); flex-shrink: 0; }
      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 14.5px;
        font-weight: 500;
        color: var(--text-primary);
        font-family: var(--font-display);
        letter-spacing: -0.01em;
      }
      .search-input::placeholder { color: var(--text-muted); font-weight: 400; }
      .search-clear-btn {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--bg-elevated);
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 150ms ease;
        flex-shrink: 0;
      }
      .search-clear-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
      .search-esc-kbd {
        font-size: 10px;
        color: var(--text-muted);
        background: var(--bg-overlay);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid var(--border-default);
        font-family: var(--font-display);
        font-weight: 700;
        letter-spacing: 0.05em;
        flex-shrink: 0;
      }
      .search-results {
        max-height: 380px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--border-default) transparent;
      }
      .search-empty-state {
        padding: 36px 16px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .search-empty-icon { margin-bottom: 4px; }
      .search-group { padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
      .search-group:last-child { border-bottom: none; }
      .search-group-label {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px 8px;
        font-size: 10.5px;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }
      .search-footer {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 16px;
        border-top: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
      }
      .search-footer span {
        font-size: 11px;
        color: var(--text-faint);
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }
}