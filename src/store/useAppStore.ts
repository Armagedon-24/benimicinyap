import { create } from 'zustand';
import type { User, Task, Notification as AppNotification } from '@/lib/types';

export interface BannerData {
  title: string;
  message: string;
  taskTitle?: string;
  fee?: number;
  type?: 'accept' | 'complete' | 'info' | 'success' | 'warning';
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isOnline: boolean;
  toggleOnline: () => void;

  // Banner Notification
  activeBanner: BannerData | null;
  showBanner: (data: BannerData) => void;
  hideBanner: () => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;

  // Wallet
  walletBalance: number;
  escrowBalance: number;
  setWalletBalance: (b: number) => void;
  setEscrowBalance: (b: number) => void;

  // Notifications
  notifications: AppNotification[];
  setNotifications: (n: AppNotification[]) => void;
  addNotification: (n: AppNotification) => void;
  markAllRead: () => void;
  unreadCount: number;

  // Modals
  taskDetailModal: Task | null;
  setTaskDetailModal: (task: Task | null) => void;
  securityModalOpen: boolean;
  setSecurityModalOpen: (v: boolean) => void;
  legalModalOpen: boolean;
  setLegalModalOpen: (v: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
  kycModalOpen: boolean;
  setKycModalOpen: (v: boolean) => void;
  ratingModal: { taskId: string; taskTitle: string; targetUserId: string; targetUserName: string; fromRole: 'requester' | 'tasker' } | null;
  setRatingModal: (v: { taskId: string; taskTitle: string; targetUserId: string; targetUserName: string; fromRole: 'requester' | 'tasker' } | null) => void;
  updateCurrentUser: (data: Partial<User>) => void;
  // System logs
  systemLogs: string[];
  addLog: (msg: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  isAuthenticated: false,
  currentUser: null,
  login: (user) =>
    set({
      isAuthenticated: true,
      currentUser: user,
      walletBalance: user.walletBalance,
      escrowBalance: user.escrowBalance,
      isDarkMode: user.darkMode,
      isOnline: user.isOnline,
    }),
  logout: () =>
    set({
      isAuthenticated: false,
      currentUser: null,
      tasks: [],
      walletBalance: 0,
      escrowBalance: 0,
      notifications: [],
      unreadCount: 0,
      taskDetailModal: null,
      activeTab: 'tasks',
      profileOpen: false,
      kycModalOpen: false,
      ratingModal: null,
    }),

  // UI
  activeTab: 'tasks',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  isOnline: false,
  toggleOnline: () => set((state) => ({ isOnline: !state.isOnline })),

  // Banner Notification
  activeBanner: null,
  showBanner: (data) => set({ activeBanner: data }),
  hideBanner: () => set({ activeBanner: null }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, data) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),

  // Wallet
  walletBalance: 0,
  escrowBalance: 0,
  setWalletBalance: (b) => set({ walletBalance: b }),
  setEscrowBalance: (b) => set({ escrowBalance: b }),

  // Notifications
  notifications: [],
  setNotifications: (n) =>
    set({
      notifications: n,
      unreadCount: n.filter((item) => !item.read).length,
    }),
  addNotification: (n) =>
    set((state) => {
      const updated = [n, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((item) => !item.read).length,
      };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  unreadCount: 0,

  // Modals
  taskDetailModal: null,
  setTaskDetailModal: (task) => set({ taskDetailModal: task }),
  securityModalOpen: false,
  setSecurityModalOpen: (v) => set({ securityModalOpen: v }),
  legalModalOpen: false,
  setLegalModalOpen: (v) => set({ legalModalOpen: v }),
  notificationsOpen: false,
  setNotificationsOpen: (v) => set({ notificationsOpen: v }),
  profileOpen: false,
  setProfileOpen: (v) => set({ profileOpen: v }),
  kycModalOpen: false,
  setKycModalOpen: (v) => set({ kycModalOpen: v }),
  ratingModal: null,
  setRatingModal: (v) => set({ ratingModal: v }),
  updateCurrentUser: (data) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...data } : null,
    })),

  // System logs
  systemLogs: [],
  addLog: (msg) =>
    set((state) => ({
      systemLogs: [
        `[${new Date().toLocaleTimeString('tr-TR')}] ${msg}`,
        ...state.systemLogs,
      ].slice(0, 200),
    })),
}));