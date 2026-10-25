'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Shield, Lock, Eye, Bell, BellOff, CheckCircle2, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';

const notifIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const notifColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  success: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
  error: 'text-red-500 bg-red-50 dark:bg-red-950/30',
};

export function SecurityModal() {
  const { securityModalOpen, setSecurityModalOpen } = useAppStore();

  return (
    <Dialog open={securityModalOpen} onOpenChange={setSecurityModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Uçtan Uca Şifreleme Güvencesi
          </DialogTitle>
          <DialogDescription>Platform güvenlik altyapısı hakkında bilgilendirme</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Oturum ve Yetki Koruması</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Oturumlar HttpOnly imzalı cookie ile korunur. Hassas API işlemleri sunucu tarafında kullanıcı ve rol
                kontrolünden geçer; istemcinin gönderdiği kullanıcı kimliği tek başına yetki sağlamaz.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
            <Eye className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Parola Güvenliği</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Yeni parolalar scrypt ile hashlenir ve düz metin olarak API yanıtlarına dahil edilmez. Eski kayıtlar
                güvenli giriş sonrası otomatik olarak hashlenmiş biçime geçirilir.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
            <Shield className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">Finansal İşlem Bütünlüğü</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Cüzdan, escrow ve ödeme callback güncellemeleri veritabanı transaction’larıyla yürütülür.
                Tekrarlanan ödeme bildirimleri ikinci kez bakiye yazamaz.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm">İzleme ve Rate Limit</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Başarısız ve kritik işlemler güvenlik olayları olarak kaydedilir. Giriş ve kayıt uçları kötüye
                kullanım denemelerini yavaşlatan rate limit korumasına sahiptir.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LegalModal() {
  const { legalModalOpen, setLegalModalOpen } = useAppStore();

  return (
    <Dialog open={legalModalOpen} onOpenChange={setLegalModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Yasal Bilgi & Kullanım Koşulları
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 text-sm text-muted-foreground">
            <section>
              <h4 className="font-semibold text-foreground mb-1">1. Hizmet Tanımı</h4>
              <p>
                &quot;Benim İçin Yap&quot;, kullanıcıların günlük işlerini güvenli bir platform üzerinden başkalarına
                devretmelerini sağlayan bir görev devri platformudur. Platform, görev sahibi ile görevli arasında
                şifreli iletişim ve escrow tabanlı ödeme güvencesi sunar.
              </p>
            </section>
            <Separator />
            <section>
              <h4 className="font-semibold text-foreground mb-1">2. Kullanıcı Yükümlülükleri</h4>
              <p>
                Kullanıcılar, platforma doğru ve güncel bilgiler vermeyi taahhüt eder. T.C. Kimlik doğrulaması
                yapılmayan kullanıcılar sınırlı işlem yapabilir. Kullanıcılar, görevleri zamanında ve belirtildiği
                şekilde tamamlamakla yükümlüdür.
              </p>
            </section>
            <Separator />
            <section>
              <h4 className="font-semibold text-foreground mb-1">3. Ödeme &amp; Güvence Sistemi</h4>
              <p>
                Tüm ödemeler escrow (güvence havuzu) sistemi üzerinden yönetilir. Görev sahibinin ödemesi,
                görev tamamlanıp onaylanana kadar platformda bloke edilir. Onay sonrası ödeme görevliye
                aktarılır. Bu mekanizma her iki tarafın haklarını korur.
              </p>
            </section>
            <Separator />
            <section>
              <h4 className="font-semibold text-foreground mb-1">4. Veri Gizliliği</h4>
              <p>
                Kullanıcı verileri 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlenir.
                Tüm veriler AES-256 şifreleme ile korunmaktadır. Üçüncü taraflarla veri paylaşılmaz.
              </p>
            </section>
            <Separator />
            <section>
              <h4 className="font-semibold text-foreground mb-1">5. Sorumluluk Sınırı</h4>
              <p>
                Platform, görev sahibi ile görevli arasında sadece aracı rolü üstlenir. Görevin kalitesi,
                zamanında yapılması veya doğruluğu konusunda platform sorumluluk kabul etmez.
                Kullanıcılar arası anlaşmazlıklarda platform arabuluculuk yapabilir ancak nihai karar
                kullanıcıları aittir.
              </p>
            </section>
            <Separator />
            <section>
              <h4 className="font-semibold text-foreground mb-1">6. İletişim</h4>
              <p>
                Her türlü soru, öneri ve şikayetleriniz için support@benimicinyap.com adresine
                ulaşabilirsiniz.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function NotificationsPanel() {
  const {
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    markAllRead,
    setNotifications,
    currentUser,
  } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleMarkAllRead = async () => {
    markAllRead();
    try {
      if (currentUser?.id) {
        await fetch('/api/notifications?action=mark-read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
    } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    setNotifications([]);
    try {
      if (currentUser?.id) {
        await fetch('/api/notifications', { method: 'DELETE' });
      }
    } catch { /* silent */ }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} saat önce`;
    return d.toLocaleDateString('tr-TR');
  };

  return (
    <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Bildirimler
            {notifications.filter((n) => !n.read).length > 0 && (
              <Badge variant="default" className="ml-2">
                {notifications.filter((n) => !n.read).length}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mt-4 mb-2">
          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={handleMarkAllRead}>
            <BellOff className="w-3.5 h-3.5 mr-1" />
            Tümünü Okundu İşaretle
          </Button>
          <Button variant="outline" size="sm" className="text-xs flex-1 text-red-500" onClick={handleClearAll}>
            Tümünü Temizle
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]" ref={scrollRef}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {notifications.map((notif) => {
                const Icon = notifIcons[notif.type] || Info;
                const colorClass = notifColors[notif.type] || notifColors.info;
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      notif.read
                        ? 'bg-background'
                        : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-md shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function KycModal() {
  const { kycModalOpen, setKycModalOpen, currentUser, updateCurrentUser, addLog } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [tcNo, setTcNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (tcNo.length !== 11) {
      toast.error('T.C. Kimlik Numarası 11 haneli olmalıdır');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          tcNo,
          fullName,
          birthYear: parseInt(birthYear),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        updateCurrentUser({ tcVerified: true, tcNo });
        addLog(`T.C. Kimlik doğrulaması yapıldı: ${currentUser.fullName}`);
        
        // Update localStorage
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          userObj.tcVerified = true;
          userObj.tcNo = tcNo;
          localStorage.setItem('current_user', JSON.stringify(userObj));
        }

        setKycModalOpen(false);
      } else {
        toast.error(data.message || 'Kimlik bilgileri doğrulamadan geçemedi');
      }
    } catch {
      toast.error('Doğrulama servisine bağlanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Nüfus Müdürlüğü T.C. Kimlik Doğrulama
          </DialogTitle>
          <DialogDescription>
            Görevi alan veya verenlerin güvenliği için resmi NVI (Nüfus ve Vatandaşlık İşleri) veritabanı sorgulaması yapılır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">T.C. Kimlik Numarası</label>
            <input
              type="text"
              maxLength={11}
              required
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="11 haneli T.C. No"
              value={tcNo}
              onChange={(e) => setTcNo(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Ad Soyad (Kimlikteki gibi BÜYÜK harflerle)</label>
            <input
              type="text"
              required
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="Örn: HAKAN VARLIK"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Doğum Yılı</label>
            <input
              type="text"
              maxLength={4}
              required
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: 1994"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Bilgileriniz sadece NVI doğrulama amacıyla anlık olarak sorgulanır ve sistemde asla plaintext olarak depolanmaz. Son hanesi çift sayı olan T.C. kimlik numaraları doğrulamayı simüle eder.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setKycModalOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kimliği Doğrula
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}