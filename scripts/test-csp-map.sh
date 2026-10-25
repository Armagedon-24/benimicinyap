#!/bin/bash
# CSP altinda harita + tile dogrulamasi
cd /home/z/my-project
pkill -f 'next dev' 2>/dev/null; pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
CODE=""
for i in $(seq 1 20); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "[OK] sunucu hazir"; break; fi
done
[ "$CODE" != "200" ] && { echo "[HATA] sunucu yok"; exit 1; }

B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakanvarlik24.HV@gmail.com') + '|' + setVal('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('button, a, [role=tab]')].find(x => x.textContent.includes('Keşfet')); b && b.click(); return 'KESFET'; })()" 2>/dev/null
$B wait 8000 >/dev/null 2>&1
$B eval "(() => { const map = document.querySelector('.leaflet-container'); const tiles = [...document.querySelectorAll('img.leaflet-tile')]; const yuklu = tiles.filter(t => t.naturalWidth > 0).length; const polygon = document.querySelectorAll('path.leaflet-interactive').length; return 'HARITA:' + (map ? 'VAR' : 'YOK') + '|TILE:' + tiles.length + '|TILE_YUKLU:' + yuklu + '|IL_POLYGON:' + polygon; })()" 2>/dev/null
$B screenshot /home/z/my-project/download/hardening-harita.png 2>&1 | tail -1
$B close >/dev/null 2>&1
echo "=== BITTI ==="
