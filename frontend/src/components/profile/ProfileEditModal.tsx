'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { profileApi, type ApiUser } from '@/lib/apiClient';
import type { User as AuthUser } from '@/types';

function apiUserToAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.full_name?.trim() || u.email,
    email: u.email,
    avatar_url: u.avatar_url ?? undefined,
    created_at: u.created_at,
  };
}
import { Camera, Check, User, Sparkles, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const AVATAR_PRESETS = [
  { id: 'a1', emoji: '👤', bg: '#dbeafe', color: '#2563eb', label: 'Default' },
  { id: 'a2', emoji: '🧑‍💻', bg: '#ede9fe', color: '#7c3aed', label: 'Dev' },
  { id: 'a3', emoji: '👩‍🎨', bg: '#fce7f3', color: '#db2777', label: 'Designer' },
  { id: 'a4', emoji: '🧑‍🚀', bg: '#cffafe', color: '#0891b2', label: 'Explorer' },
  { id: 'a5', emoji: '🦸', bg: '#dcfce7', color: '#16a34a', label: 'Hero' },
  { id: 'a6', emoji: '🧑‍🔬', bg: '#fef9c3', color: '#ca8a04', label: 'Scientist' },
  { id: 'a7', emoji: '🎯', bg: '#fee2e2', color: '#dc2626', label: 'Focused' },
  { id: 'a8', emoji: '🌟', bg: '#fef3c7', color: '#d97706', label: 'Star' },
  { id: 'a9', emoji: '🦊', bg: '#ffedd5', color: '#ea580c', label: 'Fox' },
  { id: 'a10', emoji: '🐉', bg: '#f0fdf4', color: '#15803d', label: 'Dragon' },
  { id: 'a11', emoji: '🎮', bg: '#ede9fe', color: '#6d28d9', label: 'Gamer' },
  { id: 'a12', emoji: '📚', bg: '#e0f2fe', color: '#0369a1', label: 'Scholar' },
  { id: 'a13', emoji: '🚀', bg: '#f8fafc', color: '#475569', label: 'Rocket' },
  { id: 'a14', emoji: '🌊', bg: '#dbeafe', color: '#1d4ed8', label: 'Ocean' },
  { id: 'a15', emoji: '🔥', bg: '#fef2f2', color: '#991b1b', label: 'Fire' },
];

type Preset = (typeof AVATAR_PRESETS)[number];

export function ProfileEditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.name || '');
    setAvatarUrl(user.avatar_url ?? null);
    setSelectedPreset(null);
  }, [open, user]);

  const presetToUrl = (preset: Preset) =>
    `preset:${preset.id}:${encodeURIComponent(preset.emoji)}:${preset.bg}`;

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setAvatarUrl(presetToUrl(preset));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.update({
        full_name: fullName.trim(),
        avatar_url: avatarUrl ?? undefined,
      });
      setUser(apiUserToAuthUser(updated));
      toast.success('Profile updated');
      onClose();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarDisplay = () => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('preset:')) {
      const parts = avatarUrl.split(':');
      const id = parts[1];
      const emoji = parts[2];
      const preset = AVATAR_PRESETS.find((p) => p.id === id);
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: preset?.bg ?? '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
          }}
        >
          {emoji ? decodeURIComponent(emoji) : ''}
        </div>
      );
    }
    return <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  };

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pem-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="pem-panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pem-header">
              <h2 className="pem-title">Edit profile</h2>
              <button type="button" className="pem-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pem-body scroll-y">
              <div className="pem-hero-avatar-wrap">
                <button
                  type="button"
                  className="pem-hero-avatar"
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarUrl ? getAvatarDisplay() : <span className="pem-initials">{initials}</span>}
                  <span className="pem-avatar-cam">
                    <Camera size={20} />
                  </span>
                </button>
              </div>

              <section className="pem-section">
                <h3 className="pem-section-title">
                  <User size={15} /> Personal info
                </h3>
                <label className="form-label">Display name</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
                <label className="form-label" style={{ marginTop: 14 }}>Email</label>
                <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.65, cursor: 'not-allowed' }} />
                <p className="pem-hint">Email cannot be changed here</p>
              </section>

              <section className="pem-section">
                <h3 className="pem-section-title">
                  <Sparkles size={15} /> Choose avatar
                </h3>
                <div className="pem-grid">
                  {AVATAR_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.96 }}
                      className="pem-preset"
                      title={preset.label}
                    >
                      <div
                        className={`pem-preset-circle ${selectedPreset === preset.id || avatarUrl === presetToUrl(preset) ? 'selected' : ''}`}
                        style={{ background: preset.bg }}
                      >
                        {preset.emoji}
                      </div>
                      <span className="pem-preset-label">{preset.label}</span>
                    </motion.button>
                  ))}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpg,image/jpeg,image/webp"
                  className="pem-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setAvatarUrl(ev.target?.result as string);
                      setSelectedPreset(null);
                      setUploading(false);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-secondary"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={13} className="spin" /> : <Camera size={13} />}
                  {uploading ? 'Processing…' : 'Upload photo'}
                </button>
              </section>
            </div>

            <div className="pem-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>

          <style jsx>{`
            .pem-overlay {
              position: fixed;
              inset: 0;
              z-index: 3000;
              background: rgba(15, 23, 42, 0.55);
              backdrop-filter: blur(6px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
            }
            .pem-panel {
              width: min(520px, 100%);
              max-height: min(92vh, 900px);
              background: var(--bg-surface);
              border: 1px solid var(--border-default);
              border-radius: 16px;
              box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .pem-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 20px;
              border-bottom: 1px solid var(--border-subtle);
              flex-shrink: 0;
            }
            .pem-title {
              margin: 0;
              font-size: 17px;
              font-weight: 800;
              color: var(--text-primary);
              letter-spacing: -0.02em;
            }
            .pem-close {
              width: 36px;
              height: 36px;
              border-radius: var(--radius);
              border: none;
              background: transparent;
              color: var(--text-muted);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 150ms ease, color 150ms ease;
            }
            .pem-close:hover {
              background: var(--bg-hover);
              color: var(--text-primary);
            }
            .pem-body {
              padding: 20px;
              flex: 1;
              overflow-y: auto;
            }
            .pem-hero-avatar-wrap {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
            .pem-hero-avatar {
              position: relative;
              width: 96px;
              height: 96px;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid var(--border-default);
              cursor: pointer;
              padding: 0;
              background: var(--bg-elevated);
            }
            .pem-initials {
              font-size: 32px;
              font-weight: 800;
              color: var(--accent);
            }
            .pem-avatar-cam {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0, 0, 0, 0.4);
              color: white;
              opacity: 0;
              transition: opacity 150ms ease;
            }
            .pem-hero-avatar:hover .pem-avatar-cam {
              opacity: 1;
            }
            .pem-section {
              background: var(--bg-elevated);
              border: 1px solid var(--border-subtle);
              border-radius: var(--radius-lg);
              padding: 16px;
              margin-bottom: 16px;
            }
            .pem-section-title {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              font-weight: 700;
              margin: 0 0 14px;
              color: var(--text-primary);
            }
            .pem-hint {
              font-size: 11px;
              color: var(--text-muted);
              margin: 6px 0 0;
            }
            .pem-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
              gap: 10px;
              margin-bottom: 14px;
            }
            .pem-preset {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              background: none;
              border: none;
              cursor: pointer;
              padding: 4px;
            }
            .pem-preset-circle {
              width: 52px;
              height: 52px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 26px;
              border: 2px solid transparent;
              transition: border-color 150ms ease, transform 150ms ease;
            }
            .pem-preset-circle.selected {
              border-color: var(--accent);
              transform: scale(1.05);
            }
            .pem-preset-label {
              font-size: 9px;
              color: var(--text-muted);
              font-weight: 600;
            }
            .pem-file {
              display: none;
            }
            .pem-footer {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
              padding: 14px 20px;
              border-top: 1px solid var(--border-subtle);
              flex-shrink: 0;
            }
            :global(.spin) {
              animation: pem-spin 0.8s linear infinite;
            }
            @keyframes pem-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
