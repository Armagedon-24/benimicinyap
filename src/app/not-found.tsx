'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
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
        <div className="w-16 h-16 bg-red-100/80 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto border border-red-200/30">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight dark:drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            404
          </h1>
          <h2 className="text-xl font-bold">Sayfa veya Görev Bulunamadı</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aradığınız adres mevcut değil ya da ilgili saha görevinin süresi dolmuş veya kaldırılmış olabilir.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/" passHref legacyBehavior>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold dark:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <ArrowLeft className="w-4 h-4" />
              Keşfet / Haritaya Dön
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
