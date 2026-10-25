import { User } from './types';

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind gradient classes, e.g. "from-amber-500 to-orange-600"
  icon: string; // Lucide icon identifier
}

export function getUserBadges(user: User): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  // 1. Güvenilir Profil (KYC Verified)
  if (user.tcVerified) {
    badges.push({
      id: 'kyc_verified',
      name: 'Güvenilir Üye',
      description: 'T.C. Kimlik doğrulaması tamamlanmış onaylı profil.',
      color: 'from-blue-500 to-indigo-600',
      icon: 'ShieldCheck',
    });
  }

  // 2. Yıldız Görevli (Star Tasker)
  if (user.completedTasksCount >= 3 && user.rating >= 4.6) {
    badges.push({
      id: 'star_tasker',
      name: 'Yıldız Görevli',
      description: 'En az 3 görevi yüksek başarıyla tamamlamış üye.',
      color: 'from-amber-500 to-yellow-600',
      icon: 'Award',
    });
  }

  // 3. Elit Üye / Cömert Cüzdan (Premium Wallet)
  if (user.walletBalance >= 1000) {
    badges.push({
      id: 'premium_wallet',
      name: 'Elit Üye',
      description: 'Cüzdan bakiyesi 1.000 ₺ üzerinde olan aktif yatırımcı.',
      color: 'from-emerald-500 to-teal-600',
      icon: 'Gem',
    });
  }

  // 4. Tecrübeli Üye (Experienced Member)
  if (user.totalReviews >= 2) {
    badges.push({
      id: 'experienced',
      name: 'Popüler Üye',
      description: 'Çok sayıda başarılı işbirliği ve geri bildirim almış üye.',
      color: 'from-purple-500 to-pink-600',
      icon: 'Heart',
    });
  }

  // 5. Admin Badge
  if (user.role === 'admin') {
    badges.push({
      id: 'admin_badge',
      name: 'Yönetici',
      description: 'Platform operasyon yöneticisi.',
      color: 'from-red-500 to-rose-700',
      icon: 'ShieldAlert',
    });
  }

  return badges;
}
