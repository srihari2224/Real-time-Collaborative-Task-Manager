'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TaskPanel } from '@/components/task/TaskPanel';
import { useUIStore } from '@/stores/uiStore';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const offlineBanner = useUIStore((s) => s.offlineBanner);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {offlineBanner && (
          <div className="offline-banner">
            <span>You are offline — changes will sync when reconnected</span>
          </div>
        )}
        {children}
      </div>
      <TaskPanel />
    </div>
  );
}
