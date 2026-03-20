'use client';

import { User } from '@/types';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  user: User;
  size?: number;
  showPresence?: boolean;
}

const COLORS = ['#ff6b47', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ user, size = 28, showPresence = false }: AvatarProps) {
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
          }}
        >
          {getInitials(user.name)}
        </div>
      )}
      {showPresence && <div className="presence-dot" />}
    </div>
  );
}

interface PresenceAvatarsProps {
  users: User[];
  max?: number;
  size?: number;
  showPresence?: boolean;
}

export function PresenceAvatars({ users, max = 4, size = 24, showPresence = false }: PresenceAvatarsProps) {
  const shown = users.slice(0, max);
  const extra = users.length - max;

  return (
    <div className="avatar-stack" style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((user, i) => (
        <div key={user.id} className="avatar" style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: shown.length - i, border: '2px solid var(--bg-surface)', borderRadius: '50%', width: size, height: size, flexShrink: 0 }}>
          <Avatar user={user} size={size} showPresence={showPresence} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'var(--bg-overlay)',
            border: '2px solid var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.36,
            fontWeight: 700,
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
