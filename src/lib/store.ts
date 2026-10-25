// In-memory data store for Vercel serverless compatibility
// Replaces Prisma/SQLite which doesn't work in serverless

import type {
  User, Task, Bid, Transaction, Notification,
  Message, PaymentCard, SystemLog, PlatformSetting, Review
} from './types';

interface StoreData {
  users: Map<string, User>;
  tasks: Map<string, Task>;
  bids: Map<string, Bid>;
  transactions: Map<string, Transaction>;
  notifications: Map<string, Notification>;
  messages: Map<string, Message>;
  paymentCards: Map<string, PaymentCard>;
  systemLogs: Map<string, SystemLog>;
  platformSettings: Map<string, PlatformSetting>;
  reviews: Map<string, Review>;
  seeded: boolean;
}

const g = globalThis as unknown as { __store: StoreData | undefined };

function getStore(): StoreData {
  if (!g.__store) {
    g.__store = {
      users: new Map(),
      tasks: new Map(),
      bids: new Map(),
      transactions: new Map(),
      notifications: new Map(),
      messages: new Map(),
      paymentCards: new Map(),
      systemLogs: new Map(),
      platformSettings: new Map(),
      reviews: new Map(),
      seeded: false,
    };
  }
  return g.__store;
}

export function isStoreSeeded(): boolean {
  return getStore().seeded;
}

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function clearStore(): void {
  const s = getStore();
  s.users.clear();
  s.tasks.clear();
  s.bids.clear();
  s.transactions.clear();
  s.notifications.clear();
  s.messages.clear();
  s.paymentCards.clear();
  s.systemLogs.clear();
  s.platformSettings.clear();
  s.reviews.clear();
  s.seeded = false;
}

export function initStore(): void {
  const s = getStore();
  if (s.seeded) return;

  const ids = {
    admin: 'user-admin',
    hakan: 'user-hakan',
    elif: 'user-elif',
    mehmet: 'user-mehmet',
    ayse: 'user-ayse',
    ahmet: 'user-ahmet',
    t1: 'task-t1',
    t2: 'task-t2',
    t3: 'task-t3',
    t4: 'task-t4',
    t5: 'task-t5',
    t6: 'task-t6',
  };
  const n = now();

  // Users
  const users: User[] = [
    { id: ids.admin, email: 'hakan_varlik24@hotmail.com', password: 'Hakan_1251', fullName: 'Sistem Yöneticisi', city: 'Antalya', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'admin', walletBalance: 50000, escrowBalance: 0, rating: 5.0, totalReviews: 0, completedTasksCount: 0, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
    { id: ids.hakan, email: 'hakanvarlik24.HV@gmail.com', password: 'user123', fullName: 'Hakan Varlık', city: 'Antalya', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'user', walletBalance: 8500, escrowBalance: 2000, rating: 4.8, totalReviews: 12, completedTasksCount: 12, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
    { id: ids.elif, email: 'elif@gmail.com', password: 'user123', fullName: 'Elif Kaya', city: 'İzmir', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'user', walletBalance: 6200, escrowBalance: 0, rating: 4.9, totalReviews: 8, completedTasksCount: 8, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
    { id: ids.mehmet, email: 'mehmet@gmail.com', password: 'user123', fullName: 'Mehmet Yılmaz', city: 'Ankara', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'user', walletBalance: 4500, escrowBalance: 0, rating: 4.7, totalReviews: 15, completedTasksCount: 15, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
    { id: ids.ayse, email: 'ayse@gmail.com', password: 'user123', fullName: 'Ayşe Demir', city: 'Bursa', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'user', walletBalance: 7800, escrowBalance: 0, rating: 5.0, totalReviews: 5, completedTasksCount: 5, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
    { id: ids.ahmet, email: 'ahmet@gmail.com', password: 'user123', fullName: 'Ahmet Çelik', city: 'Istanbul', bio: '', tcNo: '', tcVerified: true, paymentVerified: true, role: 'user', walletBalance: 3200, escrowBalance: 0, rating: 4.6, totalReviews: 9, completedTasksCount: 9, isOnline: true, darkMode: false, createdAt: n, updatedAt: n },
  ];
  users.forEach(u => s.users.set(u.id, u));

  // Payment Cards
  const cards: PaymentCard[] = [
    { id: uid(), userId: ids.admin, bankName: 'Yapı Kredi', cardNumber: '****5512', cardHolder: 'Sistem Yöneticisi', createdAt: n },
    { id: uid(), userId: ids.admin, bankName: 'Garanti BBVA', cardNumber: '****8834', cardHolder: 'Sistem Yöneticisi', createdAt: n },
  ];
  cards.forEach(c => s.paymentCards.set(c.id, c));

  // Tasks
  const tasks: Task[] = [
    { id: ids.t1, title: "İzmir Bornova'da Market Alışverişi", description: "Bornova Metro'daki marketten alışveriş listesindeki ürünlerin alınması ve eve teslim edilmesi. Liste detayları mesajla paylaşılacak.", city: 'İzmir', district: 'Bornova', category: 'Kurye & Alışveriş', fee: 750, dueDate: '2025-01-20', status: 'assigned', latitude: 38.4622, longitude: 27.2204, requesterId: ids.hakan, assignedToId: ids.elif, assignedToName: 'Elif Kaya', createdAt: n, updatedAt: n },
    { id: ids.t2, title: "Bursa'da Kumaş Numunesi Alımı", description: "Bursa Merkez'deki kumaşçıdan belirtilen kumaş numunelerinin alınması ve kargo ile gönderilmesi. Numune detayları sağlanacak.", city: 'Bursa', district: 'Osmangazi', category: 'Kurye & Alışveriş', fee: 900, dueDate: '2025-01-22', status: 'pending', latitude: 40.1885, longitude: 29.061, requesterId: ids.hakan, assignedToId: null, assignedToName: null, createdAt: n, updatedAt: n },
    { id: ids.t3, title: "Antalya Muratpaşa Adliye Evrak Teslimi", description: "Muratpaşa Adliyesi'ne dilekçe ve ek evrakların teslim edilmesi. Evraklar hazır, sadece teslimat yapılacak.", city: 'Antalya', district: 'Muratpaşa', category: 'Resmi İşler & Evrak', fee: 1500, dueDate: '2025-01-15', status: 'completed', latitude: 36.8841, longitude: 30.7056, requesterId: ids.admin, assignedToId: ids.mehmet, assignedToName: 'Mehmet Yılmaz', createdAt: n, updatedAt: n },
    { id: ids.t4, title: "Trabzon Maçka Araç Durum Ekspertizi", description: "Maçka ilçesindeki araçın dış görünüm, motor ve kilometresinin kontrolü. Fotoğraflı rapor isteniyor. Detaylı kontrol listesi verilecek.", city: 'Trabzon', district: 'Maçka', category: 'Saha Analizi & Kontrol', fee: 2100, dueDate: '2025-01-14', status: 'completed', latitude: 40.9897, longitude: 40.2566, requesterId: ids.hakan, assignedToId: ids.ayse, assignedToName: 'Ayşe Demir', createdAt: n, updatedAt: n },
    { id: ids.t5, title: "İzmir Konak Kira Sözleşmesi Onayı", description: "Konak'taki dairenin kira sözleşmesinin noter onayına götürülmesi ve geri getirilmesi. Sözleşme hazır durumda.", city: 'İzmir', district: 'Konak', category: 'Resmi İşler & Evrak', fee: 1250, dueDate: '2025-01-25', status: 'in_progress', latitude: 38.4192, longitude: 27.1287, requesterId: ids.hakan, assignedToId: ids.ahmet, assignedToName: 'Ahmet Çelik', createdAt: n, updatedAt: n },
    { id: ids.t6, title: "Ankara Çankaya Ev Temizliği", description: "Çankaya'daki 3+1 dairenin genel temizliği. Mutfak, banyo ve odalar dahil. Temizlik malzemeleri evde mevcut.", city: 'Ankara', district: 'Çankaya', category: 'Ev & Bakım Hizmetleri', fee: 1100, dueDate: '2025-01-28', status: 'pending', latitude: 39.9208, longitude: 32.8541, requesterId: ids.hakan, assignedToId: null, assignedToName: null, createdAt: n, updatedAt: n },
  ];
  tasks.forEach(t => s.tasks.set(t.id, t));

  // Bids
  const bids: Bid[] = [
    { id: uid(), taskId: ids.t2, taskerId: ids.elif, taskerName: 'Elif Kaya', taskerRating: 4.9, amount: 800, proposalText: "Bursa'ya yakınım, hemen gidip alabilirim. Aynı gün teslimat yaparım.", status: 'pending', createdAt: n },
    { id: uid(), taskId: ids.t2, taskerId: ids.mehmet, taskerName: 'Mehmet Yılmaz', taskerRating: 4.7, amount: 850, proposalText: "Daha önce benzer işler yaptım. Kumaş numunesi alma konusunda deneyimliyim.", status: 'pending', createdAt: n },
    { id: uid(), taskId: ids.t2, taskerId: ids.ayse, taskerName: 'Ayşe Demir', taskerRating: 5.0, amount: 750, proposalText: "Bursa'da yaşıyorum, kumaşçılara çok hakimim. Numuneleri dikkatle seçerim.", status: 'pending', createdAt: n },
    { id: uid(), taskId: ids.t6, taskerId: ids.mehmet, taskerName: 'Mehmet Yılmaz', taskerRating: 4.7, amount: 1000, proposalText: "Ankara'dayım, Çankaya'ya çok yakınım. Profesyonel temizlik malzemeleriyle çalışıyorum.", status: 'pending', createdAt: n },
    { id: uid(), taskId: ids.t6, taskerId: ids.ahmet, taskerName: 'Ahmet Çelik', taskerRating: 4.6, amount: 950, proposalText: "Ev temizliği konusunda 3 yıllık deneyimim var. Detaylı ve özenli çalışıyorum.", status: 'pending', createdAt: n },
  ];
  bids.forEach(b => s.bids.set(b.id, b));

  // Transactions
  const txns: Transaction[] = [
    { id: uid(), userId: ids.hakan, taskId: ids.t1, taskTitle: tasks[0].title, amount: 750, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
    { id: uid(), userId: ids.hakan, taskId: ids.t5, taskTitle: tasks[4].title, amount: 1250, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
    { id: uid(), userId: ids.admin, taskId: ids.t3, taskTitle: tasks[2].title, amount: 1500, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
    { id: uid(), userId: ids.mehmet, taskId: ids.t3, taskTitle: tasks[2].title, amount: 1500, platformFee: 150, type: 'escrow_release', status: 'completed', createdAt: n },
    { id: uid(), userId: ids.hakan, taskId: ids.t4, taskTitle: tasks[3].title, amount: 2100, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
    { id: uid(), userId: ids.ayse, taskId: ids.t4, taskTitle: tasks[3].title, amount: 2100, platformFee: 210, type: 'escrow_release', status: 'completed', createdAt: n },
  ];
  txns.forEach(t => s.transactions.set(t.id, t));

  // Notifications
  const notifs: Notification[] = [
    { id: uid(), userId: ids.elif, title: 'Görev Atandı', message: '"İzmir Bornova\'da Market Alışverişi" görevi size atandı. Lütfen görev detaylarını kontrol edin.', type: 'success', read: false, createdAt: n },
    { id: uid(), userId: ids.hakan, title: 'Yeni Teklif', message: '"Bursa\'da Kumaş Numunesi Alımı" görevinize 3 yeni teklif geldi.', type: 'info', read: false, createdAt: n },
    { id: uid(), userId: ids.mehmet, title: 'Görev Tamamlandı', message: '"Antalya Muratpaşa Adliye Evrak Teslimi" göreviniz tamamlandı ve ödemeniz hesabınıza yatırıldı.', type: 'success', read: false, createdAt: n },
    { id: uid(), userId: ids.ayse, title: 'Görev Tamamlandı', message: '"Trabzon Maçka Araç Durum Ekspertizi" göreviniz başarıyla tamamlandı. Ödemeniz hesabınıza yatırıldı.', type: 'success', read: false, createdAt: n },
    { id: uid(), userId: ids.ahmet, title: 'Görev Devam Ediyor', message: '"İzmir Konak Kira Sözleşmesi Onayı" görevi devam ediyor. Lütfen süreyi takip edin.', type: 'info', read: false, createdAt: n },
    { id: uid(), userId: ids.hakan, title: 'Yeni Teklif', message: '"Ankara Çankaya Ev Temizliği" görevinize 2 yeni teklif geldi.', type: 'info', read: false, createdAt: n },
  ];
  notifs.forEach(nt => s.notifications.set(nt.id, nt));

  // Messages
  const msgs: Message[] = [
    { id: uid(), taskId: ids.t1, senderId: ids.hakan, senderName: 'Hakan Varlık', content: 'Merhaba Elif Hanım, alışveriş listesini size mesajla göndereceğim. Bornova Meydan\'daki Migros\'tan alınacak.', receiverId: ids.elif, createdAt: n },
    { id: uid(), taskId: ids.t1, senderId: ids.elif, senderName: 'Elif Kaya', content: 'Tabii Hakan Bey, listeyi bekliyorum. En geç 2 saat içinde tamamlayabilirim.', receiverId: ids.hakan, createdAt: n },
    { id: uid(), taskId: ids.t3, senderId: ids.admin, senderName: 'Sistem Yöneticisi', content: 'Mehmet Bey, evraklar hazır. Adliye ne zaman açılıyor, saat 9:00\'da orada olabilir misiniz?', receiverId: ids.mehmet, createdAt: n },
    { id: uid(), taskId: ids.t3, senderId: ids.mehmet, senderName: 'Mehmet Yılmaz', content: 'Saat 9:00\'da kapıda olurum. Evrakları teslim aldıktan sonra size bilgi vereceğim.', receiverId: ids.admin, createdAt: n },
    { id: uid(), taskId: ids.t3, senderId: ids.mehmet, senderName: 'Mehmet Yılmaz', content: 'Evraklar başarıyla teslim edildi. İlgili memur onayladı. İşlem tamamlandı.', receiverId: ids.admin, createdAt: n },
    { id: uid(), taskId: ids.t4, senderId: ids.hakan, senderName: 'Hakan Varlık', content: 'Ayşe Hanım, araç plakası 34 ABC 123. Maçka merkezde, Atatürk Caddesi üzerindeki galeride.', receiverId: ids.ayse, createdAt: n },
    { id: uid(), taskId: ids.t5, senderId: ids.ahmet, senderName: 'Ahmet Çelik', content: 'Hakan Bey, sözleşmeyi aldım. Konak\'taki notere gidiyorum. Yaklaşık 1 saat içinde işlemin biter.', receiverId: ids.hakan, createdAt: n },
    { id: uid(), taskId: ids.t6, senderId: ids.mehmet, senderName: 'Mehmet Yılmaz', content: 'Çankaya\'daki evi temizlemek için hazırım. Hangi gün ve saat uygun olur?', receiverId: ids.hakan, createdAt: n },
  ];
  msgs.forEach(m => s.messages.set(m.id, m));

  // Platform Settings
  const settings: PlatformSetting[] = [
    { id: uid(), key: 'commission_rate', value: '10', label: 'Komisyon Oranı (%)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
    { id: uid(), key: 'commission_mode', value: 'percentage', label: 'Komisyon Modu', type: 'string', group: 'commission', createdAt: n, updatedAt: n },
    { id: uid(), key: 'min_commission', value: '10', label: 'Minimum Komisyon (₺)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
    { id: uid(), key: 'max_commission', value: '500', label: 'Maksimum Komisyon (₺)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
    { id: uid(), key: 'commission_payer', value: 'tasker', label: 'Komisyon Ödeyen', type: 'string', group: 'commission', createdAt: n, updatedAt: n },
    { id: uid(), key: 'listing_fee', value: '0', label: 'Görev Yayınlama Ücreti (₺)', type: 'number', group: 'listing', createdAt: n, updatedAt: n },
    { id: uid(), key: 'listing_fee_enabled', value: 'false', label: 'Yayınlama Ücreti Aktif', type: 'boolean', group: 'listing', createdAt: n, updatedAt: n },
    { id: uid(), key: 'withdraw_fee_rate', value: '1', label: 'Çekim Komisyonu (%)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
    { id: uid(), key: 'min_withdraw_fee', value: '5', label: 'Minimum Çekim Ücreti (₺)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
    { id: uid(), key: 'max_withdraw_fee', value: '100', label: 'Maksimum Çekim Ücreti (₺)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
    { id: uid(), key: 'withdraw_fee_enabled', value: 'true', label: 'Çekim Ücreti Aktif', type: 'boolean', group: 'withdraw', createdAt: n, updatedAt: n },
    { id: uid(), key: 'platform_name', value: 'Benim İçin Yap', label: 'Platform Adı', type: 'string', group: 'general', createdAt: n, updatedAt: n },
    { id: uid(), key: 'platform_earning_visible', value: 'true', label: 'Platform Geliri Görünür', type: 'boolean', group: 'general', createdAt: n, updatedAt: n },
    { id: uid(), key: 'map_default_bounds', value: '[[35.5, 25.5], [42.5, 45.0]]', label: 'Harita Varsayılan Sınırları', type: 'string', group: 'general', createdAt: n, updatedAt: n },
  ];
  settings.forEach(st => s.platformSettings.set(st.id, st));

  // System Logs
  const logs: SystemLog[] = [
    { id: uid(), level: 'info', message: 'Veritabanı demo verileri ile başarıyla dolduruldu.', createdAt: n },
    { id: uid(), level: 'info', message: '6 kullanıcı, 6 görev, 5 teklif, 6 işlem, 6 bildirim ve 8 mesaj oluşturuldu.', createdAt: n },
  ];
  logs.forEach(l => s.systemLogs.set(l.id, l));

  // Reviews (for completed tasks)
  const reviews: Review[] = [
    { id: uid(), taskId: ids.t3, taskTitle: tasks[2].title, fromUserId: ids.admin, fromUserName: 'Sistem Yöneticisi', toUserId: ids.mehmet, toUserName: 'Mehmet Yılmaz', rating: 5, comment: 'Evrakları zamanında ve eksiksiz teslim etti. Çok profesyonel.', fromRole: 'requester', createdAt: n },
    { id: uid(), taskId: ids.t3, taskTitle: tasks[2].title, fromUserId: ids.mehmet, fromUserName: 'Mehmet Yılmaz', toUserId: ids.admin, toUserName: 'Sistem Yöneticisi', rating: 4, comment: 'Görev talimatları netti, kolay çalıştık.', fromRole: 'tasker', createdAt: n },
    { id: uid(), taskId: ids.t4, taskTitle: tasks[3].title, fromUserId: ids.hakan, fromUserName: 'Hakan Varlık', toUserId: ids.ayse, toUserName: 'Ayşe Demir', rating: 5, comment: 'Aracı çok detaylı inceledi, fotoğraflı rapor mükemmeldi. Kesinlikle tavsiye ederim.', fromRole: 'requester', createdAt: n },
    { id: uid(), taskId: ids.t4, taskTitle: tasks[3].title, fromUserId: ids.ayse, fromUserName: 'Ayşe Demir', toUserId: ids.hakan, toUserName: 'Hakan Varlık', rating: 5, comment: 'Araç bilgilerini detaylı paylaştı, iletişimi çok iyi.', fromRole: 'tasker', createdAt: n },
  ];
  reviews.forEach(r => s.reviews.set(r.id, r));

  s.seeded = true;
}

// Auto-init on import
initStore();

export { getStore, uid, now };