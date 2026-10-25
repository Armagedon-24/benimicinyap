'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  ClipboardList,
  Terminal,
  Info,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Database,
  TrendingUp,
  Save,
  Percent,
  Banknote,
  Receipt,
  CreditCard,
  Settings,
  AlertTriangle,
  Mail,
  MailOpen,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import { TurkishLiraIcon } from '@/components/ui/TurkishLiraIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import type { User, Task, ContactMessage } from '@/lib/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'secondary' },
  assigned: { label: 'Atandı', variant: 'default' },
  in_progress: { label: 'Devam Ediyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'outline' },
  cancelled: { label: 'İptal', variant: 'destructive' },
};

export default function AdminPanel() {
  const { currentUser, tasks, setTasks, addLog, systemLogs, addLog: storeAddLog } = useAppStore();

  const [users, setUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Revenue system state
  const [revenue, setRevenue] = useState<any>(null);
  const [settings, setSettings] = useState<any[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Local settings form
  const [commissionRate, setCommissionRate] = useState(10);
  const [commissionMode, setCommissionMode] = useState('percentage');
  const [minCommission, setMinCommission] = useState(10);
  const [maxCommission, setMaxCommission] = useState(500);
  const [commissionPayer, setCommissionPayer] = useState('tasker');
  const [listingFee, setListingFee] = useState(0);
  const [listingFeeEnabled, setListingFeeEnabled] = useState(false);
  const [withdrawFeeRate, setWithdrawFeeRate] = useState(1);
  const [minWithdrawFee, setMinWithdrawFee] = useState(5);
  const [maxWithdrawFee, setMaxWithdrawFee] = useState(100);
  const [withdrawFeeEnabled, setWithdrawFeeEnabled] = useState(true);

  // AI approval guard settings
  const [aiBlockEnabled, setAiBlockEnabled] = useState(true);
  const [aiBlockThreshold, setAiBlockThreshold] = useState(30);

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString('tr-TR') : '';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    storeAddLog('Admin verileri yenileniyor...');
    try {
      const [usersRes, tasksRes, statsRes, settingsRes, revenueRes, messagesRes] = await Promise.all([
        fetch('/api/admin?action=users'),
        fetch('/api/tasks'),
        fetch('/api/admin?action=stats'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/revenue'),
        fetch('/api/admin/messages'),
      ]);
      const [usersData, tasksData, statsData, settingsData, revenueData, messagesData] = await Promise.all([
        usersRes.json(),
        tasksRes.json(),
        statsRes.json(),
        settingsRes.json(),
        revenueRes.json(),
        messagesRes.json(),
      ]);
      if (usersData.success) setUsers(usersData.users);
      if (tasksData.success) {
        setAllTasks(tasksData.tasks);
        setTasks(tasksData.tasks);
      }
      if (statsData.success) setStats(statsData.stats);
      if (settingsData.success) {
        setSettings(settingsData.settings);
        applySettingsToLocal(settingsData.settings);
      }
      if (revenueData.success) setRevenue(revenueData.revenue);
      if (messagesData.success) {
        setContactMessages(messagesData.messages || []);
        setUnreadMessages(messagesData.unreadCount || 0);
      }
      storeAddLog('Admin verileri başarıyla yüklendi');
    } catch {
      storeAddLog('Admin veri yükleme hatası');
    } finally {
      setLoading(false);
      setRevenueLoading(false);
    }
  }, [setTasks, storeAddLog]);

  const applySettingsToLocal = (s: any[]) => {
    const m: Record<string, string> = {};
    s.forEach((item) => { m[item.key] = item.value; });
    if (m['commission_rate'] !== undefined) setCommissionRate(parseFloat(m['commission_rate']));
    if (m['commission_mode'] !== undefined) setCommissionMode(m['commission_mode']);
    if (m['min_commission'] !== undefined) setMinCommission(parseFloat(m['min_commission']));
    if (m['max_commission'] !== undefined) setMaxCommission(parseFloat(m['max_commission']));
    if (m['commission_payer'] !== undefined) setCommissionPayer(m['commission_payer']);
    if (m['listing_fee'] !== undefined) setListingFee(parseFloat(m['listing_fee']));
    if (m['listing_fee_enabled'] !== undefined) setListingFeeEnabled(m['listing_fee_enabled'] === 'true');
    if (m['withdraw_fee_rate'] !== undefined) setWithdrawFeeRate(parseFloat(m['withdraw_fee_rate']));
    if (m['min_withdraw_fee'] !== undefined) setMinWithdrawFee(parseFloat(m['min_withdraw_fee']));
    if (m['max_withdraw_fee'] !== undefined) setMaxWithdrawFee(parseFloat(m['max_withdraw_fee']));
    if (m['withdraw_fee_enabled'] !== undefined) setWithdrawFeeEnabled(m['withdraw_fee_enabled'] === 'true');
    if (m['ai_block_enabled'] !== undefined) setAiBlockEnabled(m['ai_block_enabled'] !== 'false');
    if (m['ai_block_threshold'] !== undefined) setAiBlockThreshold(parseFloat(m['ai_block_threshold']) || 0);
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  const handleSeed = async () => {
    setSeedLoading(true);
    storeAddLog('DB sıfırlama başlatıldı...');
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        storeAddLog('DB sıfırlandı ve yeniden dolduruldu');
        await fetchAll();
      } else {
        toast.error(data.message || 'Hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setSeedLoading(false);
    }
  };
  const handleMarkMessage = async (id: string, read: boolean) => {
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read }),
      });
      const data = await res.json();
      if (data.success) {
        setContactMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read } : m)));
        setUnreadMessages((prev) => Math.max(0, prev + (read ? -1 : 1)));
      } else {
        toast.error(data.message || 'İşlem başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleMarkAllMessagesRead = async () => {
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setContactMessages((prev) => prev.map((m) => ({ ...m, read: true })));
        setUnreadMessages(0);
        toast.success('Tüm mesajlar okundu olarak işaretlendi');
      } else {
        toast.error(data.message || 'İşlem başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setContactMessages((prev) => {
          const target = prev.find((m) => m.id === id);
          if (target && !target.read) setUnreadMessages((u) => Math.max(0, u - 1));
          return prev.filter((m) => m.id !== id);
        });
        toast.success('Mesaj silindi');
      } else {
        toast.error(data.message || 'Silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleResolveDispute = async (taskId: string, action: 'completed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'completed' ? 'Ödeme görevliye aktarıldı!' : 'Ödeme işverene iade edildi!');
        storeAddLog(`Uyuşmazlık çözüldü (${action}): Görev ID: ${taskId}`);
        await fetchAll();
      } else {
        toast.error(data.message || 'Çözüm işlemi başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const payload = [
        { key: 'commission_rate', value: String(commissionRate) },
        { key: 'commission_mode', value: commissionMode },
        { key: 'min_commission', value: String(minCommission) },
        { key: 'max_commission', value: String(maxCommission) },
        { key: 'commission_payer', value: commissionPayer },
        { key: 'listing_fee', value: String(listingFee) },
        { key: 'listing_fee_enabled', value: String(listingFeeEnabled) },
        { key: 'withdraw_fee_rate', value: String(withdrawFeeRate) },
        { key: 'min_withdraw_fee', value: String(minWithdrawFee) },
        { key: 'max_withdraw_fee', value: String(maxWithdrawFee) },
        { key: 'withdraw_fee_enabled', value: String(withdrawFeeEnabled) },
        { key: 'ai_block_enabled', value: String(aiBlockEnabled) },
        { key: 'ai_block_threshold', value: String(aiBlockThreshold) },
      ];
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Komisyon ayarları kaydedildi');
        storeAddLog('Komisyon ayarları güncellendi');
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleTC = async (user: User) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust-balance', userId: user.id, amount: 0 }),
      });
      // TC toggle is simulated via the adjust balance - we'll toggle locally
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, tcVerified: !u.tcVerified } : u))
      );
      storeAddLog(`TC doğrulama değiştirildi: ${user.fullName} → ${!user.tcVerified}`);
      toast.success(`${user.fullName} T.C. doğrulama güncellendi`);
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const handleAdjustBalance = async (userId: string, amount: number) => {
    if (isNaN(amount) || amount === 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust-balance', userId, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, walletBalance: data.user.walletBalance } : u))
        );
        storeAddLog(`Bakiye ayarlandı: ${userId} → ${amount > 0 ? '+' : ''}${formatTL(amount)}`);
        toast.success(`Bakiye güncellendi: ${amount > 0 ? '+' : ''}${formatTL(amount)}`);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const handleDeleteUser = async (userId: string, fullName: string) => {
    try {
      const res = await fetch(`/api/admin?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        storeAddLog(`Kullanıcı silindi: ${fullName}`);
        toast.success(`${fullName} silindi`);
        await fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const handleTaskStatus = async (taskId: string, status: string, assignedToId?: string, assignedToName?: string) => {
    try {
      const body: any = { action: 'task-status', taskId, status };
      if (assignedToId) body.assignedToId = assignedToId;
      if (assignedToName) body.assignedToName = assignedToName;

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        storeAddLog(`Görev durumu değiştirildi: ${taskId} → ${status}`);
        toast.success('Görev durumu güncellendi');
        await fetchAll();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Admin Paneli
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Platform yönetimi ve izleme
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Verileri Yenile
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={seedLoading}>
                  {seedLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  DB Sıfırla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Veritabanı Sıfırla</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tüm veriler silinecek ve demo veriler yeniden oluşturulacak. Bu işlem geri
                    alınamaz. Emin misiniz?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSeed}>Sıfırla</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full max-w-4xl overflow-x-auto gap-0.5 p-0.5 h-auto">
          <TabsTrigger value="overview" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Genel Durum
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Kullanıcılar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Görev & Güvence
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Gelir Sistemi
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              İletişim Kutusu
              {unreadMessages > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="console" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Sistem Konsolu
          </TabsTrigger>
          <TabsTrigger value="admin-info" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Yönetici
          </TabsTrigger>
          <TabsTrigger value="disputes" className="text-xs whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2">
            Uyuşmazlık Çözümü
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          {stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-600' },
                  { label: 'Görev', value: stats.totalTasks, icon: ClipboardList, color: 'text-purple-600' },
                  { label: 'Bekleyen', value: stats.pendingTasks, icon: Info, color: 'text-amber-600' },
                  { label: 'Tamamlanan', value: stats.completedTasks, icon: UserCheck, color: 'text-green-600' },
                  { label: 'İşlem Hacmi', value: formatTL(stats.totalVolume), icon: TurkishLiraIcon, color: 'text-red-600' },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="p-4 text-center">
                      <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1.5`} />
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold mt-0.5">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Financial summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Finansal Özet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-xs text-muted-foreground">Toplam İşlem Hacmi</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatTL(stats.totalVolume)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <p className="text-xs text-muted-foreground">Escrow Hacmi</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {formatTL(stats.escrowVolume)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-5">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Kullanıcı</TableHead>
                      <TableHead className="text-xs">Rol</TableHead>
                      <TableHead className="text-xs">T.C.</TableHead>
                      <TableHead className="text-xs">Bakiye</TableHead>
                      <TableHead className="text-xs">Şehir</TableHead>
                      <TableHead className="text-xs text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {user.role === 'admin' ? 'Admin' : 'Üye'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.tcVerified}
                            onCheckedChange={() => handleToggleTC(user)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatTL(user.walletBalance)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.city}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <BalanceAdjustButton userId={user.id} onAdjust={handleAdjustBalance} />
                            {user.role !== 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Kullanıcı Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <strong>{user.fullName}</strong> kullanıcısını ve tüm
                                      ilişkili verileri silmek istediğinize emin misiniz?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.fullName)}>
                                      Sil
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-5">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Görev</TableHead>
                      <TableHead className="text-xs">Kategori</TableHead>
                      <TableHead className="text-xs">Durum</TableHead>
                      <TableHead className="text-xs">Ücret</TableHead>
                      <TableHead className="text-xs">Atanan</TableHead>
                      <TableHead className="text-xs text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTasks.map((task) => {
                      const status = statusMap[task.status] || statusMap.pending;
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <p className="text-sm font-medium max-w-48 truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.city}</p>
                          </TableCell>
                          <TableCell className="text-xs">{task.category}</TableCell>
                          <TableCell>
                            <Select
                              value={task.status}
                              onValueChange={(v) => handleTaskStatus(task.id, v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Bekliyor</SelectItem>
                                <SelectItem value="assigned">Atandı</SelectItem>
                                <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                                <SelectItem value="completed">Tamamlandı</SelectItem>
                                <SelectItem value="cancelled">İptal</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {formatTL(task.fee)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {task.assignedToName || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <AssignTaskerSelect
                              task={task}
                              users={users.filter((u) => u.role !== 'admin')}
                              onAssign={(userId, userName) =>
                                handleTaskStatus(task.id, 'assigned', userId, userName)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue System Tab */}
        <TabsContent value="revenue" className="mt-5 space-y-5">
          {revenueLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Revenue Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs text-muted-foreground">Toplam Platform Geliri</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatTL(revenue?.totalRevenue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="w-4 h-4 text-blue-600" />
                      <p className="text-xs text-muted-foreground">Bugünkü Gelir</p>
                    </div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatTL(revenue?.todayRevenue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="w-4 h-4 text-purple-600" />
                      <p className="text-xs text-muted-foreground">Aylık Gelir</p>
                    </div>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatTL(revenue?.monthRevenue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <p className="text-xs text-muted-foreground">Ort. Komisyon / Görev</p>
                    </div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {formatTL(revenue?.avgCommission || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TurkishLiraIcon className="w-4 h-4 text-emerald-600" />
                    Gelir Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <p className="text-xs text-muted-foreground">Görev Komisyonları</p>
                      <p className="text-base font-bold text-blue-600">{formatTL(revenue?.totalCommissionEarned || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{revenue?.tasksWithCommission || 0} görevden</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-xs text-muted-foreground">Escrow Ücretleri</p>
                      <p className="text-base font-bold text-green-600">{formatTL(revenue?.totalPlatformFees || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Tamamlanan görevlerden</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <p className="text-xs text-muted-foreground">Çekim Ücretleri</p>
                      <p className="text-base font-bold text-amber-600">{formatTL(revenue?.totalWithdrawFees || 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Banka çekimlerinden</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Settings */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Komisyon Ayarları
                    </CardTitle>
                    <Button size="sm" onClick={handleSaveSettings} disabled={settingsSaving}>
                      {settingsSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Kaydet
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Görev Komisyonu */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Percent className="w-4 h-4 text-blue-600" />
                      Görev Tamamlama Komisyonu
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Komisyon Modu</Label>
                        <Select value={commissionMode} onValueChange={setCommissionMode}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Yüzde (%)</SelectItem>
                            <SelectItem value="flat">Sabit Tutar (₺)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Komisyonu Kim Öder?</Label>
                        <Select value={commissionPayer} onValueChange={setCommissionPayer}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tasker">Hizmet Veren</SelectItem>
                            <SelectItem value="requester">Görev Sahibi</SelectItem>
                            <SelectItem value="both">İkisi Birlikte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          {commissionMode === 'percentage' ? `Komisyon Oranı: %${commissionRate}` : `Sabit Komisyon: ${commissionRate} ₺`}
                        </Label>
                        <span className="text-xs font-medium text-blue-600">
                          {commissionMode === 'percentage'
                            ? `Örnek: 1000₺ görev → ${Math.max(minCommission, Math.min((1000 * commissionRate) / 100, maxCommission)).toFixed(0)}₺ komisyon`
                            : `Her görev için ${commissionRate}₺`}
                        </span>
                      </div>
                      <Slider
                        value={[commissionMode === 'percentage' ? commissionRate : commissionRate * 10]}
                        min={commissionMode === 'percentage' ? 1 : 1}
                        max={commissionMode === 'percentage' ? 30 : 500}
                        step={1}
                        onValueChange={(v) => setCommissionRate(commissionMode === 'percentage' ? v[0] : v[0] / 10)}
                        className="py-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Minimum Komisyon (₺)</Label>
                        <Input
                          type="number"
                          className="h-9"
                          value={minCommission}
                          onChange={(e) => setMinCommission(parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Maksimum Komisyon (₺)</Label>
                        <Input
                          type="number"
                          className="h-9"
                          value={maxCommission}
                          onChange={(e) => setMaxCommission(parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Yayınlama Ücreti */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-600" />
                        Görev Yayınlama Ücreti
                      </h4>
                      <Switch
                        checked={listingFeeEnabled}
                        onCheckedChange={setListingFeeEnabled}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>
                    {listingFeeEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Yayınlama Ücreti (₺)</Label>
                          <Input
                            type="number"
                            className="h-9"
                            value={listingFee}
                            onChange={(e) => setListingFee(parseFloat(e.target.value) || 0)}
                            min={0}
                            disabled={!listingFeeEnabled}
                          />
                          <p className="text-[10px] text-muted-foreground">Her görev yayınlamasında alınacak ücret</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Çekim Ücreti */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-red-600" />
                        Banka Çekim Ücreti
                      </h4>
                      <Switch
                        checked={withdrawFeeEnabled}
                        onCheckedChange={setWithdrawFeeEnabled}
                        className="data-[state=checked]:bg-red-500"
                      />
                    </div>
                    {withdrawFeeEnabled && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Çekim Komisyon Oranı: %{withdrawFeeRate}</Label>
                            <span className="text-xs font-medium text-red-600">
                              Örnek: 1000₺ çekim → {Math.max(minWithdrawFee, Math.min((1000 * withdrawFeeRate) / 100, maxWithdrawFee)).toFixed(0)}₺ ücret
                            </span>
                          </div>
                          <Slider
                            value={[withdrawFeeRate]}
                            min={0}
                            max={5}
                            step={0.1}
                            onValueChange={(v) => setWithdrawFeeRate(v[0])}
                            className="py-2"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Minimum Çekim Ücreti (₺)</Label>
                            <Input
                              type="number"
                              className="h-9"
                              value={minWithdrawFee}
                              onChange={(e) => setMinWithdrawFee(parseFloat(e.target.value) || 0)}
                              min={0}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Maksimum Çekim Ücreti (₺)</Label>
                            <Input
                              type="number"
                              className="h-9"
                              value={maxWithdrawFee}
                              onChange={(e) => setMaxWithdrawFee(parseFloat(e.target.value) || 0)}
                              min={0}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* AI Onay Güvenliği */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        AI Onay Güvenliği (Kanıt Taraması)
                      </h4>
                      <Switch
                        checked={aiBlockEnabled}
                        onCheckedChange={setAiBlockEnabled}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                    {aiBlockEnabled && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Onay Engelleme Eşiği: %{aiBlockThreshold} insan güveni</Label>
                          <span className="text-xs font-medium text-emerald-600">
                            %{aiBlockThreshold} altı teslimde işveren "onaylayamaz"
                          </span>
                        </div>
                        <Slider
                          value={[aiBlockThreshold]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(v) => setAiBlockThreshold(v[0])}
                          className="py-2"
                        />
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Teslimde otomatik AI taraması insan güveni skoru üretir (0-100). Skor bu eşiğin altındaysa işverenin onay butonu kilitlenir ve API'de 403 ile reddedilir; yönetici uyuşmazlık panelinden override edebilir.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Revenue Transactions */}
              {revenue?.recentRevenue && revenue.recentRevenue.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Son Gelir İşlemleri</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">İşlem</TableHead>
                            <TableHead className="text-xs">Kullanıcı</TableHead>
                            <TableHead className="text-xs">Tür</TableHead>
                            <TableHead className="text-xs text-right">Tutar</TableHead>
                            <TableHead className="text-xs">Tarih</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenue.recentRevenue.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs font-medium max-w-36 truncate">
                                {tx.taskTitle || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tx.user?.fullName || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {tx.type === 'platform_commission' ? 'Komisyon' : tx.type === 'escrow_release' ? 'Escrow Ücreti' : 'Diğer'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold text-emerald-600">
                                +{formatTL(tx.type === 'platform_commission' ? tx.amount : (tx.platformFee || 0))}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Console Tab */}
        <TabsContent value="console" className="mt-5">
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-600" />
                Sistem Konsolu & Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/90 dark:bg-black rounded-lg p-4 font-mono text-[11px] text-green-400 max-h-80 overflow-y-auto">
                {systemLogs.length === 0 ? (
                  <p className="text-green-600/50">Sistem logları bekleniyor...</p>
                ) : (
                  systemLogs.map((log, i) => (
                    <div key={i} className="py-0.5 border-b border-green-900/30 last:border-0">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Info Tab */}
        <TabsContent value="admin-info" className="mt-5">
          {currentUser && (
            <Card className="max-w-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold">
                    {currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{currentUser.fullName}</h3>
                    <Badge variant="destructive" className="text-[10px] mt-1">
                      Sistem Yöneticisi
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">E-posta</p>
                    <p className="font-medium">{currentUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Şehir</p>
                    <p className="font-medium">{currentUser.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cüzdan</p>
                    <p className="font-medium text-blue-600">{formatTL(currentUser.walletBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Escrow</p>
                    <p className="font-medium text-amber-600">{formatTL(currentUser.escrowBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">T.C. Doğrulama</p>
                    <p className="font-medium">{currentUser.tcVerified ? '✓ Onaylı' : '✗ Onaysız'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kayıt Tarihi</p>
                    <p className="font-medium">{formatDate(currentUser.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Aktif Uyuşmazlıklar ({allTasks.filter(t => t.status === "disputed").length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allTasks.filter(t => t.status === "disputed").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Şu anda aktif uyuşmazlık bulunmamaktadır.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allTasks.filter(t => t.status === "disputed").map((task) => (
                    <div key={task.id} className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/10 dark:bg-red-950/10 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                        <div>
                          <h4 className="font-bold text-sm">{task.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>Görev Ücreti: <strong className="text-blue-600">{formatTL(task.fee)}</strong></span>
                            <span>•</span>
                            <span>Kategori: {task.category}</span>
                            <span>•</span>
                            <span>Şehir: {task.city}</span>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs self-start">İtiraz Edildi</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-background rounded-lg border border-red-200/50 space-y-1">
                          <p className="font-semibold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            İşverenin İtiraz Gerekçesi:
                          </p>
                          <p className="italic leading-relaxed">{task.disputeReason || 'Gerekçe belirtilmemiş.'}</p>
                          {task.disputedAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">Tarih: {new Date(task.disputedAt).toLocaleString('tr-TR')}</p>
                          )}
                        </div>

                        <div className="p-3 bg-background rounded-lg border space-y-2">
                          <p className="font-semibold text-muted-foreground flex items-center gap-1">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Görevlinin Teslim Kanıtı:
                          </p>
                          <p className="italic leading-relaxed">{task.evidenceDescription || 'Kanıt açıklaması yok.'}</p>
                          {task.evidenceLocation && (
                            <p className="text-[10px] text-muted-foreground">Konum: {task.evidenceLocation}</p>
                          )}
                          {task.aiCheckVerdict && (
                            <div className={`flex items-center gap-2 p-2 rounded-md border text-[11px] ${
                              task.aiCheckVerdict === 'human'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : task.aiCheckVerdict === 'ai_suspected'
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            }`}>
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-semibold">
                                Yapay Zeka Taraması: {task.aiCheckVerdict === 'human' ? 'İnsan Yapımı' : task.aiCheckVerdict === 'ai_suspected' ? 'AI Üretimi Şüphesi' : 'Belirsiz'} (%{Math.round(task.aiCheckScore || 0)})
                              </span>
                            </div>
                          )}
                          {task.aiCheckReason && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{task.aiCheckReason}</p>
                          )}
                          {task.evidencePhoto && (
                            <div className="mt-1">
                              <p className="text-[10px] text-muted-foreground mb-1">Gönderilen Fotoğraf:</p>
                              <a href={task.evidencePhoto} target="_blank" rel="noreferrer" className="block relative w-32 aspect-video rounded overflow-hidden border hover:opacity-85">
                                <img src={task.evidencePhoto} alt="Kanıt" className="w-full h-full object-cover" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end border-t pt-3">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5"
                          onClick={() => handleResolveDispute(task.id, 'completed')}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Haklı Bul & Görevliye Öde
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs gap-1.5"
                          onClick={() => handleResolveDispute(task.id, 'cancelled')}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          İptal Et & İşverene İade Et
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* İletişim Kutusu Tab — Hakkında sayfasından gelen mesajlar (sadece admin) */}
        <TabsContent value="messages" className="mt-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Gelen Mesajlar
                  {unreadMessages > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {unreadMessages} okunmamış
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={fetchAll}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Yenile
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={handleMarkAllMessagesRead}
                    disabled={unreadMessages === 0}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tümünü Okundu İşaretle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contactMessages.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Henüz mesaj yok. Hakkında sayfasından gönderilen mesajlar burada görünür.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-3.5 transition-all ${
                        m.read
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30'
                          : 'border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/25 border-l-4 border-l-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold">{m.name}</span>
                            {!m.read && (
                              <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[9px] px-1.5 py-0">YENİ</Badge>
                            )}
                          </div>
                          <a href={`mailto:${m.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            {m.email}
                          </a>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(m.createdAt).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 h-7"
                            onClick={() => handleMarkMessage(m.id, !m.read)}
                          >
                            {m.read ? <Mail className="w-3 h-3" /> : <MailOpen className="w-3 h-3" />}
                            {m.read ? 'Okunmadı Yap' : 'Okundu'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDeleteMessage(m.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Sil
                          </Button>
                        </div>
                      </div>
                      {m.subject && (
                        <p className="text-xs font-semibold mt-2.5 text-slate-700 dark:text-slate-200">
                          Konu: {m.subject}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                        {m.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-component: Balance adjust button with input
function BalanceAdjustButton({ userId, onAdjust }: { userId: string; onAdjust: (id: string, amt: number) => void }) {
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setOpen(!open)}
        title="Bakiye ayarla"
      >
        <TurkishLiraIcon className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-popover border rounded-lg p-2 shadow-lg w-44 space-y-2">
          <Input
            type="number"
            placeholder="Tutar (±)"
            className="h-7 text-xs"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => {
                onAdjust(userId, parseFloat(amount) || 0);
                setOpen(false);
                setAmount('');
              }}
            >
              Uygula
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setOpen(false);
                setAmount('');
              }}
            >
              Kapat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Assign tasker select
function AssignTaskerSelect({
  task,
  users,
  onAssign,
}: {
  task: Task;
  users: User[];
  onAssign: (userId: string, userName: string) => void;
}) {
  if (task.status !== 'pending') return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <Select onValueChange={(v) => {
      const user = users.find((u) => u.id === v);
      if (user) onAssign(user.id, user.fullName);
    }}>
      <SelectTrigger className="h-7 text-xs w-32">
        <SelectValue placeholder="Ata" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}