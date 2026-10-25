#!/bin/bash
# Admin İletişim Kutusu: Radix tab (pointer event) + okundu akışı
cd /home/z/my-project
pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
for i in $(seq 1 20); do sleep 3; C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null); [ "$C" = "200" ] && break; done
[ "$C" = "200" ] && echo "[OK] sunucu hazır" || { echo "[HATA]"; exit 1; }

B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setV = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'INPUT_YOK'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; }; const r1 = setV('#login-email','hakan_varlik24@hotmail.com'); const r2 = setV('#login-password','Hakan_1251'); const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); if (r1 !== 'ok' || r2 !== 'ok' || !b) return 'GIRIS_HAZIR_DEGIL'; b.click(); return 'ADMIN_LOGIN'; })()" 2>/dev/null
$B wait 6000 >/dev/null 2>&1
$B eval "(() => { const btn = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Admin Paneli') && x.offsetParent !== null); if (!btn) return 'SEKME_YOK'; btn.click(); return 'PANO_ACILDI'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const tab = [...document.querySelectorAll('[role=tab]')].find(x => x.textContent.includes('İletişim Kutusu')); if (!tab) return 'TAB_YOK'; tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); tab.click(); return 'TAB_ACILDI'; })()" 2>/dev/null
$B wait 1800 >/dev/null 2>&1
echo "--- mesajlar görünür mü? ---"
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ ziyaretci: t.includes('Ziyaretçi Kullanıcı'), konu: t.includes('Harita önerisi'), yeniRozet: t.includes('YENİ'), mailto: t.includes('ziyaretci@ornek.com') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/admin-messages.png 2>&1 | tail -1
echo "--- okundu işaretle ---"
$B eval "(() => { const btns = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Okundu'); if (!btns.length) return 'BUTON_YOK'; btns[0].click(); return 'OKUNDU'; })()" 2>/dev/null
$B wait 2000 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ yeniKaldi: t.includes('YENİ'), okunmadiBtn: t.includes('Okunmadı Yap') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/admin-messages-read.png 2>&1 | tail -1
$B close 2>/dev/null || true
echo "=== BITTI ==="
