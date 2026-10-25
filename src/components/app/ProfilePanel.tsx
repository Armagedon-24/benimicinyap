'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Star,
  Save,
  Loader2,
  Shield,
  Award,
  MessageSquare,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldCheck,
  Gem,
  Heart,
  ShieldAlert,
} from 'lucide-react';
import { getUserBadges } from '@/lib/badges';

const badgeIcons: Record<string, React.ComponentType<any>> = {
  ShieldCheck,
  Award,
  Gem,
  Heart,
  ShieldAlert,
};
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import type { Review } from '@/lib/types';

function StarRating({ rating, size = 'md', interactive = false, onChange }: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  const stars = [1, 2, 3, 4, 5];
  const display = interactive ? (hover || rating) : rating;

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(s)}
        >
          <Star
            className={`${sizeClass} ${
              s <= display
                ? 'text-amber-500 fill-amber-500'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBreakdown({ breakdown, total }: { breakdown: number[]; total: number }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-muted-foreground">{star}</span>
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfilePanel() {
  const { currentUser, login, addLog, setKycModalOpen } = useAppStore();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  // Profile data (reviews etc.)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [filterRating, setFilterRating] = useState<string>('all');

  useEffect(() => {
    if (!currentUser) return;
    // Reset form
    setFullName(currentUser.fullName);
    setCity(currentUser.city);
    setBio(currentUser.bio);

    // Fetch profile with reviews
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/profile?userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          setRatingBreakdown(data.ratingBreakdown || [0, 0, 0, 0, 0, 0]);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (filterRating === 'all') return true;
      if (filterRating === '5') return r.rating === 5;
      if (filterRating === '4') return r.rating === 4;
      if (filterRating === 'critical') return r.rating <= 3;
      return true;
    });
  }, [reviews, filterRating]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!fullName.trim()) {
      toast.error('Ad Soyad boş olamaz');
      return;
    }
    if (!city.trim()) {
      toast.error('Şehir boş olamaz');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          fullName: fullName.trim(),
          city: city.trim(),
          bio: bio.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        login({ ...currentUser, fullName: fullName.trim(), city: city.trim(), bio: bio.trim() });
        localStorage.setItem('current_user', JSON.stringify({
          ...currentUser,
          fullName: fullName.trim(),
          city: city.trim(),
          bio: bio.trim(),
        }));
        setEditMode(false);
        toast.success('Profil güncellendi!');
        addLog(`Profil güncellendi: ${fullName.trim()}`);
      } else {
        toast.error(data.message || 'Güncelleme başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!currentUser) return;
    setFullName(currentUser.fullName);
    setCity(currentUser.city);
    setBio(currentUser.bio);
    setEditMode(false);
  };

  if (!currentUser) return null;

  const initials = currentUser.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Profil Bilgileri
            </CardTitle>
            {!editMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setEditMode(true)}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Düzenle
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  İptal
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Kaydet
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar + Name Section */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="bg-blue-600 text-white text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              {editMode ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Ad Soyad</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Şehir</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold">{currentUser.fullName}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {currentUser.city}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentUser.tcVerified && (
                      <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700">
                        <Shield className="w-3 h-3 mr-1" />
                        T.C. Onaylı
                      </Badge>
                    )}
                    {currentUser.paymentVerified && (
                      <Badge variant="default" className="text-[10px] bg-blue-600 hover:bg-blue-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ödeme Onaylı
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      <Award className="w-3 h-3 mr-1" />
                      {currentUser.completedTasksCount} Görev Tamamladı
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            {editMode ? (
              <>
                <Label className="text-xs">Hakkımda</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendinizi kısaca tanıtın..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </>
            ) : (
              <>
                <Label className="text-xs text-muted-foreground">Hakkımda</Label>
                <p className="text-sm leading-relaxed">
                  {currentUser.bio || (
                    <span className="text-muted-foreground italic">Henüz bir bio eklenmedi. Düzenle butonuna tıklayarak ekleyebilirsiniz.</span>
                  )}
                </p>
              </>
            )}
          </div>
          {/* Dynamic Badges */}
          {!editMode && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Kazanılan Rozetler</Label>
              {getUserBadges(currentUser).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getUserBadges(currentUser).map((badge) => {
                    const IconComponent = badgeIcons[badge.icon] || Award;
                    return (
                      <div
                        key={badge.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg bg-gradient-to-r ${badge.color} text-white shadow-sm transition-all hover:scale-[1.02]`}
                      >
                        <div className="p-1.5 rounded-md bg-white/20">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{badge.name}</p>
                          <p className="text-[10px] text-white/80 leading-normal">{badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Henüz bir rozet kazanılmadı.</p>
              )}
            </div>
          )}

          {/* Contact Info (read-only display) */}
          {!editMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">E-posta</Label>
                <p className="text-sm font-medium">{currentUser.email}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Kayıt Tarihi</Label>
                <p className="text-sm font-medium">{formatDate(currentUser.createdAt)}</p>
              </div>
            </div>
          )}

          {/* KYC Verification status and trigger */}
          {!editMode && (
            <div className="border-t pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-start gap-2.5">
                  <Shield className={`w-5 h-5 mt-0.5 ${currentUser.tcVerified ? 'text-green-600' : 'text-amber-500'}`} />
                  <div>
                    <h4 className="text-sm font-semibold">T.C. Kimlik Doğrulaması</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentUser.tcVerified
                        ? `Kimliğiniz Nüfus Müdürlüğü sistemlerinden onaylanmıştır. (T.C. No: ${currentUser.tcNo ? `${currentUser.tcNo.slice(0, 2)}*****${currentUser.tcNo.slice(9)}` : 'Doğrulanmış'})`
                        : 'Sadece güvenli görevleri almak ve vermek için kimliğinizi 1 dakikada doğrulayın.'}
                    </p>
                  </div>
                </div>
                {!currentUser.tcVerified && (
                  <Button
                    onClick={() => setKycModalOpen(true)}
                    className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
                  >
                    Şimdi Doğrula
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Değerlendirme Puanı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left: Big rating */}
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-5xl font-bold text-amber-600 dark:text-amber-400">
                {currentUser.rating.toFixed(1)}
              </span>
              <StarRating rating={Math.round(currentUser.rating)} size="lg" />
              <p className="text-sm text-muted-foreground">
                {currentUser.totalReviews} değerlendirme
              </p>
            </div>
            {/* Right: Breakdown */}
            <div className="flex items-center">
              {loading ? (
                <div className="flex-1 flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex-1">
                  <RatingBreakdown
                    breakdown={ratingBreakdown}
                    total={reviews.length || currentUser.totalReviews}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Değerlendirmeler ({reviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Henüz değerlendirme yok</p>
              <p className="text-xs text-muted-foreground">Tamamladığınız görevler için değerlendirmeler burada görünecek</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {[
                  { id: 'all', label: `Tümü (${reviews.length})` },
                  { id: '5', label: `5 Yıldız (${reviews.filter(r => r.rating === 5).length})` },
                  { id: '4', label: `4 Yıldız (${reviews.filter(r => r.rating === 4).length})` },
                  { id: 'critical', label: `Kritik (${reviews.filter(r => r.rating <= 3).length})` },
                ].map((btn) => (
                  <Button
                    key={btn.id}
                    variant={filterRating === btn.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-semibold px-3"
                    onClick={() => setFilterRating(btn.id)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>

              {filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  Seçilen kriterde değerlendirme bulunmamaktadır.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReviews.map((review) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-indigo-600 text-white text-[10px]">
                              {review.fromUserName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{review.fromUserName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {review.fromRole === 'requester' ? 'İşi Veren' : 'İşi Alan'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <StarRating rating={review.rating} size="sm" />
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Görev: {review.taskTitle}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}