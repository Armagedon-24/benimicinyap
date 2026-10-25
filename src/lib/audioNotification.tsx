'use client';

import { toast } from 'sonner';

// Native Web Audio API Chime Synthesizer for high quality iOS/Android style notification sounds
export function playNotificationSound(type: 'success' | 'accept' | 'complete' | 'info' | 'warning' = 'info') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Trigger haptic vibration on mobile devices if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'complete' || type === 'accept') {
        navigator.vibrate([120, 60, 120]);
      } else {
        navigator.vibrate([100]);
      }
    }

    const now = ctx.currentTime;

    if (type === 'accept' || type === 'complete' || type === 'success') {
      // Pleasant multi-tone chord chime (e.g. C5 - E5 - G5 - C6)
      const frequencies = [523.25, 659.25, 783.99, 1046.5];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } else {
      // Gentle notification tone (G5 - C6)
      const frequencies = [783.99, 1046.5];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    }
  } catch (e) {
    console.warn("Audio notification sound failed:", e);
  }
}

export interface CardNotificationProps {
  title: string;
  message: string;
  taskTitle?: string;
  fee?: number;
  type?: 'accept' | 'complete' | 'info' | 'success' | 'warning';
  onAction?: () => void;
}

import { useAppStore } from '@/store/useAppStore';

export function showMobileNotificationCard({
  title,
  message,
  taskTitle,
  fee,
  type = 'success',
  onAction,
}: CardNotificationProps) {
  // 1. Play sound
  playNotificationSound(type);

  // 2. Trigger top slide-down Push Banner
  useAppStore.getState().showBanner({
    title,
    message,
    taskTitle,
    fee,
    type,
  });

  // 3. Also trigger Sonner toast
  toast.custom(
    (t) => (
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-emerald-500/40 rounded-2xl shadow-2xl p-4 transition-all duration-300 transform scale-100 flex flex-col gap-2.5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 animate-pulse" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Benim İçin Yap • Mobil Bildirim
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <span>Az önce</span>
            <span>🔊</span>
          </span>
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            {type === 'complete' ? '🎉 ' : type === 'accept' ? '🚀 ' : '🔔 '}
            {title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {message}
          </p>
        </div>
        {(taskTitle || fee !== undefined) && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {taskTitle && (
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {taskTitle}
              </span>
            )}
            {fee !== undefined && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg ml-auto">
                {new Intl.NumberFormat('tr-TR').format(fee)} ₺
              </span>
            )}
          </div>
        )}
      </div>
    ),
    { duration: 5000 }
  );
}
