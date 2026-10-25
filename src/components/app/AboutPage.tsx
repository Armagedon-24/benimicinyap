'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Shield,
  ShieldCheck,
  Lock,
  MapPin,
  Bot,
  Scale,
  Percent,
  UserCheck,
  Send,
  Loader2,
  Mail,
  User,
  MessageSquare,
  Tag,
  ArrowLeft,
  Wallet,
  ClipboardList,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AboutPageProps {
  isGuest?: boolean;
  onBackToLogin?: () => void;
}

const steps = [
  {
    icon: ClipboardList,
    title: '1. Görevi Yayınla',
    desc: 'İhtiyacınız olan görevi şehir ve ücret bilgisiyle yayınlayın. Ödeme anında güvenlik havuzunda (escrow) bloke edilir.',
  },
  {
    icon: Search,
    title: '2. Teklif Al & Seç',
    desc: 'Yakınınızdaki görevli teklif verir; puanı, yorumları ve teklif tutarını karşılaştırıp en uygun kişiyi seçersiniz.',
  },
  {
    icon: MapPin,
    title: '3. Görevi Yap & Kanıtla',
    desc: 'Görevli işi tamamlar ve fotoğraf + açıklama kanıtı yükler. Yapay zeka destekli tarama kanıtın gerçekliğini analiz eder.',
  },
  {
    icon: Wallet,
    title: '4. Onayla & Ödemeyi Serbest Bırak',
    desc: 'İşveren teslimi onayladığında bloke edilen ücret, komisyon düşülerek görevlinin cüzdanına anında aktarılır.',
  },
];

const features = [
  {
    icon: Lock,
    title: 'Escrow Güvencesi',
    desc: 'Ödemeniz üçüncü taraf güvenlik havuzunda bloke edilir; iş onaylanmadan hiç kimseye aktarılmaz.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    icon: ShieldCheck,
    title: 'T.C. Kimlik Doğrulaması',
    desc: 'Tüm kullanıcılar yasal mevzuat gereği T.C. kimlik numarasıyla doğrulanır; sahte hesaplara yer yoktur.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: Bot,
    title: 'AI Kanıt Taraması',
    desc: 'Teslim edilen fotoğraflar EXIF verisi, C2PA imzaları ve yapay zeka analiziyle doğrulanır; sahte teslim engellenir.',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: MapPin,
    title: 'Coğrafi Görev Haritası',
    desc: '81 il üzerinde görevleri haritada görün; mesafe filtresiyle sadece size yakın işleri keşfedin.',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Percent,
    title: 'Şeffaf Komisyon',
    desc: 'Platform komisyonu yönetici tarafından şeffaf biçimde belirlenir; her işlemde ne kadar kesildiği kayıt altındadır.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
  },
  {
    icon: Scale,
    title: 'Uyuşmazlık Çözümü',
    desc: 'Anlaşmazlık halinde yönetici hakem olarak devreye girer; escrow tutarını işverene iade eder veya görevliye aktarır.',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

export default function AboutPage({ isGuest = false, onBackToLogin }: AboutPageProps) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Mesajınız alındı!');
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(data.message || 'Mesaj gönderilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8">
      {/* Guest üst barı */}
      {isGuest && (
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon.svg" alt="Benim İçin Yap" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-sm font-bold">Benim İçin Yap</span>
          </div>
          <Button variant="outline" size="sm" onClick={onBackToLogin} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Giriş Ekranına Dön
          </Button>
        </div>
      )}

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 dark:from-blue-900 dark:via-indigo-950 dark:to-[#0A0B14] p-6 sm:p-10 text-white shadow-lg"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Image src="/icons/icon.svg" alt="Benim İçin Yap" width={30} height={30} className="h-7 w-7 object-contain" />
            </div>
            <Badge className="bg-white/15 hover:bg-white/15 text-white border border-white/20 gap-1.5">
              <Sparkles className="w-3 h-3" />
              Güvenli Görev Devri Platformu
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Benim İçin Yap
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-50/90 max-w-2xl leading-relaxed">
            <strong>Amacımız;</strong> yapamadığınız, zamanınız olmayan veya uzmanlık isteyen her türlü işi,
            T.C. kimliği doğrulanmış güvenilir kişilere güvenle devretmenizi sağlamak. Ödemeniz{' '}
            <strong>escrow güvenlik havuzunda</strong> bloke edilir, iş onaylanmadan hiç kimseye aktarılmaz.
            Aracı belirsizliği, sahte ilanlar ve ödeme riski olmadan görev pazarlığı.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { icon: Lock, label: 'Escrow Korumalı Ödeme' },
              { icon: ShieldCheck, label: 'T.C. Kimlik Doğrulama' },
              { icon: Bot, label: 'AI Kanıt Analizi' },
              { icon: UserCheck, label: 'Puan & Yorum Sistemi' },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur">
                <b.icon className="w-3.5 h-3.5" />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Nasıl Çalışır */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Nasıl Çalışır?
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Para işverenin cüzdanından havuza bloke edilir; görev akışı onayla tamamlanır.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 + i * 0.06 }}
            >
              <Card className="h-full glass-card glass-card-lift rounded-xl border-slate-200/60 dark:border-white/10">
                <CardContent className="p-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-3">
                    <s.icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Özellikler */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
      >
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Neden Benim İçin Yap?
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Güvenliği merkeze alan, baştan sona doğrulanmış bir görev deneyimi.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
            >
              <Card className="h-full glass-card glass-card-lift rounded-xl border-slate-200/60 dark:border-white/10">
                <CardContent className="p-4 flex gap-3">
                  <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center shrink-0`}>
                    <f.icon className={`w-4.5 h-4.5 ${f.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* İletişim Mesaj Panosu */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
      >
        <Card className="glass-card rounded-xl border-slate-200/60 dark:border-white/10 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Bize Ulaşın
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Soru, öneri ve görüşleriniz buradan doğrudan platform yönetimine iletilir.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ct-name" className="text-xs">Ad Soyad *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ct-name"
                    className="pl-10"
                    placeholder="Adınız Soyadınız"
                    maxLength={60}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-email" className="text-xs">E-posta *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ct-email"
                    type="email"
                    className="pl-10"
                    placeholder="ornek@email.com"
                    maxLength={120}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ct-subject" className="text-xs">Konu</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ct-subject"
                    className="pl-10"
                    placeholder="Mesajınızın konusu (isteğe bağlı)"
                    maxLength={120}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ct-message" className="text-xs">Mesajınız *</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="ct-message"
                    className="pl-10 min-h-[110px]"
                    placeholder="Bize iletmek istediğiniz mesajınızı yazın... (en az 5, en fazla 1000 karakter)"
                    maxLength={1000}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">{form.message.length}/1000</p>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Mesajınız yalnızca platform yönetimi tarafından okunur.
                </p>
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Mesajı Gönder
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
