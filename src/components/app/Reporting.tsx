'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { TurkishLiraIcon } from '@/components/ui/TurkishLiraIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

interface Stats {
  totalUsers: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  assignedTasks: number;
  completedTasks: number;
  totalBids: number;
  totalTransactions: number;
  totalVolume: number;
  escrowVolume: number;
}

export default function Reporting() {
  const { currentUser, addLog } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, tasksRes] = await Promise.all([
          fetch('/api/admin?action=stats'),
          fetch('/api/tasks'),
        ]);
        const [statsData, tasksData] = await Promise.all([statsRes.json(), tasksRes.json()]);
        if (statsData.success) setStats(statsData.stats);
        if (tasksData.success) setTasks(tasksData.tasks);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    addLog('Raporlama verileri yüklendi');
  }, [addLog]);

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  // Monthly task completion data (simulated based on actual data)
  const monthlyData = [
    { ay: 'Oca', basarili: 3, toplam: 5 },
    { ay: 'Şub', basarili: 2, toplam: 4 },
    { ay: 'Mar', basarili: 4, toplam: 6 },
    { ay: 'Nis', basarili: 1, toplam: 3 },
    { ay: 'May', basarili: 3, toplam: 5 },
    { ay: 'Haz', basarili: 2, toplam: 4 },
  ];

  // Category breakdown
  const categoryData = (() => {
    const catCount: Record<string, number> = {};
    const relevantTasks = isAdmin
      ? tasks
      : tasks.filter(
          (t) =>
            t.requesterId === currentUser?.id ||
            t.assignedToId === currentUser?.id ||
            (t.bids || []).some((b: any) => b.taskerId === currentUser?.id)
        );
    relevantTasks.forEach((t) => {
      catCount[t.category] = (catCount[t.category] || 0) + 1;
    });
    return Object.entries(catCount).map(([name, value]) => ({ name, value }));
  })();

  // Wallet balance trend (simulated)
  const walletTrend = [
    { ay: 'Oca', bakiye: 5000 },
    { ay: 'Şub', bakiye: 6200 },
    { ay: 'Mar', bakiye: 7800 },
    { ay: 'Nis', bakiye: 8500 },
    { ay: 'May', bakiye: 7200 },
    { ay: 'Haz', bakiye: 9100 },
  ];

  const myRequestedTasks = tasks.filter((t) => t.requesterId === currentUser?.id);
  const myAssignedTasks = tasks.filter(
    (t) =>
      t.assignedToId === currentUser?.id ||
      (t.bids || []).some((b: any) => b.taskerId === currentUser?.id)
  );
  const myCompletedTasks = tasks.filter(
    (t) =>
      t.status === 'completed' &&
      (t.requesterId === currentUser?.id || t.assignedToId === currentUser?.id)
  );

  const summaryCards = isAdmin
    ? stats
      ? [
          {
            label: 'Toplam Platform Görevi',
            value: stats.totalTasks,
            icon: ClipboardList,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/40',
          },
          {
            label: 'Aktif Görevler',
            value: stats.pendingTasks + stats.inProgressTasks + stats.assignedTasks,
            icon: Activity,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/40',
          },
          {
            label: 'Tamamlanan Görevler',
            value: stats.completedTasks,
            icon: CheckCircle2,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-100 dark:bg-green-900/40',
          },
          {
            label: 'Toplam İşlem Hacmi',
            value: formatTL(stats.totalVolume),
            icon: TurkishLiraIcon,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-100 dark:bg-purple-900/40',
          },
        ]
      : []
    : [
        {
          label: 'Verdiğim Görevler',
          value: myRequestedTasks.length,
          icon: ClipboardList,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-100 dark:bg-blue-900/40',
        },
        {
          label: 'Üstlendiğim Görevler',
          value: myAssignedTasks.length,
          icon: Activity,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-100 dark:bg-amber-900/40',
        },
        {
          label: 'Tamamladığım Görevler',
          value: myCompletedTasks.length,
          icon: CheckCircle2,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/40',
        },
        {
          label: 'Cüzdan Bakiyem',
          value: formatTL(currentUser?.walletBalance || 0),
          icon: TurkishLiraIcon,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        },
      ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          {isAdmin ? 'Platform Genel Raporlama Paneli' : 'Kişisel Performans & Raporlama'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? 'Platform genel performans ve sistem istatistikleri'
            : 'Verdiğiniz ve aldığınız görevlere ait kişisel performans özetiniz'}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                    <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart: Monthly Task Completion */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Aylık Görev Tamamlama
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="ay" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Legend fontSize={11} />
                  <Bar dataKey="basarili" name="Başarılı" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="toplam" name="Toplam" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart: Tasks by Category */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                Kategorilere Göre Görevler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name.length > 12 ? name.slice(0, 12) + '...' : name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                      fontSize={10}
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">
                  Kategori verisi yok
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Line Chart: Wallet Balance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TurkishLiraIcon className="w-4 h-4 text-green-600" />
                Cüzdan Bakiye Trendi (Simüle Edilmiş)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={walletTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="ay" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `${v} ₺`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                    }}
                    formatter={(value: number) => [formatTL(value), 'Bakiye']}
                  />
                  <Line
                    type="monotone"
                    dataKey="bakiye"
                    name="Bakiye"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}