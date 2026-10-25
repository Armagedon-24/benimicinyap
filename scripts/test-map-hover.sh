#!/bin/bash
# Yerel harita hover tooltip testi:
# 1) Haritada il ismi YOK (Reference tile katmanı kaldırıldı mı?)
# 2) Fare bir ilin üzerindeyken isim bilgi balonu görünüyor mu?
# 3) Fare çekilince balon kayboluyor mu?
B="agent-browser"
URL="http://localhost:3000/"

echo "=== 1) Site + login (native setter ile) ==="
$B open "$URL" --timeout 60000
$B wait --load networkidle --timeout 30000 2>/dev/null || true
$B wait 3000
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK:'+sel; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakan_varlik24@hotmail.com') + ' | ' + setVal('#login-password','Hakan_1251'); })()"
$B eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); if (!b) return 'BUTON_YOK'; b.click(); return 'SUBMIT_TIKLANDI'; })()"
$B wait 6000

echo "=== 2) Keşfet / Harita sekmesine git ==="
$B eval "(() => { const b = [...document.querySelectorAll('button, a, [role=tab]')].find(x => x.textContent.includes('Keşfet')); if (!b) return 'KESFET_YOK'; b.click(); return 'KESFET_TIKLANDI'; })()"
$B wait 6000

echo "=== 3) Reference tile istekleri kontrolü (0 olmalı) ==="
$B network requests --filter "Reference" 2>/dev/null | tail -3
$B network requests --filter "arcgisonline" 2>/dev/null | tail -3

echo "=== 4) Harita yüklü mü + büyük il poligonu merkezini bul ==="
$B eval "(() => { const pane = document.querySelector('.leaflet-overlay-pane svg'); if (!pane) return 'SVG_YOK'; const paths = pane.querySelectorAll('path'); let best = null; for (const p of paths) { const r = p.getBoundingClientRect(); if (r.width < 20 || r.height < 20) continue; const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const el = document.elementFromPoint(cx, cy); if (el === p) { const area = r.width * r.height; if (!best || area > best.area) best = { area: Math.round(area), x: Math.round(cx), y: Math.round(cy) }; } } return best ? JSON.stringify(best) : 'HOVERLANABILIR_POLIGON_YOK'; })()"

echo "=== 5) Fareyi il poligonu üzerine getir ==="
PX=$($B eval "(() => { const pane = document.querySelector('.leaflet-overlay-pane svg'); if (!pane) return '0,0'; const paths = pane.querySelectorAll('path'); let best = null; for (const p of paths) { const r = p.getBoundingClientRect(); if (r.width < 20 || r.height < 20) continue; const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const el = document.elementFromPoint(cx, cy); if (el === p) { const area = r.width * r.height; if (!best || area > best.area) best = { area: Math.round(area), x: Math.round(cx), y: Math.round(cy) }; } } return best ? best.x + ',' + best.y : '0,0'; })()" | tr -d '"')
X="${PX%,*}"; Y="${PX#*,}"
echo "hedef koordinat: $X,$Y"
$B mouse move "$X" "$Y"
$B wait 1200

echo "=== 6) Hover balonu göründü mü? ==="
$B eval "(() => { const t = document.querySelector('.leaflet-tooltip.city-name-tooltip'); return t ? 'BALON_ACIK: ' + t.textContent.trim() : 'BALON_YOK'; })()"

echo "=== 7) Balon ekran görüntüsü ==="
$B screenshot /home/z/my-project/download/map-hover-tooltip.png || true

echo "=== 8) Fareyi harita dışına çek ==="
$B mouse move 10 10
$B wait 1000

echo "=== 9) Balon kayboldu mu? ==="
$B eval "(() => { const t = document.querySelector('.leaflet-tooltip.city-name-tooltip'); return t ? 'HATA_BALON_HALA_ACIK: ' + t.textContent.trim() : 'BALON_KAPANDI_OK'; })()"

echo "=== 10) Fareyi başka bir ilin üzerine getir (farklı il ismi gelmeli) ==="
PX2=$($B eval "(() => { const pane = document.querySelector('.leaflet-overlay-pane svg'); if (!pane) return '0,0'; const paths = pane.querySelectorAll('path'); const cands = []; for (const p of paths) { const r = p.getBoundingClientRect(); if (r.width < 20 || r.height < 20) continue; for (const fx of [0.3, 0.5, 0.7]) { for (const fy of [0.3, 0.5, 0.7]) { const cx = r.x + r.width * fx, cy = r.y + r.height * fy; const el = document.elementFromPoint(cx, cy); if (el === p) cands.push({ area: Math.round(r.width * r.height), x: Math.round(cx), y: Math.round(cy) }); } } } cands.sort((a, b) => b.area - a.area); return cands.length > 1 ? cands[1].x + ',' + cands[1].y : (cands[0] ? cands[0].x + ',' + cands[0].y : '0,0'); })()" | tr -d '"')
X2="${PX2%,*}"; Y2="${PX2#*,}"
echo "ikinci hedef: $X2,$Y2"
$B mouse move "$X2" "$Y2"
$B wait 1200
$B eval "(() => { const t = document.querySelector('.leaflet-tooltip.city-name-tooltip'); return t ? 'IKINCI_BALON: ' + t.textContent.trim() : 'BALON_YOK'; })()"

echo "=== 11) Temiz harita ekran görüntüsü (il isimleri olmadan) ==="
$B mouse move 10 10
$B wait 800
$B screenshot /home/z/my-project/download/map-no-city-names.png || true

$B close 2>/dev/null || true
echo "=== TEST BITTI ==="
