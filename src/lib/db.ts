import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

function hashSeedPassword(password: string): string {
  const salt = crypto.createHash('sha256').update(`seed:${password}`).digest('hex').slice(0, 32);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

export function omitPassword(user: any) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

export async function clearStore() {
  try {
    await db.review.deleteMany({});
    await db.systemLog.deleteMany({});
    await db.message.deleteMany({});
    await db.notification.deleteMany({});
    await db.transaction.deleteMany({});
    await db.bid.deleteMany({});
    await db.task.deleteMany({});
    await db.paymentCard.deleteMany({});
    await db.platformSetting.deleteMany({});
    await db.user.deleteMany({});
  } catch (error) {
    console.error("clearStore error:", error);
  }
}

export async function initStore() {
  try {
    const userCount = await db.user.count();
    if (userCount > 0) return;

    const n = new Date();

    await db.user.create({
      data: {
        id: 'user-admin',
        email: 'hakan_varlik24@hotmail.com',
        password: hashSeedPassword('Hakan_1251'),
        fullName: 'Sistem Yöneticisi',
        city: 'Antalya',
        role: 'admin',
        walletBalance: 50000,
        escrowBalance: 0,
        rating: 5.0,
        isOnline: true,
      }
    });

    await db.user.create({
      data: {
        id: 'user-hakan',
        email: 'hakanvarlik24.HV@gmail.com',
        password: hashSeedPassword('user123'),
        fullName: 'Hakan Varlık',
        city: 'Antalya',
        role: 'user',
        walletBalance: 8500,
        escrowBalance: 2000,
        rating: 4.8,
        totalReviews: 12,
        completedTasksCount: 12,
        isOnline: true,
      }
    });

    await db.user.create({
      data: {
        id: 'user-elif',
        email: 'elif@gmail.com',
        password: hashSeedPassword('user123'),
        fullName: 'Elif Kaya',
        city: 'İzmir',
        role: 'user',
        walletBalance: 6200,
        escrowBalance: 0,
        rating: 4.9,
        totalReviews: 8,
        completedTasksCount: 8,
        isOnline: true,
      }
    });

    await db.user.create({
      data: {
        id: 'user-mehmet',
        email: 'mehmet@gmail.com',
        password: hashSeedPassword('user123'),
        fullName: 'Mehmet Yılmaz',
        city: 'Ankara',
        role: 'user',
        walletBalance: 4500,
        escrowBalance: 0,
        rating: 4.7,
        totalReviews: 15,
        completedTasksCount: 15,
        isOnline: true,
      }
    });

    await db.user.create({
      data: {
        id: 'user-ayse',
        email: 'ayse@gmail.com',
        password: hashSeedPassword('user123'),
        fullName: 'Ayşe Demir',
        city: 'Bursa',
        role: 'user',
        walletBalance: 7800,
        escrowBalance: 0,
        rating: 5.0,
        totalReviews: 5,
        completedTasksCount: 5,
        isOnline: true,
      }
    });

    await db.user.create({
      data: {
        id: 'user-ahmet',
        email: 'ahmet@gmail.com',
        password: hashSeedPassword('user123'),
        fullName: 'Ahmet Çelik',
        city: 'Istanbul',
        role: 'user',
        walletBalance: 3200,
        escrowBalance: 0,
        rating: 4.6,
        totalReviews: 9,
        completedTasksCount: 9,
        isOnline: true,
      }
    });

    await db.paymentCard.createMany({
      data: [
        { id: 'card-1', userId: 'user-admin', bankName: 'Yapı Kredi', cardNumber: '****5512', cardHolder: 'Sistem Yöneticisi', createdAt: n },
        { id: 'card-2', userId: 'user-admin', bankName: 'Garanti BBVA', cardNumber: '****8834', cardHolder: 'Sistem Yöneticisi', createdAt: n },
      ]
    });

    await db.task.createMany({
      data: [
        { id: 'task-t1', title: "İzmir Bornova'da Market Alışverişi", description: "Bornova Metro'daki marketten alışveriş listesindeki ürünlerin alınması ve eve teslim edilmesi. Liste detayları mesajla paylaşılacak.", city: 'İzmir', district: 'Bornova', category: 'Kurye & Alışveriş', fee: 750, dueDate: '2025-01-20', status: 'assigned', latitude: 38.4622, longitude: 27.2204, requesterId: 'user-hakan', assignedToId: 'user-elif', assignedToName: 'Elif Kaya', createdAt: n, updatedAt: n },
        { id: 'task-t2', title: "Bursa'da Kumaş Numunesi Alımı", description: "Bursa Merkez'deki kumaşçıdan belirtilen kumaş numunelerinin alınması ve kargo ile gönderilmesi. Numune detayları sağlanacak.", city: 'Bursa', district: 'Osmangazi', category: 'Kurye & Alışveriş', fee: 900, dueDate: '2025-01-22', status: 'pending', latitude: 40.1885, longitude: 29.061, requesterId: 'user-hakan', createdAt: n, updatedAt: n },
        { id: 'task-t3', title: "Antalya Muratpaşa Adliye Evrak Teslimi", description: "Muratpaşa Adliyesi'ne dilekçe ve ek evrakların teslim edilmesi. Evraklar hazır, sadece teslimat yapılacak.", city: 'Antalya', district: 'Muratpaşa', category: 'Resmi İşler & Evrak', fee: 1500, dueDate: '2025-01-15', status: 'completed', latitude: 36.8841, longitude: 30.7056, requesterId: 'user-admin', assignedToId: 'user-mehmet', assignedToName: 'Mehmet Yılmaz', createdAt: n, updatedAt: n },
        { id: 'task-t4', title: "Trabzon Maçka Araç Durum Ekspertizi", description: "Maçka ilçesindeki araçın dış görünüm, motor ve kilometresinin kontrolü. Fotoğraflı rapor isteniyor. Detaylı kontrol listesi verilecek.", city: 'Trabzon', district: 'Maçka', category: 'Saha Analizi & Kontrol', fee: 2100, dueDate: '2025-01-14', status: 'completed', latitude: 40.9897, longitude: 40.2566, requesterId: 'user-hakan', assignedToId: 'user-ayse', assignedToName: 'Ayşe Demir', createdAt: n, updatedAt: n },
        { id: 'task-t5', title: "İzmir Konak Kira Sözleşmesi Onayı", description: "Konak'taki dairenin kira sözleşmesinin noter onayına götürülmesi ve geri getirilmesi. Sözleşme hazır durumda.", city: 'İzmir', district: 'Konak', category: 'Resmi İşler & Evrak', fee: 1250, dueDate: '2025-01-25', status: 'in_progress', latitude: 38.4192, longitude: 27.1287, requesterId: 'user-hakan', assignedToId: 'user-ahmet', assignedToName: 'Ahmet Çelik', createdAt: n, updatedAt: n },
        { id: 'task-t6', title: "Ankara Çankaya Ev Temizliği", description: "Çankaya'daki 3+1 dairenin genel temizliği. Mutfak, banyo ve odalar dahil. Temizlik malzemeleri evde mevcut.", city: 'Ankara', district: 'Çankaya', category: 'Ev & Bakım Hizmetleri', fee: 1100, dueDate: '2025-01-28', status: 'pending', latitude: 39.9208, longitude: 32.8541, requesterId: 'user-hakan', createdAt: n, updatedAt: n },
      ]
    });

    await db.bid.createMany({
      data: [
        { id: 'bid-1', taskId: 'task-t2', taskerId: 'user-elif', taskerName: 'Elif Kaya', taskerRating: 4.9, amount: 800, proposalText: "Bursa'ya yakınım, hemen gidip alabilirim. Aynı gün teslimat yaparım.", status: 'pending', createdAt: n },
        { id: 'bid-2', taskId: 'task-t2', taskerId: 'user-mehmet', taskerName: 'Mehmet Yılmaz', taskerRating: 4.7, amount: 850, proposalText: "Daha önce benzer işler yaptım. Kumaş numunesi alma konusunda deneyimliyim.", status: 'pending', createdAt: n },
        { id: 'bid-3', taskId: 'task-t2', taskerId: 'user-ayse', taskerName: 'Ayşe Demir', taskerRating: 5.0, amount: 750, proposalText: "Bursa'da yaşıyorum, kumaşçılara çok hakimim. Numuneleri dikkatle seçerim.", status: 'pending', createdAt: n },
        { id: 'bid-4', taskId: 'task-t6', taskerId: 'user-mehmet', taskerName: 'Mehmet Yılmaz', taskerRating: 4.7, amount: 1000, proposalText: "Ankara'dayım, Çankaya'ya çok yakınım. Profesyonel temizlik malzemeleriyle çalışıyorum.", status: 'pending', createdAt: n },
        { id: 'bid-5', taskId: 'task-t6', taskerId: 'user-ahmet', taskerName: 'Ahmet Çelik', taskerRating: 4.6, amount: 950, proposalText: "Ev temizliği konusunda 3 yıllık deneyimim var. Detaylı ve özenli çalışıyorum.", status: 'pending', createdAt: n },
      ]
    });

    await db.transaction.createMany({
      data: [
        { id: 'txn-1', userId: 'user-hakan', taskId: 'task-t1', taskTitle: "İzmir Bornova'da Market Alışverişi", amount: 750, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
        { id: 'txn-2', userId: 'user-hakan', taskId: 'task-t5', taskTitle: "İzmir Konak Kira Sözleşmesi Onayı", amount: 1250, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
        { id: 'txn-3', userId: 'user-admin', taskId: 'task-t3', taskTitle: "Antalya Muratpaşa Adliye Evrak Teslimi", amount: 1500, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
        { id: 'txn-4', userId: 'user-mehmet', taskId: 'task-t3', taskTitle: "Antalya Muratpaşa Adliye Evrak Teslimi", amount: 1500, platformFee: 150, type: 'escrow_release', status: 'completed', createdAt: n },
        { id: 'txn-5', userId: 'user-hakan', taskId: 'task-t4', taskTitle: "Trabzon Maçka Araç Durum Ekspertizi", amount: 2100, platformFee: 0, type: 'escrow_block', status: 'completed', createdAt: n },
        { id: 'txn-6', userId: 'user-ayse', taskId: 'task-t4', taskTitle: "Trabzon Maçka Araç Durum Ekspertizi", amount: 2100, platformFee: 210, type: 'escrow_release', status: 'completed', createdAt: n },
      ]
    });

    await db.notification.createMany({
      data: [
        { id: 'notif-1', userId: 'user-elif', title: 'Görev Atandı', message: '"İzmir Bornova\'da Market Alışverişi" görevi size atandı. Lütfen görev detaylarını kontrol edin.', type: 'success', read: false, createdAt: n },
        { id: 'notif-2', userId: 'user-hakan', title: 'Yeni Teklif', message: '"Bursa\'da Kumaş Numunesi Alımı" görevinize 3 yeni teklif geldi.', type: 'info', read: false, createdAt: n },
        { id: 'notif-3', userId: 'user-mehmet', title: 'Görev Tamamlandı', message: '"Antalya Muratpaşa Adliye Evrak Teslimi" göreviniz tamamlandı ve ödemeniz hesabınıza yatırıldı.', type: 'success', read: false, createdAt: n },
        { id: 'notif-4', userId: 'user-ayse', title: 'Görev Tamamlandı', message: '"Trabzon Maçka Araç Durum Ekspertizi" göreviniz başarıyla tamamlandı. Ödemeniz hesabınıza yatırıldı.', type: 'success', read: false, createdAt: n },
        { id: 'notif-5', userId: 'user-ahmet', title: 'Görev Devam Ediyor', message: '"İzmir Konak Kira Sözleşmesi Onayı" görevi devam ediyor. Lütfen süreyi takip edin.', type: 'info', read: false, createdAt: n },
        { id: 'notif-6', userId: 'user-hakan', title: 'Yeni Teklif', message: '"Ankara Çankaya Ev Temizliği" görevinize 2 yeni teklif geldi.', type: 'info', read: false, createdAt: n },
      ]
    });

    await db.message.createMany({
      data: [
        { id: 'msg-1', taskId: 'task-t1', senderId: 'user-hakan', senderName: 'Hakan Varlık', content: 'Merhaba Elif Hanım, alışveriş listesini size mesajla göndereceğim. Bornova Meydan\'daki Migros\'tan alınacak.', receiverId: 'user-elif', createdAt: n },
        { id: 'msg-2', taskId: 'task-t1', senderId: 'user-elif', senderName: 'Elif Kaya', content: 'Tabii Hakan Bey, listeyi bekliyorum. En geç 2 saat içinde tamamlayabilirim.', receiverId: 'user-hakan', createdAt: n },
        { id: 'msg-3', taskId: 'task-t3', senderId: 'user-admin', senderName: 'Sistem Yöneticisi', content: 'Mehmet Bey, evraklar hazır. Adliye ne zaman açılıyor, saat 9:00\'da orada olabilir misiniz?', receiverId: 'user-mehmet', createdAt: n },
        { id: 'msg-4', taskId: 'task-t3', senderId: 'user-mehmet', senderName: 'Mehmet Yılmaz', content: 'Saat 9:00\'da kapıda olurum. Evrakları teslim aldıktan sonra size bilgi vereceğim.', receiverId: 'user-admin', createdAt: n },
        { id: 'msg-5', taskId: 'task-t3', senderId: 'user-mehmet', senderName: 'Mehmet Yılmaz', content: 'Evraklar başarıyla teslim edildi. İlgili memur onayladı. İşlem tamamlandı.', receiverId: 'user-admin', createdAt: n },
        { id: 'msg-6', taskId: 'task-t4', senderId: 'user-hakan', senderName: 'Hakan Varlık', content: 'Ayşe Hanım, araç plakası 34 ABC 123. Maçka merkezde, Atatürk Caddesi üzerindeki galeride.', receiverId: 'user-ayse', createdAt: n },
      ]
    });

    await db.platformSetting.createMany({
      data: [
        { id: 'set-1', key: 'commission_rate', value: '10', label: 'Komisyon Oranı (%)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
        { id: 'set-2', key: 'commission_mode', value: 'percentage', label: 'Komisyon Modu', type: 'string', group: 'commission', createdAt: n, updatedAt: n },
        { id: 'set-3', key: 'min_commission', value: '10', label: 'Minimum Komisyon (₺)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
        { id: 'set-4', key: 'max_commission', value: '500', label: 'Maksimum Komisyon (₺)', type: 'number', group: 'commission', createdAt: n, updatedAt: n },
        { id: 'set-5', key: 'commission_payer', value: 'tasker', label: 'Komisyon Ödeyen', type: 'string', group: 'commission', createdAt: n, updatedAt: n },
        { id: 'set-6', key: 'listing_fee', value: '0', label: 'Görev Yayınlama Ücreti (₺)', type: 'number', group: 'listing', createdAt: n, updatedAt: n },
        { id: 'set-7', key: 'listing_fee_enabled', value: 'false', label: 'Yayınlama Ücreti Aktif', type: 'boolean', group: 'listing', createdAt: n, updatedAt: n },
        { id: 'set-8', key: 'withdraw_fee_rate', value: '1', label: 'Çekim Komisyonu (%)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
        { id: 'set-9', key: 'min_withdraw_fee', value: '5', label: 'Minimum Çekim Ücreti (₺)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
        { id: 'set-10', key: 'max_withdraw_fee', value: '100', label: 'Maksimum Çekim Ücreti (₺)', type: 'number', group: 'withdraw', createdAt: n, updatedAt: n },
        { id: 'set-11', key: 'withdraw_fee_enabled', value: 'true', label: 'Çekim Ücreti Aktif', type: 'boolean', group: 'withdraw', createdAt: n, updatedAt: n },
        { id: 'set-12', key: 'platform_name', value: 'Benim İçin Yap', label: 'Platform Adı', type: 'string', group: 'general', createdAt: n, updatedAt: n },
        { id: 'set-13', key: 'platform_earning_visible', value: 'true', label: 'Platform Geliri Görünür', type: 'boolean', group: 'general', createdAt: n, updatedAt: n },
        { id: 'set-14', key: 'map_default_bounds', value: '[[35.5, 25.5], [42.5, 45.0]]', label: 'Harita Varsayılan Sınırları', type: 'string', group: 'general', createdAt: n, updatedAt: n },
      ]
    });

    await db.systemLog.create({
      data: {
        id: 'log-1',
        level: 'info',
        message: 'Veritabanı bulut ortamı başarıyla dolduruldu.',
        createdAt: n,
      }
    });

  } catch (error) {
    console.error("initStore error:", error);
  }
}