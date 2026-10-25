'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { turkeyCitiesGeo, TURKEY_CENTER, TURKEY_ZOOM, CITY_ZOOM } from '@/data/cities-geo';
import trGeoJSON from '@/data/tr-cities.json';
import type { Task } from '@/lib/types';
import { MapPin, ArrowLeft, Shield, Info, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

interface TurkeyMapProps {
  tasks: Task[];
  onCitySelect?: (city: string) => void;
  onTaskClick?: (task: Task) => void;
  selectedCity?: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
const statusLabels: Record<string, string> = {
  pending: 'Bekliyor', assigned: 'Atandı', in_progress: 'Devam Ediyor', completed: 'Tamamlandı', cancelled: 'İptal',
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

export default function TurkeyMap({ tasks, onCitySelect, onTaskClick, selectedCity: selectedCityProp }: TurkeyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [ready, setReady] = useState(false);
  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const boundaryRef = useRef<any>(null);
  const taskMarkersRef = useRef<any[]>([]);
  const cityPolygonsRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const { theme } = useTheme();

  const { currentUser, addLog } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const defaultBoundsRef = useRef<any>([[35.5, 25.5], [42.5, 45.0]]);

  const isZoomedRef = useRef(isZoomed);
  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  const isAdminRef = useRef(isAdmin);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);


  useEffect(() => {
    if (!tileLayerRef.current) return;
    const isDark = theme === 'dark';
    tileLayerRef.current.setUrl(
      isDark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    );
  }, [theme]);

  const activeOnlyTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  }, [tasks]);

  const tasksByCity = useMemo(() => {
    const map: Record<string, Task[]> = {};
    activeOnlyTasks.forEach((t) => {
      if (!map[t.city]) map[t.city] = [];
      map[t.city].push(t);
    });
    return map;
  }, [activeOnlyTasks]);

  const activeCities = useMemo(() => Object.keys(tasksByCity), [tasksByCity]);

  const activeCitiesRef = useRef(activeCities);
  useEffect(() => {
    activeCitiesRef.current = activeCities;
  }, [activeCities]);

  const tasksByCityRef = useRef(tasksByCity);
  useEffect(() => {
    tasksByCityRef.current = tasksByCity;
  }, [tasksByCity]);

  const selectedCityTasks = useMemo(() => {
    if (!selectedCity) return [];
    return tasksByCity[selectedCity] || [];
  }, [selectedCity, tasksByCity]);

  useEffect(() => {
    if (!mapRef.current || ready) return;
    let cancelled = false;

    (async () => {
      const leafletMod = await import('leaflet');
      const L = leafletMod.default;
      leafletRef.current = L;
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        minZoom: 4,
        maxZoom: 14,
      });

      // Fit bounds based on user session or admin global default setting
      const savedUserView = typeof window !== 'undefined' ? sessionStorage.getItem('benimicinyap_user_map_view') : null;
      let initialViewLoaded = false;

      if (savedUserView) {
        try {
          const { center, zoom } = JSON.parse(savedUserView);
          map.setView(center, zoom);
          initialViewLoaded = true;
        } catch (e) {
          console.warn("Error parsing saved view:", e);
        }
      }

      if (!initialViewLoaded) {
        fetch('/api/admin/settings')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.settings)) {
              const boundsSetting = data.settings.find((s: any) => s.key === 'map_default_bounds');
              if (boundsSetting && boundsSetting.value) {
                try {
                  const bounds = JSON.parse(boundsSetting.value);
                  defaultBoundsRef.current = bounds;
                  map.fitBounds(bounds, { padding: [10, 10] });
                  return;
                } catch {}
              }
            }
            map.fitBounds([[35.5, 25.5], [42.5, 45.0]], { padding: [10, 10] });
          })
          .catch(() => {
            map.fitBounds([[35.5, 25.5], [42.5, 45.0]], { padding: [10, 10] });
          });
      }

      // Minimalist Canvas tile layer (Clean, sleek, zero green/river clutter, 100% free)
      const isDarkInit = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const tileLayer = L.tileLayer(
        isDarkInit
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '&copy; Esri, DeLorme, NAVTEQ',
        }
      ).addTo(map);
      tileLayerRef.current = tileLayer;

      // Not: Şehir/il isimleri haritada gösterilmez (Reference tile katmanı kaldırıldı).
      // İl isimleri yalnızca fare ilgili ilin üzerine gelince bilgi balonu olarak görünür.

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Listen for user pan/zoom to save their view state
      map.on('moveend zoomend', () => {
        if (!isZoomedRef.current) {
          try {
            const bounds = map.getBounds();
            const boundsVal = JSON.stringify([
              [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
              [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
            ]);

            const viewState = {
              center: [map.getCenter().lat, map.getCenter().lng],
              zoom: map.getZoom(),
            };
            sessionStorage.setItem('benimicinyap_user_map_view', JSON.stringify(viewState));

            // Autosave admin default bounds on change (eliminates manual 'sabitle' button)
            if (isAdminRef.current) {
              fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  settings: [
                    { key: 'map_default_bounds', value: boundsVal }
                  ]
                })
              }).catch(() => {});
            }
          } catch {}
        }
      });

      // 81 İl Sınırları Katmanı (Tüm Türkiye İlleri - Tıklanabilir & Vurgulanabilir)
      L.geoJSON(trGeoJSON as any, {
        style: (feature: any) => {
          const cityName = feature?.properties?.name;
          const hasTasks = cityName && activeCitiesRef.current.includes(cityName);
          return {
            color: hasTasks ? '#2563eb' : '#64748b',
            weight: hasTasks ? 1.5 : 0.9,
            fillColor: hasTasks ? '#3b82f6' : '#94a3b8',
            fillOpacity: hasTasks ? 0.15 : 0.05,
            opacity: 0.75,
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          const cityName = feature?.properties?.name;
          if (!cityName) return;
          const cityGeo = turkeyCitiesGeo.find((c) => normalizeName(c.name) === normalizeName(cityName));

          // İl ismi bilgi balonu: imleç ilin üzerindeyken görünür, çekilince kaybolur
          layer.bindTooltip(cityName, {
            direction: 'top',
            sticky: true,
            className: 'city-name-tooltip',
            offset: [0, -6],
          });

          layer.on({
            mouseover: (e: any) => {
              const target = e.target;
              target.setStyle({
                weight: 2.5,
                color: '#1d4ed8',
                fillOpacity: 0.28,
              });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                target.bringToFront();
              }
            },
            mouseout: (e: any) => {
              const target = e.target;
              const hasTasks = activeCitiesRef.current.includes(cityName);
              target.setStyle({
                color: hasTasks ? '#2563eb' : '#64748b',
                weight: hasTasks ? 1.5 : 0.9,
                fillColor: hasTasks ? '#3b82f6' : '#94a3b8',
                fillOpacity: hasTasks ? 0.15 : 0.05,
                opacity: 0.75,
              });
            },
            click: () => {
              if (cityGeo) {
                flyToCity(L, map, cityGeo, tasksByCityRef.current, onCitySelect, onTaskClick, taskMarkersRef, boundaryRef);
                setSelectedCity(cityGeo.name);
                setIsZoomed(true);
              }
            },
          });
          cityPolygonsRef.current.push(layer);
        },
      }).addTo(map);

      // Add markers
      const markers = L.layerGroup().addTo(map);
      turkeyCitiesGeo.forEach((city) => {
        const hasTasks = activeCities.includes(city.name);
        const cityTasks = hasTasks ? (tasksByCity[city.name] || []) : [];
        const taskCount = cityTasks.length;
        const statusBreakdown = getCityStatusBreakdown(cityTasks);

        const marker = L.marker([city.lat, city.lng], {
          icon: hasTasks
            ? createStatusIcon(L, taskCount, statusBreakdown)
            : createInactiveIcon(L),
          zIndexOffset: hasTasks ? 1000 : 1,
        });

        if (hasTasks) {
          marker.bindTooltip(
            buildCityTooltip(city.name, taskCount, statusBreakdown),
            { direction: 'top', offset: [0, -18], className: 'city-tooltip-clean' }
          );
        }

        marker.on('click', () => {
          if (!mapObjRef.current) return;
          flyToCity(L, map, city, tasksByCity, onCitySelect, onTaskClick, taskMarkersRef, boundaryRef);
          setSelectedCity(city.name);
          setIsZoomed(true);
        });
        markers.addLayer(marker);
      });
      markersRef.current = markers;
      mapObjRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapObjRef.current) {
        mapObjRef.current.remove();
        mapObjRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // Update markers when tasks change
  useEffect(() => {
    if (!ready || !markersRef.current || !mapObjRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    markersRef.current.clearLayers();

    turkeyCitiesGeo.forEach((city) => {
      const hasTasks = activeCities.includes(city.name);
      const cityTasks = hasTasks ? (tasksByCity[city.name] || []) : [];
      const taskCount = cityTasks.length;
      const statusBreakdown = getCityStatusBreakdown(cityTasks);

      const marker = L.marker([city.lat, city.lng], {
        icon: hasTasks
          ? createStatusIcon(L, taskCount, statusBreakdown)
          : createInactiveIcon(L),
        zIndexOffset: hasTasks ? 1000 : 1,
      });

      if (hasTasks) {
        marker.bindTooltip(
          buildCityTooltip(city.name, taskCount, statusBreakdown),
          { direction: 'top', offset: [0, -18], className: 'city-tooltip-clean' }
        );
      }

      marker.on('click', () => {
        if (!mapObjRef.current) return;
        flyToCity(L, mapObjRef.current, city, tasksByCity, onCitySelect, onTaskClick, taskMarkersRef, boundaryRef);
        setSelectedCity(city.name);
        setIsZoomed(true);
      });
      markersRef.current.addLayer(marker);
    });
  }, [ready, activeCities, tasksByCity, onCitySelect, onTaskClick]);

  const handleBackToTurkey = useCallback(() => {
    if (!mapObjRef.current || !leafletRef.current) return;
    setSelectedCity(null);
    setIsZoomed(false);
    onCitySelect?.('');
    if (boundaryRef.current) {
      mapObjRef.current.removeLayer(boundaryRef.current);
      boundaryRef.current = null;
    }
    taskMarkersRef.current.forEach((m) => {
      if (mapObjRef.current!.hasLayer(m)) mapObjRef.current!.removeLayer(m);
    });
    taskMarkersRef.current = [];
    cityPolygonsRef.current.forEach((p: any) => {
      const cityName = p?.feature?.properties?.name;
      const hasTasks = cityName && activeCitiesRef.current.includes(cityName);
      p.setStyle({
        color: hasTasks ? '#2563eb' : '#64748b',
        weight: hasTasks ? 1.5 : 0.9,
        fillColor: hasTasks ? '#3b82f6' : '#94a3b8',
        fillOpacity: hasTasks ? 0.15 : 0.05,
        opacity: 0.75,
      });
    });
    mapObjRef.current.flyToBounds(defaultBoundsRef.current, { duration: 1.2, padding: [10, 10], easeLinearity: 0.25 });
  }, [onCitySelect]);

  // Sync with external selectedCity prop
  useEffect(() => {
    if (!ready || selectedCityProp === undefined) return;
    const L = leafletRef.current;
    if (!L) return;
    if (selectedCityProp && selectedCityProp !== selectedCity) {
      const city = turkeyCitiesGeo.find((c) => c.name === selectedCityProp);
      if (city && mapObjRef.current) {
        flyToCity(L, mapObjRef.current, city, tasksByCity, onCitySelect, onTaskClick, taskMarkersRef, boundaryRef);
        setSelectedCity(selectedCityProp);
        setIsZoomed(true);
      }
    } else if (!selectedCityProp && selectedCity && mapObjRef.current) {
      handleBackToTurkey();
    }
  }, [selectedCityProp, ready, handleBackToTurkey, selectedCity, tasksByCity, onCitySelect, onTaskClick]);

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  // Active (non-completed, non-cancelled) tasks for sidebar
  const activeTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress');
  }, [tasks]);

  // Group active tasks by city
  const activeTasksByCity = useMemo(() => {
    const map: Record<string, Task[]> = {};
    activeTasks.forEach((t) => {
      if (!map[t.city]) map[t.city] = [];
      map[t.city].push(t);
    });
    return map;
  }, [activeTasks]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="relative w-full flex flex-col">
      {/* Map + Sidebar Row */}
      <div className="flex flex-col md:flex-row gap-3">
      {/* Left Sidebar - Active Task List (desktop only) */}
      <div className={`${sidebarCollapsed ? 'md:w-0 md:opacity-0 md:overflow-hidden' : 'md:w-80 shrink-0'} hidden md:flex transition-all duration-300`}>
        <div className="glass-card rounded-xl shadow-sm h-[420px] flex flex-col overflow-hidden w-full">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-green-700 dark:text-green-300">{activeTasks.length}</span>
                </div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Aktif Görevler</h4>
              </div>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <span className="text-xs text-muted-foreground">◂</span>
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(activeTasksByCity).map(([city, cityTasks]) => (
              <div key={city}>
                {/* City group header */}
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/50 sticky top-0 z-10">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{city}</span>
                    <Badge variant="secondary" className="text-[9px] ml-auto px-1.5 py-0">{cityTasks.length}</Badge>
                  </div>
                </div>

                {/* Tasks under this city */}
                {cityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-3 py-2.5 border-b border-slate-50 dark:border-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Category + Status */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getCategoryColor(task.category)}`}>
                        {task.category}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[task.status] || statusColors.pending}`}>
                        {statusLabels[task.status] || task.status}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-xs font-semibold leading-snug line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </p>

                    {/* District + Fee + Action */}
                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {task.district || city}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {formatTL(task.fee)}
                        </span>
                        {task.status === 'pending' && (
                          <span className="text-[9px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            Kabul Et
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {activeTasks.length === 0 && (
              <div className="p-6 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aktif görev bulunmuyor</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer - Stats */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{activeCities.length} aktif il</span>
              <span>{activeTasks.length} aktif görev</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative min-w-0">
        {/* Expand sidebar button */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Görev Listesini Aç"
          >
            <span className="text-xs text-muted-foreground">▸</span>
          </button>
        )}

        {/* Map Header Overlay - only shown on desktop (hidden on mobile) */}
        {!isZoomed && !sidebarCollapsed && (
          <div className="hidden sm:block absolute top-3 left-3 z-[1000] max-w-xs">
            <div className="glass-card rounded-xl shadow-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  Coğrafi Güvenlik Haritası
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Görevli illere tıklayarak aktif görevleri ve sınır koruma alanlarını inceleyin.
              </p>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full rounded-xl overflow-hidden h-[420px] sm:h-[400px] md:h-[420px]" />

      {/* Back button when zoomed */}
      {isZoomed && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md gap-1.5"
          onClick={handleBackToTurkey}
        >
          <ArrowLeft className="w-4 h-4" />
          Türkiye&apos;ye Dön
        </Button>
      )}

      {/* Zoomed-in city: Active tasks panel on right */}
      {isZoomed && selectedCity && (
        <div className="absolute top-3 right-3 z-[1000] w-52 sm:w-64 max-h-[260px] sm:max-h-[400px]">
          <div className="glass-card rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-sm">{selectedCity}</h4>
                <Badge variant="secondary" className="text-[10px] ml-auto">{selectedCityTasks.length} görev</Badge>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[200px] sm:max-h-[320px]">
              {selectedCityTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => onTaskClick?.(task)}
                >
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getCategoryColor(task.category)}`}>
                    {task.category}
                  </span>
                  <p className="text-xs font-semibold mt-1 leading-snug line-clamp-2">{task.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {task.district || selectedCity}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatTL(task.fee)}</span>
                  </div>
                </div>
              ))}
              {selectedCityTasks.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">Bu ilde aktif görev bulunmuyor</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend - bottom left when not zoomed */}
      {!isZoomed && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Görev Durumu</p>
          <div className="flex flex-col gap-1">
            {[
              { color: '#f59e0b', label: 'Bekleyen' },
              { color: '#a855f7', label: 'Devam Eden' },
              { color: '#3b82f6', label: 'Mevcut İş' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shrink-0 border border-white/50 shadow-sm" style={{ background: color }} />
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Bottom info bar - desktop only */}
      {!isZoomed && (
        <div className="hidden sm:flex absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-md border border-slate-200 dark:border-slate-800 px-4 py-1.5">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Şehre tıklayarak aktif görevleri görüntüleyin
            </p>
          </div>
        </div>
      )}
      </div>
      {/* End Map Area */}
      </div>
      {/* End Map + Sidebar Row */}

      {/* Escrow info panel below map */}
      <div className="mt-3 grid grid-cols-1 gap-3 shrink-0">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <Shield className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-200">Güvenlik Havuzu ve T.C. Kimlik Doğrulaması</h4>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-300/70 mt-1 leading-relaxed">
                Ödemeleriniz güvenlik havuzunda bloke edilir, T.C. kimlik doğrulaması yasal mevzuat gereğidir.
              </p>
              <Button variant="link" className="text-[11px] text-blue-600 dark:text-blue-400 p-0 h-auto mt-1">
                Detaylı Bilgi Al
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Lock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200">Escrow Güvenlik Sistemi</h4>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-300/70 mt-1 leading-relaxed">
                Görev ücreti escrow havuzunda bloke edilir, görev tamamlandığında hizmet verene ödeme yapılır.
              </p>
              <Button variant="link" className="text-[11px] text-amber-600 dark:text-amber-400 p-0 h-auto mt-1">
                Nasıl Çalışır?
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .city-tooltip-clean {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 10px !important;
          padding: 6px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          font-family: inherit !important;
        }
        .city-tooltip-clean::before {
          border-top-color: white !important;
        }
        /* İl ismi bilgi balonu (hover tooltip) */
        .city-name-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 3px 10px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.14) !important;
          font-family: inherit !important;
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
        }
        .city-name-tooltip::before {
          border-top-color: white !important;
        }
        .dark .city-name-tooltip {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #f1f5f9;
        }
        .dark .city-name-tooltip::before {
          border-top-color: #0f172a !important;
        }
        .task-marker-label {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container { font-family: inherit !important; }
      `}</style>
    </div>
  );
}

// --- Helper functions ---

// Status color palette (matches user's legend)
const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  pending:     { bg: '#f59e0b', label: 'Bekleyen' },
  assigned:    { bg: '#3b82f6', label: 'Mevcut İş' },
  in_progress: { bg: '#a855f7', label: 'Devam Eden' },
  completed:   { bg: '#22c55e', label: 'Tamamlandı' },
  cancelled:   { bg: '#ef4444', label: 'İptal' },
};

interface StatusBreakdown {
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  dominantColor: string;
}

function getCityStatusBreakdown(tasks: Task[]): StatusBreakdown {
  const counts = { pending: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0 };
  tasks.forEach((t) => {
    const s = t.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  });
  // Dominant color: prefer active statuses first
  const priority: Array<keyof typeof counts> = ['in_progress', 'pending', 'assigned', 'completed', 'cancelled'];
  const dominant = priority.find((s) => counts[s] > 0) || 'pending';
  return { ...counts, dominantColor: STATUS_COLORS[dominant]?.bg || '#3b82f6' };
}

function createStatusIcon(L: any, count: number, breakdown: StatusBreakdown) {
  const displayCount = count > 99 ? '99+' : String(count);
  const size = 34; // compact task count badge
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;

  // Build pie segments for the ring based on status breakdown
  const activeStatuses: Array<{ key: string; count: number }> = [
    { key: 'pending', count: breakdown.pending },
    { key: 'in_progress', count: breakdown.in_progress },
    { key: 'assigned', count: breakdown.assigned },
  ].filter((s) => s.count > 0);

  const total = activeStatuses.reduce((s, x) => s + x.count, 0) || 1;
  let segmentsSvg = '';
  let startAngle = -90; // Start from top

  if (activeStatuses.length === 1) {
    // Single color circle
    const color = STATUS_COLORS[activeStatuses[0].key]?.bg || breakdown.dominantColor;
    segmentsSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="white" stroke-width="1.5" class="dark:stroke-[#0B0C16]"/>`;
  } else {
    // Multi-color ring segments
    segmentsSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${breakdown.dominantColor}" stroke="white" stroke-width="1.5" class="dark:stroke-[#0B0C16]"/>`;
    activeStatuses.forEach((seg) => {
      const angle = (seg.count / total) * 360;
      const endAngle = startAngle + angle;
      const rad = Math.PI / 180;
      const x1 = cx + r * Math.cos(startAngle * rad);
      const y1 = cy + r * Math.sin(startAngle * rad);
      const x2 = cx + r * Math.cos(endAngle * rad);
      const y2 = cy + r * Math.sin(endAngle * rad);
      const largeArc = angle > 180 ? 1 : 0;
      const color = STATUS_COLORS[seg.key]?.bg || '#888';
      segmentsSvg += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="0.5" class="dark:stroke-[#0B0C16]"/>`;
      startAngle = endAngle;
    });
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const glowFilter = isDark ? `
    <defs>
      <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feComponentTransfer in="blur" result="boost">
          <feFuncA type="linear" slope="2"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="boost" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  ` : '';

  const filterAttr = isDark ? 'filter="url(#neon-glow)"' : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${glowFilter}
    <g ${filterAttr}>
      ${segmentsSvg}
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="white" class="dark:fill-[#0B0C16]"/>
    <text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="middle" fill="${isDark ? '#4ade80' : breakdown.dominantColor}" font-size="10" font-weight="900" font-family="system-ui" class="dark:fill-[#4ade80]">${displayCount}</text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'task-marker-label',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildCityTooltip(cityName: string, total: number, breakdown: StatusBreakdown): string {
  const rows: string[] = [];
  const active: Array<[string, number]> = [
    ['pending', breakdown.pending],
    ['in_progress', breakdown.in_progress],
    ['assigned', breakdown.assigned],
  ].filter(([, c]) => (c as number) > 0) as Array<[string, number]>;

  active.forEach(([key, count]) => {
    const color = STATUS_COLORS[key]?.bg || '#888';
    const label = STATUS_COLORS[key]?.label || key;
    rows.push(`<span style="display:inline-flex;align-items:center;gap:4px;margin-right:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span><span style="color:#555;font-size:10px;">${label}: ${count}</span></span>`);
  });

  return `<div style="text-align:center;min-width:120px;"><div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:3px;">${cityName}</div><div style="font-size:10px;color:#64748b;margin-bottom:4px;">${total} görev</div><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;">${rows.join('')}</div></div>`;
}

function createInactiveIcon(L: any) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="3" fill="#94a3b8" opacity="0.6" stroke="white" stroke-width="1"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'task-marker-label',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

const normalizeName = (name: string) => {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// Build a lookup map from normalized GeoJSON names → feature (created once)
const geoJSONLookup: Record<string, any> = {};
(trGeoJSON as any).features.forEach((f: any) => {
  const normalized = normalizeName(f.properties.name);
  geoJSONLookup[normalized] = f;
});

function findGeoFeature(cityName: string): any | null {
  const normalizedCity = normalizeName(cityName);

  // 1. Exact match
  if (geoJSONLookup[normalizedCity]) return geoJSONLookup[normalizedCity];

  // 2. GeoJSON name is shorter prefix of city (e.g. "afyon" matches "afyonkarahisar")
  for (const [key, feature] of Object.entries(geoJSONLookup)) {
    if (normalizedCity.startsWith(key) || key.startsWith(normalizedCity)) {
      return feature;
    }
  }

  // 3. Substring match
  for (const [key, feature] of Object.entries(geoJSONLookup)) {
    if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
      return feature;
    }
  }

  return null;
}

function flyToCity(
  L: any,
  map: any,
  city: { name: string; lat: number; lng: number; bounds: [number, number][] },
  tasksByCity: Record<string, Task[]>,
  onCitySelect?: (city: string) => void,
  onTaskClick?: (task: Task) => void,
  taskMarkersRef?: React.MutableRefObject<any[]>,
  boundaryRef?: React.MutableRefObject<any>,
) {
  onCitySelect?.(city.name);

  if (boundaryRef?.current) {
    try {
      map.removeLayer(boundaryRef.current);
    } catch (e) {
      console.warn("Could not remove layer via ref:", e);
    }
    boundaryRef.current = null;
  }
  const boundaryEl = document.querySelector('.city-boundary-highlight');
  if (boundaryEl) boundaryEl.remove();

  if (taskMarkersRef?.current) {
    taskMarkersRef.current.forEach((m) => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    taskMarkersRef.current = [];
  }

  // Find real detailed boundary feature in loaded GeoJSON using robust lookup
  const feature = findGeoFeature(city.name);

  let boundaryLayer: any;
  if (feature) {
    boundaryLayer = L.geoJSON(feature, {
      style: {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.18,
        weight: 4.5,
        dashArray: '10 5',
      },
      className: 'city-boundary-highlight',
    }).addTo(map);
  } else {
    // Fallback to simplified boundary if not found
    boundaryLayer = L.polygon(
      city.bounds.map((b) => [b[0], b[1]]),
      {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.18,
        weight: 4.5,
        dashArray: '10 5',
        className: 'city-boundary-highlight',
      }
    ).addTo(map);
  }

  // fly to the bounds of the boundary layer dynamically for perfect responsive layout on mobile/desktop
  try {
    map.flyToBounds(boundaryLayer.getBounds(), { duration: 1.5, padding: [25, 25], easeLinearity: 0.25 });
  } catch (e) {
    console.warn("Could not fly to bounds:", e);
    map.flyTo([city.lat, city.lng], CITY_ZOOM, { duration: 1.5, easeLinearity: 0.25 });
  }

  if (boundaryRef) {
    boundaryRef.current = boundaryLayer;
  }

  // Task markers with fee labels, colored by status
  const statusMarkerStyles: Record<string, { bg: string; shadow: string; label: string }> = {
    pending:     { bg: '#f59e0b', shadow: 'rgba(245,158,11,0.45)', label: 'Bekleyen' },
    assigned:    { bg: '#3b82f6', shadow: 'rgba(59,130,246,0.45)', label: 'Mevcut' },
    in_progress: { bg: '#a855f7', shadow: 'rgba(168,85,247,0.45)', label: 'Devam Eden' },
    completed:   { bg: '#22c55e', shadow: 'rgba(34,197,94,0.40)', label: 'Tamamlandı' },
    cancelled:   { bg: '#ef4444', shadow: 'rgba(239,68,68,0.40)', label: 'İptal' },
  };

  const cityTasks = tasksByCity[city.name] || [];
  cityTasks.forEach((task) => {
    const offsetLat = city.lat + (Math.random() - 0.5) * 0.02;
    const offsetLng = city.lng + (Math.random() - 0.5) * 0.02;
    const style = statusMarkerStyles[task.status] || statusMarkerStyles.pending;

    const taskMarker = L.marker([offsetLat, offsetLng], {
      icon: L.divIcon({
        html: `<div style="background:${style.bg};color:white;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px ${style.shadow};cursor:pointer;border:1.5px solid rgba(255,255,255,0.4);">${task.fee.toLocaleString('tr-TR')} ₺</div>`,
        className: 'task-marker-label',
        iconAnchor: [35, 14],
      }),
      zIndexOffset: 2000,
    });

    taskMarker.bindTooltip(
      `<div style="max-width:220px;"><strong>${task.title}</strong><br/><span style="color:#666;">${task.category}</span><br/><span style="display:inline-block;margin-top:3px;background:${style.bg};color:white;padding:1px 7px;border-radius:8px;font-size:10px;font-weight:600;">${style.label}</span> &nbsp;<span style="color:${style.bg};font-weight:700;">${task.fee.toLocaleString('tr-TR')} ₺</span></div>`,
      { direction: 'top', offset: [0, -10], className: 'city-tooltip-clean' }
    );

    taskMarker.on('click', () => onTaskClick?.(task));
    taskMarker.addTo(map);
    taskMarkersRef?.current?.push(taskMarker);
  });
}