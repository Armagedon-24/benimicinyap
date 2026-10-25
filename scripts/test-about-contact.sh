#!/bin/bash
# Hakkında sayfası + iletişim panosu + admin görünürlüğü + hover düzeltmesi — tek çağrıda E2E
cd /home/z/my-project
pkill -f next-server 2>/dev/null; sleep 1
setsid nohup bun run start > prod.log 2>&1 &
for i in $(seq 1 20); do sleep 3; C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null); [ "$C" = "200" ] && break; done
[ "$C" = "200" ] && echo "[OK] sunucu hazır" || { echo "[HATA] sunucu yok"; tail -3 prod.log; exit 1; }

B="agent-browser"

echo "=== A) API testleri ==="
echo -n "A1 boş form: "; curl -s --max-time 10 -X POST http://localhost:3000/api/contact -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}\n'
echo -n "A2 geçerli form: "; curl -s --max-time 10 -X POST http://localhost:3000/api/contact -H 'Content-Type: application/json' -d '{"name":"Test Kullanici","email":"test@ornek.com","subject":"Sistem testi","message":"Bu bir otomatik test mesajidir, icerik 5 karakterden uzun."}' | head -c 90; echo
echo -n "A3 oturumsuz mesaj listesi: "; curl -s --max-time 10 http://localhost:3000/api/admin/messages -o /dev/null -w '%{http_code}\n'
curl -s --max-time 10 -c /tmp/elif.jar -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' -d '{"email":"elif@gmail.com","password":"user123"}' -o /dev/null
echo -n "A4 elif (admin degil) mesaj listesi: "; curl -s --max-time 10 -b /tmp/elif.jar http://localhost:3000/api/admin/messages -o /dev/null -w '%{http_code}\n'
curl -s --max-time 10 -c /tmp/admin.jar -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' -d '{"email":"hakan_varlik24@hotmail.com","password":"Hakan_1251"}' -o /dev/null
echo -n "A5 admin mesaj listesi: "; curl -s --max-time 10 -b /tmp/admin.jar http://localhost:3000/api/admin/messages | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK unread=' + str(d.get('unreadCount')) + ' son=' + (d['messages'][0]['name'] if d.get('messages') else 'YOK'))" 2>/dev/null || echo 'HATA'

echo "=== B) Ziyaretçi: Hakkında sayfası + mesaj formu ==="
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Uygulama Hakkında')); if (!b) return 'LINK_YOK'; b.click(); return 'HAKKINDA_ACILDI'; })()" 2>/dev/null
$B wait 2500 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ amaclar: t.includes('Amacımız'), nasil: t.includes('Nasıl Çalışır'), iletisim: t.includes('Bize Ulaşın'), geriBtn: t.includes('Giriş Ekranına Dön') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/about-guest.png 2>&1 | tail -1

echo "--- B2) Mesaj formu doldur + gönder (native setter) ---"
$B eval "(() => { const setV = (sel, val, proto) => { const el = document.querySelector(sel); if (!el) return 'YOK:'+sel; const s = Object.getOwnPropertyDescriptor(proto, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return [ setV('#ct-name','Ziyaretçi Kullanıcı', window.HTMLInputElement.prototype), setV('#ct-email','ziyaretci@ornek.com', window.HTMLInputElement.prototype), setV('#ct-subject','Harita önerisi', window.HTMLInputElement.prototype), setV('#ct-message','Merhaba, harita üzerinde görev filtrelemesi çok güzel olmuş. Elinize sağlık!', window.HTMLTextAreaElement.prototype) ].join(' | '); })()" 2>/dev/null
$B eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Mesajı Gönder')); if (!b) return 'BTN_YOK'; b.click(); return 'GONDERILDI'; })()" 2>/dev/null
$B wait 2500 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return t.includes('Mesajınız alındı') || t.includes('Ekibimiz') ? 'TOAST_OK' : 'TOAST_YOK'; })()" 2>/dev/null
$B eval "(() => { const ta = document.querySelector('#ct-message'); return ta && ta.value === '' ? 'FORM_TEMIZLENDI' : 'FORM_DOLU'; })()" 2>/dev/null

echo "=== C) Normal kullanıcı (elif): admin sekmesi gizli mi? ==="
$B eval "(() => { const setV = (sel, val) => { const el = document.querySelector(sel); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setV('#login-email','elif@gmail.com') + setV('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'ELIF_GIRDI'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ hakkindaSekmesi: t.includes('Hakkında'), adminSekmesi: t.includes('Admin Paneli') }); })()" 2>/dev/null
$B eval "(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Hakkında')); b && b.click(); return 'OK'; })()" 2>/dev/null
$B wait 2500 >/dev/null 2>&1
$B eval "(() => { return document.body.innerText.includes('Nasıl Çalışır') ? 'ELIF_ABOUT_OK' : 'ELIF_ABOUT_YOK'; })()" 2>/dev/null

echo "=== D) Admin: İletişim Kutusu ==="
$B eval "(() => { const setV = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setV('#login-email','hakan_varlik24@hotmail.com') + setV('#login-password','Hakan_1251'); })()" 2>/dev/null
$B eval "(() => { const dd = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-haspopup') === 'menu' || x.textContent.includes('Sistem Yöneticisi')); dd && dd.click(); return 'MENU'; })()" 2>/dev/null
$B wait 1200 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('[role=menuitem]')].find(x => x.textContent.includes('Çıkış')); b && b.click(); return 'CIKIS'; })()" 2>/dev/null
$B wait 3000 >/dev/null 2>&1
$B eval "(() => { const setV = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setV('#login-email','hakan_varlik24@hotmail.com') + setV('#login-password','Hakan_1251'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'ADMIN_GIRDI'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ adminSekmesi: t.includes('Admin Paneli') }); })()" 2>/dev/null
$B eval "(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Admin Paneli')); b && b.click(); return 'ADMIN_ACILDI'; })()" 2>/dev/null
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const b = [...document.querySelectorAll('[role=tab]')].find(x => x.textContent.includes('İletişim Kutusu')); if (!b) return 'TAB_YOK'; b.click(); return 'TAB_ACILDI'; })()" 2>/dev/null
$B wait 1500 >/dev/null 2>&1
$B eval "(() => { const t = document.body.innerText; return JSON.stringify({ ziyaretciMesaji: t.includes('Ziyaretçi Kullanıcı'), haritaOnerisi: t.includes('Harita önerisi'), yeniRozet: t.includes('YENİ') }); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/admin-messages.png 2>&1 | tail -1

echo "=== E) glass-card-lift CSS kuralı ==="
$B eval "(() => { let rules = []; for (const ss of document.styleSheets) { try { rules = rules.concat([...ss.cssRules]); } catch {} } const lift = rules.some(r => r.cssText && r.cssText.includes('glass-card-lift')); const hoverRule = rules.some(r => r.cssText && r.selectorText && r.selectorText.includes('glass-card-lift') && r.selectorText.includes(':hover')); return JSON.stringify({ liftVar: lift, hoverKurali: hoverRule }); })()" 2>/dev/null

echo "=== F) hover simülasyon görüntüsü ==="
$B eval "(() => { const b = [...document.querySelectorAll('button, a')].find(x => x.textContent.includes('Görevleri Keşfet')); b && b.click(); return 'OK'; })()" 2>/dev/null
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const st = document.createElement('style'); st.textContent = '.lift-sim{transform:translateY(-2px) !important;box-shadow:0 4px 20px 0 rgba(0,0,0,0.05),0 16px 36px -12px rgba(59,130,246,0.30),0 0 0 1.5px rgba(59,130,246,0.35) !important;}'; document.head.appendChild(st); let card = null; document.querySelectorAll('div').forEach(d => { const cls = String(d.className); if (cls.includes('glass-card') && cls.includes('h-[420px]') && !card) card = d; }); if (!card) return 'KART_YOK'; card.classList.add('lift-sim'); return 'SIM_OK'; })()" 2>/dev/null
$B wait 600 >/dev/null 2>&1
$B screenshot /home/z/my-project/download/sidebar-hover-fixed.png 2>&1 | tail -1

$B close 2>/dev/null || true
echo "=== TEST BITTI ==="
