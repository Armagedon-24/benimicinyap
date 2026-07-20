'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, Zap, ArrowRight, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

// Base64 800ms pleasant chime WAV sound fallback for universal mobile browser audio playback
const SOUND_CHIME_B64 =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFb4N0cYBwZm9qZGdlYmhqam5vcHFydHN2eXl7fIGAg4SEiImKjY6PkJGSlJWWl5mamo2KkZGQkJCPkJCQkJCPkJCPkJCPkJCQkJCPkJA=';

export default function MobilePushBanner() {
  const { activeBanner, hideBanner, setTaskDetailModal, tasks } = useAppStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeBanner) return;

    // 1. Play sound
    playAudioAndVibrate(activeBanner.type);

    // 2. Auto dismiss timer (6 seconds)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      hideBanner();
    }, 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeBanner, hideBanner]);

  if (!activeBanner) return null;

  const playAudioAndVibrate = (type?: string) => {
    try {
      // Haptic vibration for mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 60, 150]);
      }

      // HTML5 Audio playback
      const audio = new Audio(SOUND_CHIME_B64);
      audio.volume = 0.8;
      audio.play().catch(() => {
        // Fallback to Web Audio API
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            const freqs = type === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880];
            freqs.forEach((f, i) => {
              const osc = ctx.createOscillator();
              const g = ctx.createGain();
              osc.frequency.setValueAtTime(f, now + i * 0.08);
              g.gain.setValueAtTime(0.2, now + i * 0.08);
              g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
              osc.connect(g);
              g.connect(ctx.destination);
              osc.start(now + i * 0.08);
              osc.stop(now + i * 0.08 + 0.4);
            });
          }
        } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
  };

  const handleAction = () => {
    if (activeBanner.taskTitle) {
      const matchingTask = tasks.find((t) => t.title.toLowerCase().includes(activeBanner.taskTitle!.toLowerCase()));
      if (matchingTask) {
        setTaskDetailModal(matchingTask);
      }
    }
    hideBanner();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -80, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -80, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="fixed top-3 left-3 right-3 sm:top-5 sm:right-5 sm:left-auto sm:w-[400px] z-[999999] pointer-events-auto"
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/50 dark:border-emerald-500/60 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 relative overflow-hidden ring-4 ring-emerald-500/10">
          {/* Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 animate-pulse" />

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Benim İçin Yap • Mobil Bildirim
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <Volume2 className="w-3 h-3 text-emerald-500" />
                <span>Sesli</span>
              </span>
              <button
                onClick={hideBanner}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner Body */}
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              {activeBanner.type === 'complete' ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              ) : activeBanner.type === 'accept' ? (
                <Zap className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              ) : (
                <Bell className="w-4.5 h-4.5 text-blue-500 shrink-0" />
              )}
              <span>{activeBanner.title}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {activeBanner.message}
            </p>
          </div>

          {/* Task Info Chip */}
          {(activeBanner.taskTitle || activeBanner.fee !== undefined) && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              {activeBanner.taskTitle && (
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {activeBanner.taskTitle}
                </span>
              )}
              {activeBanner.fee !== undefined && (
                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg ml-auto">
                  {activeBanner.fee.toLocaleString('tr-TR')} ₺
                </span>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleAction}
            className="w-full text-xs font-extrabold py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Görev Detayını İncele</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
