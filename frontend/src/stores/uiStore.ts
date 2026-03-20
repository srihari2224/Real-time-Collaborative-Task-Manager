import { create } from 'zustand';
import { ViewType } from '@/types';

interface UIStore {
  sidebarOpen: boolean;
  searchOpen: boolean;
  taskPanelOpen: boolean;
  activePanelTaskId: string | null;
  activePanelTab: 'overview' | 'chat' | 'attachments' | 'activity';
  activeView: ViewType;
  theme: 'dark' | 'light';
  offlineBanner: boolean;

  setSidebarOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  openTaskPanel: (taskId: string, tab?: 'overview' | 'chat' | 'attachments' | 'activity') => void;
  closeTaskPanel: () => void;
  setActivePanelTab: (tab: 'overview' | 'chat' | 'attachments' | 'activity') => void;
  setActiveView: (view: ViewType) => void;
  toggleTheme: () => void;
  setOfflineBanner: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  taskPanelOpen: false,
  activePanelTaskId: null,
  activePanelTab: 'overview',
  activeView: 'kanban',
  theme: 'dark',
  offlineBanner: false,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  openTaskPanel: (taskId, tab = 'overview') =>
    set({ taskPanelOpen: true, activePanelTaskId: taskId, activePanelTab: tab }),
  closeTaskPanel: () => set({ taskPanelOpen: false, activePanelTaskId: null }),
  setActivePanelTab: (tab) => set({ activePanelTab: tab }),
  setActiveView: (view) => set({ activeView: view }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setOfflineBanner: (v) => set({ offlineBanner: v }),
}));
