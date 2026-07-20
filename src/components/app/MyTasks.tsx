'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Inbox, Loader2, Eye, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/useAppStore';
import type { Task } from '@/lib/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'secondary' },
  assigned: { label: 'Atandı', variant: 'default' },
  in_progress: { label: 'Devam Ediyor', variant: 'default' },
  completed: { label: 'Tamamlandı', variant: 'outline' },
  cancelled: { label: 'İptal', variant: 'destructive' },
};

const categoryColors: Record<string, string> = {
  'Ev & Bakım Hizmetleri': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Kurye & Alışveriş': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Resmi İşler & Evrak': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Saha Analizi & Kontrol': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Saha Doğrulaması & Güvenlik': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Tadilat & Küçük Tamirat': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Evcil Hayvan Hizmetleri': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'Teknoloji & Cihaz Kurulumu': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Taşıma & Eşya Montajı': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'Özel Ders & Eğitim': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Organizasyon & Yardımcı Güç': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
};

function getCategoryColor(category: string): string {
  return categoryColors[category] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
}

export default function MyTasks() {
  const { currentUser, tasks, setTasks, setTaskDetailModal, addLog } = useAppStore();
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success) setTasks(data.tasks);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentUser, setTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const givenTasks = tasks.filter((t) => t.requesterId === currentUser.id && t.status !== 'completed' && t.status !== 'cancelled');
  const takenTasks = tasks.filter(
    (t) =>
      (t.assignedToId === currentUser.id ||
        (t.bids || []).some((b) => b.taskerId === currentUser.id)) &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
  );
  const archiveTasks = tasks.filter(
    (t) =>
      (t.status === 'completed' || t.status === 'cancelled') &&
      (isAdmin ||
        t.requesterId === currentUser.id ||
        t.assignedToId === currentUser.id ||
        (t.bids || []).some((b) => b.taskerId === currentUser.id))
  );

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString('tr-TR') : '';

  const renderTaskList = (taskList: Task[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
        </div>
      );
    }

    if (taskList.length === 0) {
      return (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-muted-foreground">Henüz görev yok</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Bu kategoride gösterilecek görev bulunmuyor.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {taskList.map((task, i) => {
          const status = statusMap[task.status] || statusMap.pending;
          const catColor = getCategoryColor(task.category);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                onClick={() => {
                  setTaskDetailModal(task);
                  addLog(`Görev detayı açıldı (Görevlerim): ${task.title}`);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catColor}`}>
                          {task.category}
                        </span>
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.label}
                        </Badge>
                        {task.assignedToName && (
                          <span className="text-[11px] text-muted-foreground">
                            → {task.assignedToName}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.city}{task.district ? `, ${task.district}` : ''} • {formatDate(task.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {formatTL(task.fee)}
                      </span>
                      {task.assignedToId === currentUser?.id && (task.status === 'assigned' || task.status === 'in_progress') && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-3 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskDetailModal(task);
                            addLog(`Görevi bitirme ekranı açıldı: ${task.title}`);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Görevi Bitir
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          Görevlerim & Arşiv
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verdiğiniz, aldığınız ve başarıyla tamamlanan tüm görevlerinizi yönetin
        </p>
      </motion.div>

      <Tabs defaultValue="given" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="given" className="text-xs sm:text-sm">
            Verdiğim Görevler
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {givenTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="taken" className="text-xs sm:text-sm">
            Aldığım Görevler
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {takenTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archive" className="text-xs sm:text-sm">
            Görev Arşivi
            <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 border-emerald-300 text-emerald-600 dark:text-emerald-400 font-bold">
              {archiveTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="given" className="mt-4">
          {renderTaskList(givenTasks)}
        </TabsContent>

        <TabsContent value="taken" className="mt-4">
          {renderTaskList(takenTasks)}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          {renderTaskList(archiveTasks)}
        </TabsContent>
      </Tabs>
    </div>
  );
}