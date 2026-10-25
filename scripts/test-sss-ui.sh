#!/bin/bash
# SSS accordion UI testi + SMTP yapılandırmasiz graceful-skip dogrulamasi (tek çağrı)
cd /home/z/my-project

pkill -f 'next dev' 2>/dev/null; pkill -f next-server 2>/dev/null
pkill -f smtp-sink.py 2>/dev/null
sleep 1

# 1) SMTP env OLMADAN sunucu (graceful-skip testi)
setsid nohup bun run start > prod.log 2>&1 &
CODE=""
for i in $(seq 1 20); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "[OK] sunucu hazir (SMTP env yok)"; break; fi
done
if [ "$CODE" != "200" ]; then echo "[HATA] sunucu kalkmadi"; tail -8 prod.log; exit 1; fi

echo "=========== TEST C: SMTP yokken iletisim formu zarar gormemeli ==========="
RC=$(curl -s --max-time 15 -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Grace Test","email":"grace@test.com","subject":"SMTP yok testi","message":"SMTP yapilandirmasi yokken mesaj yine de basariyla kaydedilmeli."}')
echo "contact (smtp yok): $RC"
echo "$RC" | grep -q '"success":true' && echo "[OK] form calisiyor (emailNotified beklenen: false)" || echo "[HATA] form basarisiz"

echo "=========== UI: SSS accordion (scrollIntoView ile) ==========="
B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakanvarlik24.HV@gmail.com') + '|' + setVal('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1

TAB=$($B eval "(() => { const els=[...document.querySelectorAll('button,[role=tab],a')].filter(e=>e.offsetParent!==null && e.textContent.trim()==='Hakkında'); if(!els.length) return ''; const r=els[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "hakkinda tab koordinat: $TAB"
if [ -n "$TAB" ]; then
  $B mouse move "${TAB%%,*}" "${TAB#*,}"; $B mouse down; $B mouse up
  $B wait 4000 >/dev/null 2>&1
fi

# SSS sayacını ve soru sayısını doğrula
$B eval "(() => { const t=document.body.textContent; const n=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.closest('div') && document.body.textContent.includes('Sıkça Sorulan Sorular')).length; return 'SSS:' + (t.includes('Sıkça Sorulan Sorular')?'VAR':'YOK') + '|SORU_YAKIN:' + n + '|KOMISYON:' + (t.includes('Platform komisyonu ne kadar?')?'VAR':'YOK'); })()" 2>/dev/null

# İlk soruyu görünüme kaydır, sonra tıkla
$B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); if(!trg.length) return 'YOK'; trg[0].scrollIntoView({block:'center'}); return 'KAYDIRILDI'; })()" 2>/dev/null
$B wait 1000 >/dev/null 2>&1
TRG=$($B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); if(!trg.length) return ''; const r=trg[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "ilk soru koordinat: $TRG"
if [ -n "$TRG" ]; then
  $B mouse move "${TRG%%,*}" "${TRG#*,}"; $B mouse down; $B mouse up
  $B wait 1200 >/dev/null 2>&1
  $B eval "(() => { const trg=[...document.querySelectorAll('button')].find(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); const cevap=document.body.textContent.includes('tamamen cüzdanınıza iade edilir'); return 'ACIK:' + (trg?.getAttribute('aria-expanded')) + '|CEVAP_GORUNUR:' + (cevap?'EVET':'HAYIR'); })()" 2>/dev/null
  $B screenshot /home/z/my-project/download/sss-accordion-acik.png 2>&1 | tail -1
fi

# İkinci soruyu da aç ve ilkini kapat (single collapsible davranışı)
$B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görevlilere güvenebilir')); if(!trg.length) return 'YOK'; trg[0].scrollIntoView({block:'center'}); return 'KAYDIRILDI'; })()" 2>/dev/null
$B wait 800 >/dev/null 2>&1
TRG2=$($B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görevlilere güvenebilir')); if(!trg.length) return ''; const r=trg[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
if [ -n "$TRG2" ]; then
  $B mouse move "${TRG2%%,*}" "${TRG2#*,}"; $B mouse down; $B mouse up
  $B wait 1200 >/dev/null 2>&1
  $B eval "(() => { const bir=[...document.querySelectorAll('button')].find(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Ödemem nasıl')); const iki=[...document.querySelectorAll('button')].find(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görevlilere güvenebilir')); return 'SORU1:' + (bir?.getAttribute('aria-expanded')) + '|SORU3:' + (iki?.getAttribute('aria-expanded')) + '|TEK_ACIK_BEKLENTI: soru1=false,soru3=true'; })()" 2>/dev/null
fi
$B screenshot /home/z/my-project/download/sss-bolumu.png 2>&1 | tail -1
$B close >/dev/null 2>&1
echo "=== TEST BITTI ==="
