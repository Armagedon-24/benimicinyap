#!/bin/bash
# Admin UI akışı + CSS hover kuralı + hover sim — tek çağrı
cd /home/z/my-project
pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
for i in $(seq 1 20); do sleep 3; C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null); [ "$C" = "200" ] && break; done
[ "$C" = "200" ] && echo "[OK] sunucu hazır" || { echo "[HATA]"; tail -3 prod.log; exit 1; }

B="agent-browser"

echo "=== A) API yetki testleri (tekrar) ==="
echo -n "oturumsuz: "; curl -s --max-time 10 http://localhost:3000/api/admin/messages -o /dev/null -w '%{http_code} | '
curl -s --max-time 10 -c /tmp/elif.jar -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' -d '{"email":"elif@gmail.com","password":"user123"}' -o /dev/null
echo -n "elif: "; curl -s --max-time 10 -b /tmp/elif.jar http://localhost:3000/api/admin/messages -o /dev/null -w '%{http_code}\n'

echo "=== B) Admin UI akışı ==="
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
# Ziyaretçi hakkındaysa giriş ekranına dön
$B eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Giriş Ekranına Dön')); b && b.click(); return 'LOGIN_EKRANINA_GEC'; })()" 2>/dev/null
$B wait 2500 >/dev/null 2>&1
# Admin girişi — doğrulamalı
$B eval "(() => { const setV = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'INPUT_YOK'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; }; const r1 = setV('#login-email','hakan_varlik24@hotmail.com'); const r2 = setV('#login-password','Hakan_1251'); const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); if (r1 !== 'ok' || r2 !== 'ok' || !b) return 'GIRIS_HAZIR_DEGIL'; b.click(); return 'ADMIN_LOGIN_TIKLANDI'; })()" 2>/dev/null
$B wait 6000 >/dev/null 2>&1
$B eval "(() => { const btn = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Admin Paneli') && x.offsetParent !== null); return btn ? 'ADMIN_SEKME_GORUNUR' : 'ADMIN_SEKME_YOK'; })()" 2>/dev/null
$B eval "(() => { const btn = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Admin Paneli') && x.offsetParent !== null); btn && btn.click(); return 'ADMIN_PANO_ACILDI'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const tab = [...document.querySelectorAll('[role=tab]')].find(x => x.textContent.includes('İletişim Kutusu')); if (!tab) return 'TAB_YOK: ' + [...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim()).join(',').slice(0, 120); tab.click(); return 'ILETISIM_TAB_ACILDI'; })()" 2>/dev/null
$B wait 1500 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ ziyaretci: t.includes('Ziyaretçi Kullanıcı'), testKullanici: t.includes('Test Kullanici'), konu: t.includes('Harita önerisi'), yeniRozet: t.includes('YENİ') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/admin-messages.png 2>&1 | tail -1

echo "--- B2) Okundu işaretle ---"
$B eval "(() => { const btns = [...document.querySelectorAll('button')].filter(x => x.textContent.includes('Okundu') && !x.textContent.includes('Tümünü')); if (!btns.length) return 'BUTON_YOK'; btns[0].click(); return 'OKUNDU_TIKLANDI'; })()" 2>/dev/null
$B wait 2000 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ yeniKaldi: t.includes('YENİ'), okunduBtnVar: t.includes('Okunmadı Yap') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/admin-messages-read.png 2>&1 | tail -1

echo "=== C) glass-card-lift hover kuralı (medya içi) ==="
$B eval "(() => { const findHover = (rules) => { for (const r of rules) { if (r.cssRules) { const f = findHover([...r.cssRules]); if (f) return f; } else if (r.selectorText && r.selectorText.includes('glass-card-lift') && r.selectorText.includes(':hover')) return r; } return null; }; let rules = []; for (const ss of document.styleSheets) { try { rules = rules.concat([...ss.cssRules]); } catch {} } const h = findHover(rules); return h ? 'HOVER_KURALI_VAR: ' + h.selectorText.slice(0, 60) : 'HOVER_KURALI_YOK'; })()" 2>/dev/null

echo "=== D) Sidebar hover sim (kart yükseldi + kenar rengi) ==="
$B eval "(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Görevleri Keşfet') && x.offsetParent !== null); b && b.click(); return 'OK'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const st = document.createElement('style'); st.textContent = '.lift-sim{transform:translateY(-2px) !important;box-shadow:0 4px 20px 0 rgba(0,0,0,0.05),0 16px 36px -12px rgba(59,130,246,0.30),0 0 0 1.5px rgba(59,130,246,0.35) !important;}'; document.head.appendChild(st); let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); if (!card) return 'KART_YOK'; card.classList.add('lift-sim'); return 'SIM_UYGULANDI'; })()" 2>/dev/null
$B wait 700 >/dev/null 2>&1
$B screenshot /home/z/my-project/download/sidebar-hover-fixed.png 2>&1 | tail -1

$B close 2>/dev/null || true
echo "=== BITTI ==="
