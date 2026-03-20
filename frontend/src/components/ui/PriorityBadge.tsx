'use client';

import { Priority } from '@/types';
import { PRIORITY_CONFIG } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, showLabel = true, size = 'sm' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={`badge priority-${priority}`}
      style={{ fontSize: size === 'sm' ? 10.5 : 12, gap: 4, padding: size === 'sm' ? '2px 7px' : '3px 9px' }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.color, flexShrink: 0, display: 'inline-block' }} />
      {showLabel && config.label}
    </span>
  );
}
