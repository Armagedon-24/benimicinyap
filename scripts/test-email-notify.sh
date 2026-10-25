#!/bin/bash
# E-posta bildirimi + SSS bölümü E2E testi — tek çağrıda: sink + sunucu + API testleri + tarayıcı testi
cd /home/z/my-project

CAPTURED=/home/z/my-project/scripts/smtp-captured.log
PY=/usr/bin/python3.13

# 0) Temizlik
pkill -f 'next dev' 2>/dev/null; pkill -f next-server 2>/dev/null
pkill -f smtp-sink.py 2>/dev/null
sleep 1
rm -f "$CAPTURED"

# 1) SMTP sink başlat
setsid nohup $PY scripts/smtp-sink.py > smtp-sink.log 2>&1 &
sleep 2
if ! grep -q "hazir" smtp-sink.log 2>/dev/null; then echo "[HATA] sink kalkmadi"; cat smtp-sink.log; exit 1; fi
echo "[OK] SMTP sink :1025"

# 2) Production sunucu + SMTP env ile başlat
setsid nohup env SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_USER=platform@benimicinyap.com \
  SMTP_PASS=testpass EMAIL_FROM=platform@benimicinyap.com NOTIFY_EMAIL=hakan_varlik24@hotmail.com \
  bun run start > prod.log 2>&1 &
CODE=""
for i in $(seq 1 20); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "[OK] sunucu hazir"; break; fi
done
if [ "$CODE" != "200" ]; then echo "[HATA] sunucu kalkmadi"; tail -8 prod.log; exit 1; fi

echo "=========== TEST A: Iletisim formu -> yonetici e-postasi ==========="
RA=$(curl -s --max-time 15 -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ayse Test","email":"ayse@test.com","subject":"E-posta bildirim testi","message":"Bu mesaj e-posta bildirim akisini dogrulamak icin gonderildi."}')
echo "contact: $RA"

echo "=========== TEST B: Gorev mesaji -> alici e-postasi ==========="
curl -s --max-time 10 -c /tmp/hakan.jar -X POST http://localhost:3000/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"email":"hakanvarlik24.HV@gmail.com","password":"user123"}' -o /dev/null
RB=$(curl -s --max-time 20 -b /tmp/hakan.jar -X POST http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"taskId":"task-t1","senderName":"Hakan Varlik","content":"Merhaba Elif, gorev detaylarini e-posta bildirim testi icin gonderdim.","receiverId":"user-elif"}')
echo "message: $(echo $RB | head -c 220)"

sleep 2
echo "=========== SMTP sink yakalanan e-postalar ==========="
if [ ! -f "$CAPTURED" ]; then echo "[HATA] e-posta yakalanmadi!"; tail -5 smtp-sink.log; exit 1; fi
echo "toplam e-posta: $(grep -c '===NEW_MAIL===' $CAPTURED)"
grep -E '^(RCPT_TO|Subject):' $CAPTURED

echo "=========== Icerik kontrolleri ==========="
grep -q "RCPT_TO: hakan_varlik24@hotmail.com" "$CAPTURED" && echo "[OK] yonetici bildirimi hedefi dogru" || echo "[HATA] yonetici bildirimi YOK"
grep -q "RCPT_TO: elif@gmail.com" "$CAPTURED" && echo "[OK] mesaj bildirimi alicisi dogru" || echo "[HATA] mesaj bildirimi YOK"
grep -q "Ayse Test" "$CAPTURED" && echo "[OK] iletisim govdesi tasiniyor" || echo "[HATA] iletisim govdesi yok"
grep -q "Hakan Varlik" "$CAPTURED" && echo "[OK] gonderen adi tasiniyor" || echo "[HATA] gonderen adi yok"
grep -q "izmir Bornova" "$CAPTURED" && echo "[OK] gorev basligi tasiniyor" || echo "[BILGI] gorev basligi kontrolu"

echo "=========== UI: SSS bolumu (browser) ==========="
B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakanvarlik24.HV@gmail.com') + '|' + setVal('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1

# Hakkında sekmesine gerçek mouse tıklaması (Radix TabsTrigger)
TAB=$($B eval "(() => { const els=[...document.querySelectorAll('button,[role=tab],a')].filter(e=>e.offsetParent!==null && e.textContent.trim()==='Hakkında'); if(!els.length) return 'TAB_YOK'; const r=els[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "hakkinda tab koordinat: $TAB"
$B mouse move "${TAB%%,*}" "${TAB#*,}"; $B mouse down; $B mouse up
$B wait 4000 >/dev/null 2>&1

$B eval "(() => { const t=document.body.textContent; return 'SSS_BASLIK:' + (t.includes('Sıkça Sorulan Sorular')?'VAR':'YOK') + '|ILETISIM:' + (t.includes('Bize Ulaşın')?'VAR':'YOK'); })()" 2>/dev/null

# İlk SSS tetikleyicisinin koordinatı
TRG=$($B eval "(() => { const triggers=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null && b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); if(!triggers.length) return 'TRG_YOK'; const r=triggers[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "ilk soru koordinat: $TRG"
if [ -n "$TRG" ]; then
  $B mouse move "${TRG%%,*}" "${TRG#*,}"; $B mouse down; $B mouse up
  $B wait 1200 >/dev/null 2>&1
  $B eval "(() => { const t=[...document.querySelectorAll('button')].find(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); const cevap=document.body.textContent.includes('tamamen cüzdanınıza iade edilir'); return 'ACIK:' + (t?.getAttribute('aria-expanded')) + '|CEVAP_GORUNUR:' + (cevap?'EVET':'HAYIR'); })()" 2>/dev/null
  $B screenshot /home/z/my-project/download/sss-accordion-acik.png 2>&1 | tail -1
fi
$B screenshot /home/z/my-project/download/sss-bolumu.png 2>&1 | tail -1
$B close >/dev/null 2>&1
echo "=== TEST BITTI ==="
