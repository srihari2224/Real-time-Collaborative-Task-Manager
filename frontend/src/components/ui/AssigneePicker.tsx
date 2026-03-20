'use client';

/**
 * AssigneePicker — reusable component for assigning a task by email.
 *
 * Behaviour:
 * - User types an email address
 * - On blur / Enter, the email is validated against the backend (GET /users/lookup?email=)
 * - If the user exists → shows their avatar + name, stores their ID
 * - If the user does NOT exist → shows an error message
 * - X button clears the assignment
 */

import { useState, useRef, useCallback } from 'react';
import { Loader2, X, UserCheck, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export interface AssigneeInfo {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AssigneePickerProps {
  value: AssigneeInfo | null;
  onChange: (assignee: AssigneeInfo | null) => void;
  placeholder?: string;
}

export function AssigneePicker({ value, onChange, placeholder = 'Assign to email...' }: AssigneePickerProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookupUser = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/users/lookup?email=${encodeURIComponent(trimmed)}`);
      const user = res.data?.data ?? res.data;
      onChange(user as AssigneeInfo);
      setInput('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'User not found. They must sign in at least once first.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(null);
    setError(null);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Show assigned user card
  if (value) {
    const name = value.full_name || value.email;
    const initial = name[0]?.toUpperCase() ?? '?';
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
        borderRadius: 'var(--radius)', minHeight: 36,
      }}>
        {/* Avatar */}
        <div className="avatar" style={{ width: 22, height: 22, fontSize: 9, background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
          {value.avatar_url
            ? <img src={value.avatar_url} alt={initial} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
            : initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {value.full_name && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value.email}</div>
          )}
        </div>
        <UserCheck size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <button
          onClick={clear}
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, flexShrink: 0 }}
          title="Remove assignee"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  // Input mode
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="email"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); lookupUser(input); }
          }}
          onBlur={() => { if (input.trim().includes('@')) lookupUser(input); }}
          placeholder={placeholder}
          className="input"
          style={{ paddingRight: loading ? 34 : 10, fontSize: 13, width: '100%' }}
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} style={{ position: 'absolute', right: 10, color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
        )}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}
      {!error && input.includes('@') && !loading && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Press Enter or click away to look up this email
        </div>
      )}
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
