'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console/reporting service
    console.error('Captured global error:', error);
  }, [error]);

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0C16] text-slate-800 dark:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Background decorations */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-600/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full glass-card border border-slate-200/50 dark:border-white/10 p-8 rounded-2xl text-center space-y-6 shadow-xl relative z-10"
      >
        <div className="w-16 h-16 bg-amber-100/80 dark:bg-amber-950/30 rounded-full flex items-center justify-center mx-auto border border-amber-200/30">
          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Bir Sistem Hatası Oluştu</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            İşlem gerçekleştirilirken geçici bir sorunla karşılaşıldı. Lütfen sayfayı yenilemeyi veya yeniden denemeyi deneyin.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
              Hata Kodu: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <RotateCcw className="w-4 h-4" />
            Yeniden Dene
          </Button>
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="flex-1 gap-2 font-semibold"
          >
            <Home className="w-4 h-4" />
            Ana Sayfa
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
