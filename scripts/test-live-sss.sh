#!/bin/bash
# Canlı site dogrulamasi: SSS bolumu + iletisim formu graceful davranisi
cd /home/z/my-project
BASE="https://benimicinyap-two.vercel.app"

echo "=========== Canli API: iletisim formu (SMTP env yok -> graceful) ==========="
RC=$(curl -s --max-time 20 -X POST $BASE/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Canli Test","email":"canli@test.com","subject":"Canlilik kontrolu","message":"Canli sitede iletisim formu dogrulama mesaji."}')
echo "contact: $RC"
echo "$RC" | grep -q '"success":true' && echo "[OK] canli form calisiyor" || echo "[HATA] canli form basarisiz"

echo "=========== Canli UI: SSS bolumu ==========="
B="agent-browser"
$B open "$BASE/" --timeout 90000 >/dev/null 2>&1
$B wait 6000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakanvarlik24.HV@gmail.com') + '|' + setVal('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 7000 >/dev/null 2>&1

TAB=$($B eval "(() => { const els=[...document.querySelectorAll('button,[role=tab],a')].filter(e=>e.offsetParent!==null && e.textContent.trim()==='Hakkında'); if(!els.length) return ''; const r=els[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "hakkinda tab koordinat: $TAB"
if [ -n "$TAB" ]; then
  $B mouse move "${TAB%%,*}" "${TAB#*,}"; $B mouse down; $B mouse up
  $B wait 6000 >/dev/null 2>&1
fi

$B eval "(() => { const t=document.body.textContent; return 'CANLI_SSS:' + (t.includes('Sıkça Sorulan Sorular')?'VAR':'YOK') + '|KOMISYON_SORUSU:' + (t.includes('Platform komisyonu ne kadar?')?'VAR':'YOK') + '|EPOSTA_SORUSU:' + (t.includes('Yeni mesaj geldiğinde haberim olur mu?')?'VAR':'YOK') + '|ILETISIM:' + (t.includes('Bize Ulaşın')?'VAR':'YOK'); })()" 2>/dev/null

$B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görev teslimi nasıl')); if(!trg.length) return 'YOK'; trg[0].scrollIntoView({block:'center'}); return 'KAYDIRILDI'; })()" 2>/dev/null
$B wait 1000 >/dev/null 2>&1
TRG=$($B eval "(() => { const trg=[...document.querySelectorAll('button')].filter(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görev teslimi nasıl')); if(!trg.length) return ''; const r=trg[0].getBoundingClientRect(); return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2); })()" 2>/dev/null | tr -dc '0-9,')
echo "ai-tarama sorusu koordinat: $TRG"
if [ -n "$TRG" ]; then
  $B mouse move "${TRG%%,*}" "${TRG#*,}"; $B mouse down; $B mouse up
  $B wait 1500 >/dev/null 2>&1
  $B eval "(() => { const trg=[...document.querySelectorAll('button')].find(b=>b.hasAttribute('aria-expanded') && b.textContent.includes('Görev teslimi nasıl')); const cevap=document.body.textContent.includes('EXIF kamera verisi'); return 'CANLI_ACIK:' + (trg?.getAttribute('aria-expanded')) + '|CEVAP:' + (cevap?'VAR':'YOK'); })()" 2>/dev/null
  $B screenshot /home/z/my-project/download/live-sss-acik.png 2>&1 | tail -1
fi
$B screenshot /home/z/my-project/download/live-sss.png 2>&1 | tail -1
$B close >/dev/null 2>&1
echo "=== CANLI TEST BITTI ==="
