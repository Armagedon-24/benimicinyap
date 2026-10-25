# Vercel Yayın Kılavuzu — Benim İçin Yap

Bu proje Vercel'e **ek ayar gerektirmeden** deploy edilebilir durumdadır.
SQLite veritabanı ve kanıt fotoğrafı yükleme sistemi, Vercel'in serverless
ortamına (yalnızca `/tmp` yazılabilir) uyumlu hale getirilmiştir.

## 1) Kodu GitHub'a Gönder

```bash
git push origin main
```

> Not: 6 commit hazır bekliyor (Vercel hazırlığı dahil). Kendi bilgisayarınızda
> çalıştırıyorsanız önce `git pull` yerine bu push'u yapın.

## 2) Vercel'de Yayınla (Dashboard)

1. https://vercel.com/new adresine gidin (GitHub hesabıyla giriş yapın)
2. **Import Git Repository** → `Armagedon-24/benimicinyap` deposunu seçin
3. Framework otomatik **Next.js** olarak algılanır — hiçbir şeye dokunmayın
4. **Deploy** butonuna basın (~2-3 dk)
5. Bitti! `https://benimicinyap.vercel.app` (veya Vercel'in verdiği adres) yayında

Ortam değişkeni (env) girmenize gerek yoktur:
- `DATABASE_URL` → `vercel.json` içinde tanımlı; kod, soğuk başlangıçta seed
  veritabanını otomatik olarak `/tmp/benimicinyap.db` konumuna kopyalar.
- `AUTH_SECRET` → ayarlanmazsa kod yedek oturum anahtarıyla çalışır (giriş sorunsuz
  olur). Daha güvenli oturum imzası isterseniz Vercel → Settings → Environment
  Variables altına rastgele bir değer ekleyin (örn. `openssl rand -hex 32` çıktısı).

## 2') Alternatif: CLI ile Deploy

```bash
npm i -g vercel
vercel login
vercel link --project benimicinyap --yes
vercel --prod
```

## Bilinmesi Gerekenler

### Veri saklama (demo sınırları)
- Vercel serverless'ta SQLite `/tmp` içinde yaşar: veriler lambda örneği
  sıcak kaldığı sürece korunur, **yeniden deploy / soğuk başlangıçta sıfırlanır**.
- Bu bir demo yayını için tasarlandı. Kalıcı veri isteniyorsa Turso (SQLite
  uyumlu, ücretsiz katman) veya Neon/Supabase (PostgreSQL) + `prisma db push`
  ile şema taşınmalıdır.

### Kanıt fotoğrafları
- Yüklenen kanıtlar Vercel'de `/tmp/uploads/proofs` altına yazılır ve
  `/api/files/proofs/<dosya>` rotasıyla sunulur (aynı lambda örneği sıcakken geçerli).
- Lokal geliştirmede davranış değişmez: `public/uploads/proofs` + statik URL.

### AI kanıt analizi (opsiyonel)
- AI LLM analizi Vercel'de varsayılan olarak ** sezgisel (heuristic) moda düşer**
  (EXIF/C2PA/stok-URL tespiti tam çalışır, LLM değerlendirmesi devre dışı kalır).
- Tam AI analizi için Vercel → Settings → Environment Variables altına ekleyin:
  - `ZAI_CONFIG` = `{"baseUrl": "https://api.z.ai/api/paas/v4", "apiKey": "<ANAHTARINIZ>"}`

### Otomatik deploy
- Vercel, GitHub bağlantısını kurduktan sonra her `git push` için otomatik
  derleyip yayınlar (Preview + Production).

## Demo Hesaplar (seed veri)

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Yönetici | hakan_varlik24@hotmail.com | Hakan_1251 |
| Kullanıcı | elif@gmail.com | user123 |
| Kullanıcı | mehmet@gmail.com | user123 |
