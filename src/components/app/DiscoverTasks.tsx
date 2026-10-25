'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Search, MapPin, Loader2, SlidersHorizontal, Map, Ruler, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { turkishCities } from '@/data/cities';
import { taskCategories } from '@/data/categories';
import { toast } from 'sonner';

// Dynamic import to avoid SSR issues with Leaflet
const TurkeyMap = dynamic(() => import('@/components/app/TurkeyMap'), { ssr: false });

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


export default function DiscoverTasks() {
  const { setTasks, setTaskDetailModal, addLog } = useAppStore();
  const tasks = useAppStore((s) => s.tasks);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [locationDetected, setLocationDetected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapCityFilter, setMapCityFilter] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [distanceRange, setDistanceRange] = useState([150]);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const params = new URLSearchParams();
      const cityFilter = mapCityFilter || filterCity;
      if (cityFilter) params.set('city', cityFilter);
      if (filterCategory) params.set('category', filterCategory);
      if (searchQuery) params.set('query', searchQuery);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      const elapsed = performance.now() - start;
      setQueryTime(elapsed);
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCity, filterCategory, searchQuery, mapCityFilter, setTasks]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 300);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const handleLocationDetect = () => {
    setLocationDetected(true);
    toast.success('Konum algılandı! Antalya olarak ayarlandı.');
    setFilterCity('Antalya');
    setMapCityFilter('Antalya');
    setTimeout(() => setLocationDetected(false), 2000);
  };

  const handleMapCitySelect = (city: string) => {
    if (city) {
      setMapCityFilter(city);
      setFilterCity(city);
      addLog(`Haritadan il seçildi: ${city}`);
    } else {
      // "Türkiye'ye Dön" / harita sıfırlama: il filtresini de temizle ki
      // tüm illerin görevleri yeniden yüklensin.
      setMapCityFilter(null);
      setFilterCity('');
    }
  };

  const handleMapTaskClick = (task: typeof tasks[0]) => {
    setTaskDetailModal(task);
    addLog(`Haritadan görev seçildi: ${task.title}`);
  };

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString('tr-TR') : '';

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  const hasActiveFilters = filterCity || filterCategory || searchQuery || distanceRange[0] < 150;

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        <Input
          placeholder="İş veya anahtar kelime..."
          className="pl-9 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base rounded-xl border-2 focus:border-blue-500 transition-colors pr-20 sm:pr-auto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2 rounded-lg gap-1 text-[10px] sm:text-xs"
          onClick={handleLocationDetect}
          disabled={locationDetected}
        >
          {locationDetected ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <MapPin className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">{locationDetected ? 'Algılanıyor...' : 'Konum'}</span>
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="flex-1 min-w-[120px]">
          <Select value={mapCityFilter || filterCity || ''} onValueChange={(v) => {
            const city = v === 'all' ? '' : v;
            setFilterCity(city);
            setMapCityFilter(city || null);
          }}>
            <SelectTrigger className="rounded-lg h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Tüm İller" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">Tüm İller</SelectItem>
              {turkishCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[120px]">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="rounded-lg h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Tüm Kategoriler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {taskCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Distance Slider (hidden on very small screens) */}
        <div className="flex-1 min-w-[140px] hidden sm:block">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
            <Ruler className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={distanceRange}
              min={10}
              max={300}
              step={10}
              onValueChange={setDistanceRange}
              className="flex-1"
            />
            <span className="text-xs font-medium text-muted-foreground shrink-0 w-12 text-right">
              {distanceRange[0]} km
            </span>
          </div>
        </div>

        <Button
          variant={showMap ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 rounded-lg gap-1 h-9 text-xs sm:text-sm"
          onClick={() => setShowMap(!showMap)}
        >
          <Map className="w-4 h-4" />
          <span className="hidden sm:inline">{showMap ? 'Harita Gizle' : 'Harita Göster'}</span>
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] sm:text-xs text-muted-foreground h-9"
            onClick={() => {
              setFilterCity('');
              setFilterCategory('');
              setSearchQuery('');
              setMapCityFilter(null);
              setDistanceRange([150]);
            }}
          >
            Temizle
          </Button>
        )}
      </div>

      {/* Results count with cache info */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
        <span>{loading ? 'Yükleniyor...' : `${tasks.length} görev bulundu`}</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {queryTime !== null && (
            <Badge variant="outline" className="text-[9px] sm:text-[10px] gap-1">
              <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              {queryTime.toFixed(0)}ms
            </Badge>
          )}
          {distanceRange[0] < 150 && (
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] gap-1">
              <Ruler className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              {distanceRange[0]} km
            </Badge>
          )}
          <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>

      {/* Turkey Map */}
      {showMap && (
        <div className="rounded-xl overflow-hidden">
          <TurkeyMap
            tasks={tasks}
            onCitySelect={handleMapCitySelect}
            onTaskClick={handleMapTaskClick}
            selectedCity={mapCityFilter}
          />
        </div>
      )}

      {/* Task Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Görev bulunamadı</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Farklı filtreler deneyin veya yeni bir görev yayınlayın
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task, i) => {
            const status = statusMap[task.status] || statusMap.pending;
            const catColor = getCategoryColor(task.category);

            return (
              <motion.div
                key={task.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card
                  className="cursor-pointer hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 group"
                  onClick={() => {
                    setTaskDetailModal(task);
                    addLog(`Görev detayı açıldı: ${task.title}`);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${catColor}`}>
                        {task.category}
                      </span>
                      <Badge variant={status.variant} className="text-[11px] shrink-0">
                        {status.label}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {task.city}{task.district ? `, ${task.district}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="text-base font-bold text-blue-600 dark:text-blue-400 block">
                          {formatTL(task.fee)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 px-3 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskDetailModal(task);
                          addLog(`Görev kabul modalı açıldı: ${task.title}`);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                        {task.status === 'pending' ? 'Görevi Kabul Et' : 'Detayı Gör'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}