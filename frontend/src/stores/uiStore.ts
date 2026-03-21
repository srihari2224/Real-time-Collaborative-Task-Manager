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
  toggleSidebar: () => void;
  setSearchOpen: (v: boolean) => void;
  openTaskPanel: (taskId: string, tab?: 'overview' | 'chat' | 'attachments' | 'activity') => void;
  closeTaskPanel: () => void;
  setActivePanelTab: (tab: 'overview' | 'chat' | 'attachments' | 'activity') => void;
  setActiveView: (view: ViewType) => void;
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  setOfflineBanner: (v: boolean) => void;
}

/* Read saved theme from localStorage — default to 'dark' */
const getSavedTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('tf-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
};

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  taskPanelOpen: false,
  activePanelTaskId: null,
  activePanelTab: 'overview',
  activeView: 'list',
  theme: 'dark',  // default dark; Providers will sync from localStorage
  offlineBanner: false,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSearchOpen: (v) => set({ searchOpen: v }),
  openTaskPanel: (taskId, tab = 'overview') =>
    set({ taskPanelOpen: true, activePanelTaskId: taskId, activePanelTab: tab }),
  closeTaskPanel: () => set({ taskPanelOpen: false, activePanelTaskId: null }),
  setActivePanelTab: (tab) => set({ activePanelTab: tab }),
  setActiveView: (view) => set({ activeView: view }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('tf-theme', next);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(next);
      }
      return { theme: next };
    }),
  setTheme: (t) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf-theme', t);
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(t);
    }
    set({ theme: t });
  },
  setOfflineBanner: (v) => set({ offlineBanner: v }),
}));

export { getSavedTheme };
