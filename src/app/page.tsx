'use client';

import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { User, Notification as AppNotification } from '@/lib/types';

const AppHeader = dynamic(() => import('@/components/app/AppHeader'), { ssr: false });

import LoginPage from '@/components/app/LoginPage';
const DiscoverTasks = dynamic(() => import('@/components/app/DiscoverTasks'), {
  loading: () => <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>,
  ssr: false
});
const CreateTask = dynamic(() => import('@/components/app/CreateTask'), { ssr: false });
const MyTasks = dynamic(() => import('@/components/app/MyTasks'), { ssr: false });
const Wallet = dynamic(() => import('@/components/app/Wallet'), { ssr: false });
const Reporting = dynamic(() => import('@/components/app/Reporting'), { ssr: false });
const AdminPanel = dynamic(() => import('@/components/app/AdminPanel'), { ssr: false });
const AboutPage = dynamic(() => import('@/components/app/AboutPage'), { ssr: false });
const TaskDetailModal = dynamic(() => import('@/components/app/TaskDetailModal'), { ssr: false });
const ProfilePanel = dynamic(() => import('@/components/app/ProfilePanel'), { ssr: false });
const RatingModal = dynamic(() => import('@/components/app/RatingModal'), { ssr: false });

const SecurityModal = dynamic(() => import('@/components/app/Modals').then((mod) => mod.SecurityModal), { ssr: false });
const LegalModal = dynamic(() => import('@/components/app/Modals').then((mod) => mod.LegalModal), { ssr: false });
const NotificationsPanel = dynamic(() => import('@/components/app/Modals').then((mod) => mod.NotificationsPanel), { ssr: false });
const KycModal = dynamic(() => import('@/components/app/Modals').then((mod) => mod.KycModal), { ssr: false });
const MobilePushBanner = dynamic(() => import('@/components/app/MobilePushBanner'), { ssr: false });

import { showMobileNotificationCard } from '@/lib/audioNotification';

function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-600/5 rounded-full blur-[130px]" />
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, currentUser, login, logout, setTasks, notifications, setNotifications, setWalletBalance, setEscrowBalance, addLog, setActiveTab, updateCurrentUser } = useAppStore();
  const { setTheme } = useTheme();
  const activeTab = useAppStore((s) => s.activeTab);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  const loadUserSession = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const user: User = data.user;
        login(user);
        if (user.darkMode) setTheme('dark');
        return user;
      }
    } catch { /* unauthenticated or expired session */ }
    return null;
  }, [login, setTheme]);

  const fetchUserData = useCallback(async (user: User) => {
    try {
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.success) {
          setTasks(tasksData.tasks || []);
        }
      }

      const notifRes = await fetch(`/api/notifications?userId=${user.id}`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (notifData.success) {
          setNotifications(notifData.notifications || []);
        }
      }

      // Fetch updated user profile from database to sync balances
      const profileRes = await fetch(`/api/users/profile?userId=${user.id}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.success) {
          const updatedUser = profileData.user;
          setWalletBalance(updatedUser.walletBalance);
          setEscrowBalance(updatedUser.escrowBalance);
          updateCurrentUser(updatedUser);
          return;
        }
      } else if (profileRes.status === 404 || profileRes.status === 400) {
        // User not found in DB - session is invalid/expired!
        logout();
        toast.error("Oturumunuz sonlandırıldı veya sıfırlandı. Lütfen tekrar giriş yapın.");
        return;
      }

      // Fallback to local storage values if API fails
      setWalletBalance(user.walletBalance);
      setEscrowBalance(user.escrowBalance);
    } catch (err) {
      console.error('Data fetch error:', err);
    }
  }, [setTasks, setNotifications, setWalletBalance, setEscrowBalance, updateCurrentUser]);

  useEffect(() => {
    const init = async () => {
      const user = await loadUserSession();
      if (user) {
        await fetchUserData(user);
        addLog(`Oturum geri yüklendi: ${user.fullName}`);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const amount = params.get('amount');

    if (paymentStatus === 'success') {
      const parsedAmount = parseFloat(amount || '0');
      toast.success(
        parsedAmount > 0
          ? `${parsedAmount.toLocaleString('tr-TR')} ₺ bakiye başarıyla cüzdanınıza yüklendi!`
          : 'Ödeme işlemi başarıyla tamamlandı!'
      );
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Refetch user data to update wallet balance on UI
      if (currentUser) {
        fetchUserData(currentUser);
      }
    } else if (paymentStatus === 'failed') {
      const reason = params.get('reason') || 'Ödeme iptal edildi veya başarısız oldu.';
      toast.error(`Ödeme Başarısız: ${reason}`);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [isAuthenticated, currentUser, fetchUserData]);

  // Real-time notification polling loop (5 seconds)
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.notifications)) {
            // Find new notifications
            const localIds = new Set(notifications.map(n => n.id));
            const newNotifs = data.notifications.filter((n: any) => !localIds.has(n.id));

            if (newNotifs.length > 0) {
              newNotifs.forEach((n: any) => {
                showMobileNotificationCard({
                  title: n.title,
                  message: n.message,
                  type: n.type === 'success' ? 'accept' : 'info',
                });
              });
              setNotifications(data.notifications);
            }
          }
        }
      } catch (err) {
        console.error('Notification polling error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isAuthenticated, currentUser, notifications, setNotifications]);

  const handleLoginSuccess = () => {
    // FIX: use the freshly logged-in user from the store, not the stale
    // localStorage cache. login() already synced localStorage via the store.
    const user = useAppStore.getState().currentUser;
    if (user) {
      fetchUserData(user);
      addLog(`Giriş yapıldı: ${user.fullName}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks': return <DiscoverTasks />;
      case 'create': return <CreateTask />;
      case 'my-tasks': return <MyTasks />;
      case 'wallet': return <Wallet />;
      case 'dashboard': return <Reporting />;
      case 'about': return <AboutPage />;
      case 'admin':
        return currentUser?.role === 'admin' ? <AdminPanel /> : <DiscoverTasks />;
      case 'profile': return <ProfilePanel />;
      default: return <DiscoverTasks />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0B14] text-slate-800 dark:text-white flex flex-col font-sans relative overflow-x-hidden transition-colors duration-200">
      <BackgroundDecorations />
      <Toaster position="top-right" richColors />
      <MobilePushBanner />

      {!isAuthenticated ? (
        activeTab === 'about' ? (
          <main id="main-content" className="flex-1 relative z-10 px-3 sm:px-4 lg:px-8 py-3 sm:py-6">
            <AboutPage isGuest onBackToLogin={() => setActiveTab('tasks')} />
          </main>
        ) : (
          <main id="main-content" className="flex-1 relative z-10">
            <LoginPage onLoginSuccess={handleLoginSuccess} onAbout={() => setActiveTab('about')} />
          </main>
        )
      ) : (
        <>
          <AppHeader />
          <main id="main-content" className="flex-1 relative z-10">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6">
              {renderTabContent()}
            </div>
          </main>
        </>
      )}

      {isAuthenticated && (
        <>
          <TaskDetailModal />
          <RatingModal />
          <SecurityModal />
          <LegalModal />
          <NotificationsPanel />
          <KycModal />
        </>
      )}
    </div>
  );
}