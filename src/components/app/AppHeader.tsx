'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import {
  Sun,
  Moon,
  Bell,
  Menu,
  LogOut,
  User,
  Globe,
  Scale,
  LayoutDashboard,
  Wallet,
  PlusCircle,
  ClipboardList,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/useAppStore';
import type { User as UserType } from '@/lib/types';

const navItems = [
  { id: 'tasks', label: 'Görevleri Keşfet', icon: Search },
  { id: 'create', label: 'Görev Yayınla', icon: PlusCircle },
  { id: 'my-tasks', label: 'Görevlerim', icon: ClipboardList },
  { id: 'wallet', label: 'Cüzdan & Ödeme', icon: Wallet },
  { id: 'dashboard', label: 'Raporlama Paneli', icon: LayoutDashboard },
];

export default function AppHeader() {
  const { theme, setTheme } = useTheme();
  const {
    activeTab,
    setActiveTab,
    currentUser,
    logout,
    isOnline,
    toggleOnline,
    unreadCount,
    setNotificationsOpen,
    setLegalModalOpen,
    setSecurityModalOpen,
    addLog,
  } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const initials = currentUser.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleNav = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
    addLog(`Sekme değiştirildi: ${tabId}`);
    if (typeof window !== 'undefined') {
      const url = tabId === 'tasks' ? '/' : `/?tab=${tabId}`;
      window.history.pushState({}, '', url);
    }
  };

  const handleLogout = () => {
    addLog(`Kullanıcı çıkış yaptı: ${currentUser.fullName}`);
    logout();
    localStorage.removeItem('current_user');
    setTheme('light');
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const renderNavButtons = () => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="sm"
          className={`relative text-sm px-3 h-9 transition-all duration-200 ${
            activeTab === item.id
              ? 'text-blue-600 dark:text-blue-400 font-bold dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-white/5'
          }`}
          onClick={() => handleNav(item.id)}
        >
          <item.icon className="w-4 h-4 mr-1.5" />
          <span className="hidden lg:inline">{item.label}</span>
          {activeTab === item.id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_8px_#3b82f6] rounded-full" />
          )}
        </Button>
      ))}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className={`relative text-sm px-3 h-9 transition-all duration-200 ${
            activeTab === 'admin'
              ? 'text-blue-600 dark:text-blue-400 font-bold dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-white/5'
          }`}
          onClick={() => handleNav('admin')}
        >
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          <span className="hidden lg:inline">Admin Paneli</span>
          {activeTab === 'admin' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_8px_#3b82f6] rounded-full" />
          )}
        </Button>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-[#0B0C16]/75 border-b border-slate-200/50 dark:border-white/10 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Left: Logo */}
        <button
          className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity"
          onClick={() => handleNav('tasks')}
        >
          <Image
            src="/icons/icon.svg"
            alt="Benim İçin Yap"
            width={40}
            height={40}
            className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 object-contain"
            priority
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight">Benim İçin Yap</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              E2EE • Ödeme Güvencesi
            </span>
          </div>
        </button>

        {/* Center: Navigation (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          {renderNavButtons()}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Online/Offline Toggle */}
          <div className="hidden md:flex items-center gap-1.5 mr-1">
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </span>
            <Switch
              checked={isOnline}
              onCheckedChange={toggleOnline}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          {/* Legal Info */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setLegalModalOpen(true)}
            title="Yasal Bilgi"
          >
            <Scale className="w-4 h-4" />
          </Button>

          {/* Dark Mode */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleThemeToggle}
            title={theme === 'dark' ? 'Açık Mod' : 'Koyu Mod'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => setNotificationsOpen(true)}
            title="Bildirimler"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium max-w-24 truncate">
                  {currentUser.fullName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{currentUser.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={currentUser.tcVerified ? 'default' : 'secondary'} className="text-[10px]">
                    T.C. {currentUser.tcVerified ? '✓ Onaylı' : '✗ Onaysız'}
                  </Badge>
                  {isAdmin && (
                    <Badge variant="destructive" className="text-[10px]">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm" onClick={() => { setActiveTab('profile'); }}>
                <User className="w-4 h-4 mr-2" />
                Profil Bilgileri
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={() => setSecurityModalOpen(true)}>
                <Globe className="w-4 h-4 mr-2" />
                Güvenlik Bilgileri
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-sm text-red-600 dark:text-red-400" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <Image src="/icons/icon.svg" alt="Benim İçin Yap" width={20} height={20} className="w-5 h-5 object-contain" />
                  Benim İçin Yap
                </SheetTitle>
              </SheetHeader>
              <div className="p-3 space-y-1">
                {/* Online toggle for mobile */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                  <span className="text-sm">Durum</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </span>
                    <Switch
                      checked={isOnline}
                      onCheckedChange={toggleOnline}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>
                <Separator className="my-2" />
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start text-sm h-10 ${
                      activeTab === item.id
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : ''
                    }`}
                    onClick={() => handleNav(item.id)}
                  >
                    <item.icon className="w-4 h-4 mr-2.5" />
                    {item.label}
                  </Button>
                ))}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm h-10 ${
                      activeTab === 'admin'
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : ''
                    }`}
                    onClick={() => handleNav('admin')}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2.5" />
                    Admin Paneli
                  </Button>
                )}
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-10"
                  onClick={() => {
                    setActiveTab('profile');
                    setMobileOpen(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2.5" />
                  Profil Bilgileri
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-10"
                  onClick={() => {
                    setSecurityModalOpen(true);
                    setMobileOpen(false);
                  }}
                >
                  <Globe className="w-4 h-4 mr-2.5" />
                  Güvenlik Bilgileri
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-10"
                  onClick={() => {
                    setLegalModalOpen(true);
                    setMobileOpen(false);
                  }}
                >
                  <Scale className="w-4 h-4 mr-2.5" />
                  Yasal Bilgi
                </Button>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-10 text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2.5" />
                  Çıkış Yap
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}