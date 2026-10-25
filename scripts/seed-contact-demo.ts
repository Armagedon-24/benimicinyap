/**
 * İletişim mesajlarını temizle + canlı demo için 2 örnek mesaj bırak
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  await p.contactMessage.deleteMany({});
  console.log('Eski test mesajlari silindi');

  const now = new Date();
  await p.contactMessage.createMany({
    data: [
      {
        name: 'Ayşe Yılmaz',
        email: 'ayse.yilmaz@ornek.com',
        subject: 'Komisyon oranları',
        message:
          'Merhaba, platformda görevli olarak çalışmak istiyorum. Komisyon oranları nasıl belirleniyor, hesabıma kesintisiz mi yatıyor? Yardımcı olabilir misiniz? Teşekkürler!',
        read: false,
        createdAt: new Date(now.getTime() - 3600_000),
      },
      {
        name: 'Mehmet Demir',
        email: 'mehmet.demir@ornek.com',
        subject: '',
        message:
          'Escrow sistemi gerçekten çok güven veriyor, emeğinize sağlık! Harita üzerinde görevleri görmek çok kullanışlı. Mobil uygulama planınız var mı?',
        read: false,
        createdAt: new Date(now.getTime() - 7200_000),
      },
    ],
  });
  console.log('2 demo mesaj eklendi');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
