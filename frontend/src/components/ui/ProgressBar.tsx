'use client';

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, label, size = 'sm' }: ProgressBarProps) {
  const h = size === 'sm' ? 5 : 7;

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="progress-bar-bg" style={{ height: h }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
