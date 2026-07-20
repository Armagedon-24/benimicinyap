'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import type { Review } from '@/lib/types';

function InteractiveStars({ rating, onChange }: { rating: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            className="cursor-pointer hover:scale-125 transition-transform p-0.5"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(s)}
          >
            <Star
              className={`w-8 h-8 ${
                s <= (hover || rating)
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-muted-foreground/30'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
      {(hover || rating) > 0 && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {labels[hover || rating]}
        </p>
      )}
    </div>
  );
}

export default function RatingModal() {
  const { ratingModal, setRatingModal, currentUser, addLog, updateCurrentUser } = useAppStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ratingModal || !currentUser) return;
    setRating(0);
    setComment('');
    setAlreadyReviewed(false);
    setLoading(true);

    const check = async () => {
      try {
        const res = await fetch(`/api/reviews?taskId=${ratingModal.taskId}`);
        const data = await res.json();
        if (data.success) {
          const existing = data.reviews?.find(
            (r: Review) => r.fromUserId === currentUser.id
          );
          if (existing) {
            setAlreadyReviewed(true);
            setRating(existing.rating);
            setComment(existing.comment);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [ratingModal, currentUser]);

  const handleClose = () => {
    setRatingModal(null);
    setRating(0);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!currentUser || !ratingModal || rating === 0) {
      toast.error('Lütfen bir puan seçin');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: ratingModal.taskId,
          fromUserId: currentUser.id,
          fromUserName: currentUser.fullName,
          toUserId: ratingModal.targetUserId,
          toUserName: ratingModal.targetUserName,
          rating,
          comment: comment.trim(),
          fromRole: ratingModal.fromRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Değerlendirmeniz kaydedildi!');
        addLog(`Değerlendirme gönderildi: ${ratingModal.targetUserName} → ${rating} yıldız`);

        // Update local user rating if we got a review back
        if (data.review) {
          // Refresh profile data to get updated rating
          try {
            const profileRes = await fetch(`/api/users/profile?userId=${currentUser.id}`);
            const profileData = await profileRes.json();
            if (profileData.success) {
              const u = profileData.user;
              updateCurrentUser({ rating: u.rating, totalReviews: u.totalReviews });
              localStorage.setItem('current_user', JSON.stringify({
                ...currentUser,
                rating: u.rating,
                totalReviews: u.totalReviews,
              }));
            }
          } catch { /* silent */ }
        }

        handleClose();
      } else {
        toast.error(data.message || 'Değerlendirme kaydedilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ratingModal) return null;

  const targetInitials = ratingModal.targetUserName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={!!ratingModal} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Değerlendir
          </DialogTitle>
          <DialogDescription className="text-sm">
            Görev tamamlandı. {ratingModal.targetUserName} kullanıcısını değerlendirin.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : alreadyReviewed ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-semibold">Zaten değerlendirdiniz</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-indigo-600 text-white text-xs">
                    {targetInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{ratingModal.targetUserName}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {comment && (
                <p className="text-sm text-muted-foreground">{comment}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Kapat
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Target user info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-indigo-600 text-white text-sm">
                  {targetInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{ratingModal.targetUserName}</p>
                <p className="text-xs text-muted-foreground truncate">{ratingModal.taskTitle}</p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="space-y-1.5">
              <Label className="text-sm">Puanınız</Label>
              <InteractiveStars rating={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <Label className="text-sm">Yorumunuz (İsteğe bağlı)</Label>
              <Textarea
                placeholder={`${ratingModal.targetUserName} ile çalışma deneyiminiz hakkında bir şey yazın...`}
                rows={3}
                className="text-sm resize-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Atla
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Gönder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}