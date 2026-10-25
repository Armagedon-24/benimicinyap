'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet as WalletIcon,
  CreditCard,
  Shield,
  BookOpen,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  CheckCircle2,
  Trash2,
  Landmark,
  Printer,
} from 'lucide-react';
import { printReceipt } from '@/lib/receipt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import type { Transaction, PaymentCard } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const banks = [
  'Garanti BBVA',
  'Akbank',
  'Yapı Kredi',
  'Ziraat',
  'İş Bankası',
  'QNB Finansbank',
];

const txTypeMap: Record<string, { label: string; color: string }> = {
  escrow_block: { label: 'Escrow Bloke', color: 'text-amber-600 dark:text-amber-400' },
  escrow_release: { label: 'Escrow Serbest', color: 'text-green-600 dark:text-green-400' },
  wallet_load: { label: 'Bakiye Yükleme', color: 'text-blue-600 dark:text-blue-400' },
  wallet_withdraw: { label: 'Bakiye Çekme', color: 'text-red-600 dark:text-red-400' },
  admin_adjust: { label: 'Admin Ayarlama', color: 'text-purple-600 dark:text-purple-400' },
  platform_commission: { label: 'Platform Komisyonu', color: 'text-orange-600 dark:text-orange-400' },
};

const txStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'secondary' },
  completed: { label: 'Tamamlandı', variant: 'default' },
  failed: { label: 'Başarısız', variant: 'destructive' },
};

export default function Wallet() {
  const {
    currentUser,
    walletBalance,
    escrowBalance,
    setWalletBalance,
    setEscrowBalance,
    addLog,
  } = useAppStore();

  const [loadAmount, setLoadAmount] = useState('');
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('');
  const paymentProvider = 'iyzico';

  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawIban, setWithdrawIban] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!currentUser) return;
    try {
      const txRes = await fetch(`/api/wallet?userId=${currentUser.id}`);
      const txData = await txRes.json();
      if (txData.success) {
        setTransactions(txData.transactions || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      setTxLoading(true);
      await fetchTransactions();
      setTxLoading(false);
    };
    fetchData();
  }, [currentUser]);

  if (!currentUser) return null;

  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString('tr-TR') : '';

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    let csvContent = '\uFEFF';
    csvContent += 'İşlem;Tür;Tutar;Durum;Tarih\n';
    transactions.forEach((tx) => {
      const typeLabel = txTypeMap[tx.type]?.label || tx.type;
      const statusLabel = txStatusMap[tx.status]?.label || tx.status;
      const amountSign = tx.type === 'wallet_withdraw' || tx.type === 'escrow_block' ? '-' : '+';
      const row = [
        `"${(tx.taskTitle || '').replace(/"/g, '""')}"`,
        `"${typeLabel}"`,
        `"${amountSign}${tx.amount} ₺"`,
        `"${statusLabel}"`,
        `"${new Date(tx.createdAt).toLocaleString('tr-TR')}"`
      ];
      csvContent += row.join(';') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `islem_gecmisi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('İşlem geçmişi CSV olarak indirildi!');
  };

  const quickAmounts = [100, 250, 500, 1000];

  const handleLoad = async () => {
    const amount = parseFloat(loadAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    setLoadLoading(true);
    setLoadProgress(10);
    setLoadStage('Güvenli ödeme oturumu başlatılıyor...');

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize_payment',
          userId: currentUser.id,
          amount,
          provider: paymentProvider,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLoadProgress(100);
        setLoadStage('Yönlendiriliyor...');
        
        if (data.provider === 'iyzico') {
          toast.info('Iyzico ödeme sayfasına yönlendiriliyorsunuz...');
          window.location.href = data.paymentPageUrl;
        }
      } else {
        toast.error(data.message || 'Ödeme başlatılamadı');
        setLoadLoading(false);
      }
    } catch {
      toast.error('Bağlantı hatası oluştu');
      setLoadLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!withdrawBank || !withdrawIban || !withdrawName) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }
    if (amount > walletBalance) {
      toast.error('Yetersiz bakiye');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          userId: currentUser.id,
          amount,
          bankName: withdrawBank,
          iban: withdrawIban,
          accountName: withdrawName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWalletBalance(data.user.walletBalance);
        await fetchTransactions();
        const feeNote = data.transaction?.platformFee > 0
          ? ` (İşlem ücreti: ${formatTL(data.transaction.platformFee)})`
          : '';
        addLog(`Bakiye çekildi: -${formatTL(amount)} → ${withdrawBank}${feeNote}`);
        toast.success(`${formatTL(amount)} başarıyla ${withdrawBank} hesabına gönderildi${feeNote}`);
        setWithdrawAmount('');
        setWithdrawIban('');
        setWithdrawName('');
        setWithdrawBank('');
      } else {
        toast.error(data.message || 'Çekim başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası oluştu');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <WalletIcon className="w-6 h-6 text-blue-600" />
          Cüzdan & Ödeme
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bakiyenizi yönetin, para yükleyin veya çekin
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass-card border border-blue-200/50 dark:border-blue-500/30 neon-border-blue">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Cüzdan Bakiyesi</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {formatTL(walletBalance)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100/70 dark:bg-blue-950/50 flex items-center justify-center border border-blue-200/30">
                  <WalletIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border border-amber-200/50 dark:border-amber-500/30 neon-border-green">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Escrow Güvence Havuzu</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {formatTL(escrowBalance)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 flex items-center justify-center border border-amber-200/30">
                  <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="balance" className="text-xs sm:text-sm gap-1">
            <WalletIcon className="w-3.5 h-3.5 hidden sm:block" />
            Cüzdan
          </TabsTrigger>
          <TabsTrigger value="cards" className="text-xs sm:text-sm gap-1">
            <CreditCard className="w-3.5 h-3.5 hidden sm:block" />
            Kartlarım
          </TabsTrigger>
          <TabsTrigger value="escrow" className="text-xs sm:text-sm gap-1">
            <Shield className="w-3.5 h-3.5 hidden sm:block" />
            Escrow
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs sm:text-sm gap-1">
            <BookOpen className="w-3.5 h-3.5 hidden sm:block" />
            Defter
          </TabsTrigger>
        </TabsList>

        {/* Balance Tab */}
        <TabsContent value="balance" className="mt-5 space-y-6">
          {/* Load Form */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                Bakiye Yükle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Yüklenecek Tutar</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(e.target.value)}
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setLoadAmount(String(amt))}
                  >
                    +{amt} ₺
                  </Button>
                ))}
              </div>

              {/* 3D Secure Progress */}
              {loadLoading && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {loadStage}
                  </div>
                  <Progress value={loadProgress} className="h-2" />
                </div>
              )}

              {loadProgress === 100 && !loadLoading && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-2">
                  <CheckCircle2 className="w-4 h-4" />
                  İşlem başarıyla tamamlandı!
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white"
                onClick={handleLoad}
                disabled={loadLoading || !loadAmount}
              >
                {loadLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Güvenli 3D Ödeme ile Yükle
              </Button>
            </CardContent>
          </Card>

          {/* Withdraw Form */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-red-600" />
                Bankaya Çek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label>Banka</Label>
                  <Select value={withdrawBank} onValueChange={setWithdrawBank}>
                    <SelectTrigger>
                      <SelectValue placeholder="Banka seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b} value={b}>
                          <div className="flex items-center gap-2">
                            <Landmark className="w-3.5 h-3.5" />
                            {b}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    value={withdrawIban}
                    onChange={(e) => setWithdrawIban(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acc-name">Hesap Sahibi Adı</Label>
                  <Input
                    id="acc-name"
                    placeholder="Ad Soyad"
                    value={withdrawName}
                    onChange={(e) => setWithdrawName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wd-amount">Çekim Tutarı</Label>
                  <Input
                    id="wd-amount"
                    type="number"
                    placeholder="0"
                    min="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 dark:text-red-400"
                  disabled={withdrawLoading}
                >
                  {withdrawLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Bankaya Transfer Et
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="mt-5">
          <Card className="glass-card">
            <CardContent className="p-6">
              {cards.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Kayıtlı kart bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{card.bankName}</p>
                          <p className="text-xs text-muted-foreground">{card.cardNumber}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escrow Tab */}
        <TabsContent value="escrow" className="mt-5">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold">Escrow Güvence Havuzu</h3>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                  {formatTL(escrowBalance)}
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Escrow Nasıl Çalışır?
                </h4>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5 leading-relaxed">
                  <li>• Görev yayınlandığında, ücret Escrow havuzunda bloke edilir.</li>
                  <li>• Görev tamamlandığında, hizmet verenin onayıyla ücret serbest bırakılır.</li>
                  <li>• Her iki taraf da güvence altındadır — dolandırıcılık riski minimuma iner.</li>
                  <li>• Uyuşmazlık durumunda yönetici müdahalesi ile çözüm sağlanır.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="mt-5">
          <Card className="glass-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Hesap Defteri (Ledger)</CardTitle>
              {transactions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={handleExportCSV}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Excel/CSV İndir
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {txLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Henüz işlem kaydı yok</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">İŞLEM</TableHead>
                        <TableHead className="text-xs">TÜR</TableHead>
                        <TableHead className="text-xs text-right">TUTAR</TableHead>
                        <TableHead className="text-xs">STATÜ</TableHead>
                        <TableHead className="text-xs">TARİH</TableHead>
                        <TableHead className="text-xs text-right">BELGE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => {
                        const txType = txTypeMap[tx.type] || { label: tx.type, color: '' };
                        const txStatus = txStatusMap[tx.status] || txStatusMap.completed;
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs font-medium max-w-40 truncate">
                              {tx.taskTitle || '-'}
                            </TableCell>
                            <TableCell className={`text-xs font-medium ${txType.color}`}>
                              {txType.label}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold">
                              {tx.type === 'wallet_withdraw' || tx.type === 'escrow_block'
                                ? `- ${formatTL(tx.amount)}`
                                : `+ ${formatTL(tx.amount)}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={txStatus.variant} className="text-[10px]">
                                {txStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  title="Makbuz Yazdır / Kaydet"
                                  onClick={() => printReceipt(tx)}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}