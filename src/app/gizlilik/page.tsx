import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Benim İçin Yap",
  description:
    "Benim İçin Yap gizlilik politikası: topladığımız veriler, kullanım amaçları, KVKK haklarınız ve iletişim bilgileri.",
};

const CONTACT_EMAIL = "hakan_varlik24@hotmail.com";
const LAST_UPDATED = "25 Ekim 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="ml-5 list-disc">{children}</li>;
}

export default function GizlilikPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-5 py-10 sm:px-8">
      <h1 className="mb-2 text-3xl font-extrabold text-gray-900">Gizlilik Politikası</h1>
      <p className="mb-8 text-sm text-gray-500">Son güncelleme: {LAST_UPDATED}</p>

      <p className="mb-8 text-[15px] leading-relaxed text-gray-700">
        Bu politika, <strong>Benim İçin Yap</strong> (&quot;uygulama&quot;) web sitesinin ve Google
        Play üzerinden sunulan mobil uygulamasının kullanımına ilişkindir. 6698 sayılı Kişisel
        Verilerin Korunması Kanunu (KVKK) ve ilgili mevzuata uygun olarak hareket ediyoruz.
        Uygulamayı kullanarak bu politikada açıklanan veri işleme faaliyetlerini kabul etmiş
        olursunuz.
      </p>

      <Section title="1. Veri Sorumlusu">
        <p>
          Uygulamanın veri sorumlusu, uygulama sahibini temsil eden <strong>Benim İçin Yap</strong>{" "}
          işletmesidir. Tüm gizlilik talepleri için {CONTACT_EMAIL} adresine e-posta
          gönderebilirsiniz.
        </p>
      </Section>

      <Section title="2. Topladığımız Veriler">
        <ul className="space-y-2">
          <Li>
            <strong>Hesap bilgileri:</strong> Kayıt sırasında ad-soyad, e-posta adresi ve telefon
            numarası; şifreniz yalnızca tek yönlü (scrypt) karma (hash) olarak saklanır, düz metin
            olarak hiçbir zaman kaydedilmez.
          </Li>
          <Li>
            <strong>Görev ve teklif verileri:</strong> Oluşturduğunuz görevlerin başlığı,
            açıklaması, şehir/ilçe, konum koordinatları, ücret bilgisi ve verdiğiniz teklifler.
          </Li>
          <Li>
            <strong>Mesajlar:</strong> Görev kapsamında platform içi mesajlaşma üzerinden
            paylaştığınız içerikler (şifreli uçtan uca iletişim altyapısıyla).
          </Li>
          <Li>
            <strong>Cüzdan ve işlem verileri:</strong> Bakiye hareketleri, escrow (güvenli ödeme)
            bloke/onay/iade kayıtları, komisyon ve para çekme talepleri.
          </Li>
          <Li>
            <strong>Teslim kanıtları:</strong> Görev tesliminde yüklediğiniz fotoğraf, açıklama ve
            cihaz konumu bilgisi (yalnızca görev sahibi ile teslim doğrulaması amacıyla).
          </Li>
          <Li>
            <strong>Teknik kayıtlar:</strong> Hizmet kalitesi, hata ayıklama ve kötüye kullanım
            tespiti için IP adresi, oturum çerezi ve olay günlükleri.
          </Li>
        </ul>
      </Section>

      <Section title="3. Verilerin Kullanım Amaçları">
        <ul className="space-y-2">
          <Li>Hesap oluşturma, kimlik doğrulama ve oturum yönetimi,</Li>
          <Li>Görev yayınlama, teklif alma, eşleştirme ve teslim sürecinin yürütülmesi,</Li>
          <Li>Escrow ödeme güvencesi, komisyon hesaplama ve para çekme işlemleri,</Li>
          <Li>Uyuşmazlık çözümü ve müşteri desteği,</Li>
          <Li>
            Platform güvenliğinin sağlanması, suistimalin önlenmesi ve yasal yükümlülüklerin yerine
            getirilmesi.
          </Li>
        </ul>
        <p>
          Kişisel verileriniz yalnızca bu amaçlarla ve veri minimizasyonu ilkesine uygun olarak
          işlenir; rızanız dışında pazarlama amaçlı üçüncü taraflara aktarılmaz.
        </p>
      </Section>

      <Section title="4. Ödemeler">
        <p>
          Escrow ödemeleri <strong>iyzico</strong> ve <strong>PayTR</strong> gibi Türkiye&apos;de
          lisanslı ödeme kuruluşları altyapısı üzerinden alınır ve aktarılır. Kart bilgileriniz
          uygulamamızın sunucularına hiçbir şekilde ulaşmaz ve bizim tarafımızdan saklanmaz; bu
          veriler doğrudan ödeme kuruluşunun güvenli ortamında işlenir. Ödeme kuruluşlarının kendi
          gizlilik politikaları, işlem gören verilere ilişkin ayrıca uygulanır.
        </p>
      </Section>

      <Section title="5. Veri Paylaşımı ve Aktarımı">
        <ul className="space-y-2">
          <Li>
            <strong>Barındırma:</strong> Vercel Inc. (uygulama altyapısı, küresel CDN),
          </Li>
          <Li>
            <strong>Ödeme kuruluşları:</strong> iyzico / PayTR (işlem gerçekleştirme),
          </Li>
          <Li>
            <strong>Yasal merciler:</strong> Kanuni bir talep olduğunda yetkili kamu kurumları.
          </Li>
        </ul>
        <p>
          Verileriniz bu amaçlar dışında üçüncü taraflarla paylaşılmaz, satılmaz veya reklam
          amaçlı kullanılmaz.
        </p>
      </Section>

      <Section title="6. Saklama Süresi">
        <p>
          Hesap verileri, hesabınız aktif olduğu sürece; işlem ve fatura kayıtları ise vergi ve
          ticari mevzuatın gerektirdiği süre boyunca (en fazla 10 yıl) saklanır. Hesabınızı
          sildirdiğinizde, yasal saklama zorunluluğu bulunmayan veriler kalıcı olarak silinir veya
          anonim hâle getirilir.
        </p>
      </Section>

      <Section title="7. Güvenlik Önlemleri">
        <p>
          Verileriniz HTTPS/TLS ile şifrelenerek iletilir; şifreler scrypt algoritmasıyla,
          oturumlar HMAC-SHA256 ile imzalanmış httpOnly çerezler üzerinden yönetilir. Uygulama,
          rol bazlı yetkilendirme, hız sınırlama ve güvenlik olayı günlüğü gibi ek koruma
          mekanizmaları içerir. Ödeme işlemlerinde sağlayıcı tarafında 3D Secure/ödeme koruma
          katmanları kullanılır.
        </p>
      </Section>

      <Section title="8. KVKK Kapsamında Haklarınız">
        <p>Veri sorumlusuna başvurarak şunları talep edebilirsiniz:</p>
        <ul className="space-y-2">
          <Li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</Li>
          <Li>İşlenmişse buna ilişkin bilgi talep etme ve kopyasını alma,</Li>
          <Li>Yanlış işlenmiş verilerin düzeltilmesini isteme,</Li>
          <Li>Verilerinizin silinmesini veya yok edilmesini isteme,</Li>
          <Li>İşlemenin kanuna aykırılığı nedeniyle zararınızın giderilmesini talep etme.</Li>
        </ul>
        <p>
          Taleplerinizi {CONTACT_EMAIL} adresine iletebilirsiniz; en geç 30 gün içinde yanıtlanır.
        </p>
      </Section>

      <Section title="9. Çocukların Gizliliği">
        <p>
          Uygulama 18 yaşından küçükler tarafından kullanıma yönelik değildir. 18 yaş altı
          kullanıcılara ait olduğuna dair bilgi edinilirse ilgili hesap ve veriler derhal silinir.
        </p>
      </Section>

      <Section title="10. Politika Değişiklikleri">
        <p>
          Bu politika zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde ve/veya bu
          sayfada duyurulur; sayfayı düzenli olarak kontrol etmenizi öneririz.
        </p>
      </Section>

      <Section title="11. İletişim">
        <p>
          Gizlilik ile ilgili tüm soru ve talepleriniz için:{" "}
          <a className="font-semibold text-blue-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </main>
  );
}
