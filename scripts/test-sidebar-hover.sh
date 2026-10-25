#!/bin/bash
# Sidebar kart hover efekti testi v2 — tek çağrıda: sunucu başlat → test → screenshot
cd /home/z/my-project

# 1) Sunucuyu başlat (production build)
pkill -f 'next dev' 2>/dev/null; pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
for i in $(seq 1 20); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "[OK] sunucu hazır"; break; fi
done
if [ "$CODE" != "200" ]; then echo "[HATA] sunucu kalkmadı"; tail -5 prod.log; exit 1; fi

B="agent-browser"

# 2) Giriş + Keşfet
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakan_varlik24@hotmail.com') + '|' + setVal('#login-password','Hakan_1251'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('button, a, [role=tab]')].find(x => x.textContent.includes('Keşfet')); b && b.click(); return 'KESFET'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1

# 3) Kart + görev satırı koordinatları (düz metin: kx,ky|tx,ty)
COORDS=$($B eval "(() => { let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); if (!card) return 'KART_YOK'; const r = card.getBoundingClientRect(); const item = card.querySelector('div[class*=border-l-2]'); if (!item) return 'SATIR_YOK'; const ir = item.getBoundingClientRect(); return Math.round(r.x + r.width/2) + ',' + Math.round(r.y + 30) + '|' + Math.round(ir.x + ir.width/2) + ',' + Math.round(ir.y + ir.height/2); })()" 2>/dev/null | tr -dc '0-9|,')
echo "koordinatlar: $COORDS"
PART1="${COORDS%%|*}"; PART2="${COORDS#*|}"
KX="${PART1%%,*}"; KY="${PART1#*,}"
TX="${PART2%%,*}"; TY="${PART2#*,}"
echo "kart hedefi: ($KX,$KY) | görev hedefi: ($TX,$TY)"

# 4) Başlangıç durumu (hover yok)
echo "--- hover YOKken görev satırı ---"
$B eval "(() => { let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); const item = card && card.querySelector('div[class*=border-l-2]'); if (!item) return 'SATIR_YOK'; return 'hover:' + item.matches(':hover') + ' borderL:' + getComputedStyle(item).borderLeftColor; })()" 2>/dev/null
$B screenshot /home/z/my-project/download/sidebar-no-hover.png 2>&1 | tail -1

# 5) Karta hover
$B mouse move "$KX" "$KY"
$B wait 900 >/dev/null 2>&1
echo "--- KART hover durumu ---"
$B eval "(() => { let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); if (!card) return 'KART_YOK'; return 'kartHover:' + card.matches(':hover') + ' shadow:' + getComputedStyle(card).boxShadow.slice(0, 60) + ' transform:' + getComputedStyle(card).transform.slice(0, 40); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/sidebar-card-hover.png 2>&1 | tail -1

# 6) Görev satırına hover
$B mouse move "$TX" "$TY"
$B wait 900 >/dev/null 2>&1
echo "--- GÖREV SATIRI hover durumu ---"
$B eval "(() => { let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); const item = card && card.querySelector('div[class*=border-l-2]'); if (!item) return 'SATIR_YOK'; return 'satirHover:' + item.matches(':hover') + ' borderL:' + getComputedStyle(item).borderLeftColor + ' bg:' + getComputedStyle(item).backgroundColor + ' kartHover:' + card.matches(':hover'); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/sidebar-task-hover.png 2>&1 | tail -1

$B close 2>/dev/null || true
echo "=== TEST BITTI ==="
