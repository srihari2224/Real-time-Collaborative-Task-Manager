'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { profileApi } from '@/lib/apiClient';
import { Camera, Check, User, Sparkles, Loader2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// 15 diverse avatar illustrations sourced as SVG data-uris / emoji for fast rendering
// In production, replace with generated images
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

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName((user as any).full_name || (user as any).name || '');
      setAvatarUrl((user as any).avatar_url || null);
    }
  }, [user]);

  const presetToUrl = (preset: typeof AVATAR_PRESETS[0]) =>
    `preset:${preset.id}:${encodeURIComponent(preset.emoji)}:${preset.bg}`;

  const handleSelectPreset = (preset: typeof AVATAR_PRESETS[0]) => {
    setSelectedPreset(preset.id);
    setAvatarUrl(presetToUrl(preset));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update({ full_name: fullName.trim(), avatar_url: avatarUrl ?? undefined });
      setUser({ ...(user as any), full_name: fullName.trim(), avatar_url: avatarUrl });
      toast.success('Profile updated! ✨', { icon: '🎉' });
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarDisplay = () => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('preset:')) {
      const [, id, emoji] = avatarUrl.split(':');
      const preset = AVATAR_PRESETS.find((p) => p.id === id);
      return (
        <div style={{ width: '100%', height: '100%', background: preset?.bg ?? '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
          {decodeURIComponent(emoji)}
        </div>
      );
    }
    return <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  };

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="My Profile" />
      <div className="page-content scroll-y" style={{ maxWidth: 680 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

          {/* Hero Card */}
          <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', borderRadius: 'var(--radius-xl)', padding: '32px 28px', marginBottom: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: 60, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
              {/* Avatar */}
              <div
                style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.15)', flexShrink: 0, cursor: 'pointer', border: '3px solid rgba(255,255,255,0.3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white' }}
                onClick={() => fileRef.current?.click()}
              >
                {avatarUrl ? getAvatarDisplay() : <span>{initials}</span>}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-hover-overlay">
                  <Camera size={22} />
                </div>
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{fullName || 'Your Name'}</h2>
                <p style={{ fontSize: 13, opacity: 0.8 }}>{user?.email}</p>
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  <Sparkles size={11} /> Pro Member
                </div>
              </div>
            </div>
            <style jsx>{`
              .avatar-hover-overlay { opacity: 0 !important; }
              div:hover > .avatar-hover-overlay { opacity: 1 !important; }
            `}</style>
          </div>

          {/* Name Input */}
          <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-xs)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <User size={15} style={{ color: 'var(--accent)' }} /> Personal Info
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Display Name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{ maxWidth: 360 }}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="input" value={user?.email ?? ''} disabled style={{ maxWidth: 360, opacity: 0.6, cursor: 'not-allowed' }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed from here</p>
            </div>
          </section>

          {/* Avatar Picker */}
          <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-xs)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Sparkles size={15} style={{ color: 'var(--accent)' }} /> Choose Avatar
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>Pick a preset avatar or upload your own photo</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 12, marginBottom: 20 }}>
              {AVATAR_PRESETS.map((preset) => (
                <motion.button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className={`avatar-option ${selectedPreset === preset.id || avatarUrl === presetToUrl(preset) ? 'selected' : ''}`}
                  title={preset.label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: '3px solid transparent', cursor: 'pointer', padding: 6, borderRadius: 12 }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: preset.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: 'var(--shadow-sm)', border: selectedPreset === preset.id || avatarUrl === presetToUrl(preset) ? `2px solid var(--accent)` : '2px solid transparent' }}>
                    {preset.emoji}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{preset.label}</span>
                  {(selectedPreset === preset.id || avatarUrl === presetToUrl(preset)) && (
                    <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -42, marginLeft: 34, boxShadow: 'var(--shadow-sm)' }}>
                      <Check size={10} color="white" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Or upload a custom photo</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpg,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => {
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
              }} />
              <button
                onClick={() => fileRef.current?.click()}
                className="btn btn-secondary"
                style={{ fontSize: 12.5 }}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} />}
                {uploading ? 'Processing…' : 'Upload Photo (PNG / JPG)'}
              </button>
            </div>
          </section>

          {/* Save */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
