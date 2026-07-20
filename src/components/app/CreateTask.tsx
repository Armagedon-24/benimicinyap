'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Shield, Loader2, Info, Calendar, MapPin, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import { turkishCities } from '@/data/cities';
import { taskCategories } from '@/data/categories';

export default function CreateTask() {
  const { currentUser, addTask, setActiveTab, setTasks, walletBalance, setWalletBalance, setEscrowBalance, addNotification, addLog } =
    useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(currentUser?.city || '');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [fee, setFee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !city || !category || !fee) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum <= 0) {
      toast.error('Geçerli bir ücret girin');
      return;
    }

    if (walletBalance < feeNum) {
      toast.error('Yetersiz bakiye. Lütfen cüzdanınıza para yükleyin.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          city,
          district,
          category,
          fee: feeNum,
          dueDate,
          requesterId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addTask(data.task);
        setWalletBalance(currentUser.walletBalance - feeNum);
        setEscrowBalance((currentUser.escrowBalance || 0) + feeNum);
        addNotification({
          id: crypto.randomUUID(),
          userId: currentUser.id,
          title: 'Görev Yayınlandı',
          message: `"${title}" görevi başarıyla yayınlandı ve ${formatTL(feeNum)} escrow'a bloke edildi.`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString(),
        });
        addLog(`Yeni görev yayınlandı: ${title} (${formatTL(feeNum)})`);
        toast.success('Görev başarıyla yayınlandı! Escrow bloke edildi.');

        // Refetch tasks
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (tasksData.success) setTasks(tasksData.tasks);

        setActiveTab('my-tasks');
      } else {
        toast.error(data.message || 'Görev yayınlanırken hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-blue-600" />
          Yeni Güvenceli Görev Yayınla
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Görevinizi yayınlayın, ücret Escrow havuzunda güvenle bloke edilsin.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="task-title">Görev Başlığı *</Label>
                <Input
                  id="task-title"
                  placeholder="Örn: İstanbul'da ev temizliği"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="task-desc">Açıklama *</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Görevin detaylarını açıklayın..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* City & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Şehir *</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {turkishCities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-district">İlçe / Semt</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="task-district"
                      placeholder="Örn: Kadıköy"
                      className="pl-10"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fee & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-fee">Ücret (₺) *</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="task-fee"
                      type="number"
                      placeholder="0"
                      className="pl-10"
                      min="1"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mevcut bakiye: <span className="font-semibold text-blue-600">{formatTL(walletBalance)}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due">Son Tarih</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="task-due"
                      type="date"
                      className="pl-10"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Escrow Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Hizmet Alma Güvencesi
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                      Görevi yayınladığınızda, ücret tutarı otomatik olarak Escrow Güvence Havuzu'nda bloke
                      edilir. Görev tamamlandığında ve onaylandığında, ücret görevlinin cüzdanına aktarılır.
                      Bu sayede hem hizmet alan hem de hizmet veren güvence altındadır.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white h-11"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Görevi Yayınla (Escrow Bloke)
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}