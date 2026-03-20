'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TaskPanel } from '@/components/task/TaskPanel';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">{children}</div>
      <TaskPanel />
    </div>
  );
}
