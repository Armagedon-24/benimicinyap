#!/bin/bash
# Hover efektinin görsel simülasyonu (headless hover:none kısıtı aşılarak)
cd /home/z/my-project
pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
for i in $(seq 1 15); do sleep 3; C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null); [ "$C" = "200" ] && break; done
[ "$C" = "200" ] && echo "[OK] sunucu hazır" || { echo "[HATA]"; tail -3 prod.log; exit 1; }

B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakan_varlik24@hotmail.com') + '|' + setVal('#login-password','Hakan_1251'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('button, a, [role=tab]')].find(x => x.textContent.includes('Keşfet')); b && b.click(); return 'KESFET'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1

# Tailwind hover stillerinin birebir kopyasını statik sınıfla uygula (görsel kanıt)
$B eval "(() => { const st = document.createElement('style'); st.textContent = '.card-sim{box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1),0 0 0 1px rgba(147,197,253,0.6) !important;transform:translateY(-2px) !important;}.row-sim{background-color:rgba(239,246,255,0.7) !important;border-left-color:rgb(59,130,246) !important;box-shadow:0 1px 2px rgba(0,0,0,0.05) !important;}'; document.head.appendChild(st); let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); if (!card) return 'KART_YOK'; const item = card.querySelector('div[class*=border-l-2]'); if (!item) return 'SATIR_YOK'; card.classList.add('card-sim'); item.classList.add('row-sim'); return 'SIM_UYGULANDI'; })()" 2>/dev/null
$B wait 800 >/dev/null 2>&1
$B screenshot /home/z/my-project/download/sidebar-hover-simulasyon.png 2>&1 | tail -1

# Temizle (sim kaldır)
$B eval "(() => { document.querySelectorAll('.card-sim, .row-sim').forEach(el => el.classList.remove('card-sim', 'row-sim')); const st = [...document.querySelectorAll('style')].find(s => s.textContent.includes('card-sim')); st && st.remove(); return 'TEMIZ'; })()" 2>/dev/null

$B close 2>/dev/null || true
echo "=== BITTI ==="
