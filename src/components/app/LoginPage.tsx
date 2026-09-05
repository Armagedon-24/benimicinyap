'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, User, MapPin, FileText, UserPlus, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { turkishCities } from '@/data/cities';
import { useAppStore } from '@/store/useAppStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const login = useAppStore((s) => s.login);
  const addLog = useAppStore((s) => s.addLog);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regTcNo, setRegTcNo] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      toast.error('E-posta ve şifre zorunludur');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.user);
        addLog(`Kullanıcı giriş yaptı: ${data.user.fullName} (${data.user.email})`);
        toast.success(`Hoş geldiniz, ${data.user.fullName}!`);
        onLoginSuccess();
      } else {
        toast.error(data.message || 'Giriş başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası oluştu');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regFullName) {
      toast.error('E-posta, şifre ve ad soyad zorunludur');
      return;
    }
    if (regTcNo && regTcNo.length !== 11) {
      toast.error('T.C. kimlik numarası 11 haneli olmalıdır');
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          fullName: regFullName,
          city: regCity,
          tcNo: regTcNo,
          bio: regBio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.user);
        addLog(`Yeni kullanıcı kaydı: ${data.user.fullName} (${data.user.email})`);
        toast.success('Kayıt başarılı! Hoş geldiniz!');
        onLoginSuccess();
      } else {
        toast.error(data.message || 'Kayıt başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası oluştu');
    } finally {
      setRegLoading(false);
    }
  };


  const formatTL = (amount: number) =>
    new Intl.NumberFormat('tr-TR').format(amount) + ' ₺';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative gradient blur circles */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute top-[40%] right-[20%] w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-3xl shadow-xl border-0 overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-center text-white">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center p-1">
                <Image src="/icons/icon.svg" alt="Benim İçin Yap" width={64} height={64} className="w-14 h-14 object-contain" priority />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Güvenli Görev Devri</h1>
            <p className="text-sm text-blue-100 mt-1.5 leading-relaxed">
              Şifreli Uçtan Uca İletişim & Ödeme Güvence Altyapısı
            </p>
          </div>

          <CardContent className="p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                <TabsTrigger value="register">Kayıt Ol (Verify)</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="ornek@email.com"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin(loginEmail, loginPassword)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin(loginEmail, loginPassword)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
                    onClick={() => handleLogin(loginEmail, loginPassword)}
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 mr-2" />
                    )}
                    Güvenli Giriş Yap
                  </Button>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="ornek@email.com"
                        className="pl-10"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Ad Soyad</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        placeholder="Ad Soyad"
                        className="pl-10"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Şehir</Label>
                    <Select value={regCity} onValueChange={setRegCity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {turkishCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-tc">T.C. Kimlik No (11 hane)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-tc"
                        placeholder="12345678901"
                        className="pl-10"
                        maxLength={11}
                        value={regTcNo}
                        onChange={(e) => setRegTcNo(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-bio">Hakkımda</Label>
                    <Textarea
                      id="reg-bio"
                      placeholder="Kendinizi kısaca tanıtın..."
                      rows={2}
                      value={regBio}
                      onChange={(e) => setRegBio(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
                    disabled={regLoading}
                  >
                    {regLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Kayıt ve Doğrulamayı Tamamla
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

          </CardContent>

          {/* Footer */}
          <CardHeader className="pb-5 pt-0 px-6">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>End-To-End Encrypted Secure Login Tunnel</span>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
}