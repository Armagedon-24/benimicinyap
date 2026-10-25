#!/bin/bash
# Task 13 hardening E2E: CSP header + auth korumaları + fail-closed ödemeler + UI smoke (tek çağrı)
cd /home/z/my-project

pkill -f 'next dev' 2>/dev/null; pkill -f next-server 2>/dev/null
sleep 1

setsid nohup bun run start > prod.log 2>&1 &
CODE=""
for i in $(seq 1 20); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "[OK] sunucu hazir"; break; fi
done
if [ "$CODE" != "200" ]; then echo "[HATA] sunucu kalkmadi"; tail -8 prod.log; exit 1; fi

echo "=== 1) Guvenlik header'lari ==="
H=$(curl -s -I --max-time 10 http://localhost:3000/)
echo "$H" | grep -qi "content-security-policy" && echo "[OK] CSP header VAR: $(echo "$H" | grep -i content-security-policy | head -c 90)..." || echo "[HATA] CSP YOK"
echo "$H" | grep -qi "x-frame-options" && echo "[OK] X-Frame-Options VAR" || echo "[HATA] X-Frame-Options YOK"
echo "$H" | grep -qi "x-powered-by" && echo "[BILGI] X-Powered-By hala var" || echo "[OK] X-Powered-By gizli"

echo "=== 2) Auth korumalari ==="
C1=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/admin/messages)
echo "admin/messages oturumsuz: $C1 (beklenen 401)"
C2=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/seed)
echo "seed oturumsuz: $C2 (beklenen 401)"
curl -s --max-time 10 -c /tmp/elif.jar -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' -d '{"email":"elif@gmail.com","password":"user123"}' -o /dev/null
C3=$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/elif.jar http://localhost:3000/api/admin/messages)
echo "admin/messages normal kullanici: $C3 (beklenen 403)"
C4=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/wallet -H 'Content-Type: application/json' -d '{"action":"load","amount":100}')
echo "wallet oturumsuz: $C4 (beklenen 401)"

echo "=== 3) Odeme fail-closed ==="
C5=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/wallet/callback/paytr -d "merchant_oid=tx-x&status=success&total_amount=100&hash=FORGED_HASH")
echo "paytr forge denemesi: $C5 (beklenen 503 fail-closed)"
curl -s --max-time 10 -c /tmp/hakan.jar -X POST http://localhost:3000/api/auth -H 'Content-Type: application/json' -d '{"email":"hakanvarlik24.HV@gmail.com","password":"user123"}' -o /dev/null
C6=$(curl -s --max-time 15 -b /tmp/hakan.jar -X POST http://localhost:3000/api/wallet -H 'Content-Type: application/json' -d '{"action":"load","amount":100,"provider":"iyzico"}' | head -c 150)
echo "iyzico yukleme env yok: $C6 (beklenen 503 / yapilandirilmamis)"

echo "=== 4) Temel akislar ==="
C7=$(curl -s --max-time 10 http://localhost:3000/api/tasks | grep -o '"id"' | wc -l)
echo "tasks kayit sayisi yaklasik: $C7"
C8=$(curl -s --max-time 15 -X POST http://localhost:3000/api/contact -H 'Content-Type: application/json' -d '{"name":"Smoke Test","email":"smoke@test.com","subject":"Task13","message":"Hardening sonrasi smoke test mesaji."}')
echo "contact: $(echo $C8 | head -c 120)"

echo "=== 5) UI smoke (browser) ==="
B="agent-browser"
$B open "http://localhost:3000/" --timeout 60000 >/dev/null 2>&1
$B wait 4000 >/dev/null 2>&1
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK'; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakanvarlik24.HV@gmail.com') + '|' + setVal('#login-password','user123'); })(); (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); b && b.click(); return 'GIRIS'; })()" 2>/dev/null
$B wait 5000 >/dev/null 2>&1
$B eval "(() => { const t=document.body.textContent; return 'LOGIN:' + (t.includes('Hoş geldin') || t.includes('Hakan') ? 'OK' : '?') + '|GOREV:' + (document.body.textContent.length > 200 ? 'RENDER' : 'BOS'); })()" 2>/dev/null
$B screenshot /home/z/my-project/download/hardening-smoke.png 2>&1 | tail -1
$B close >/dev/null 2>&1
echo "=== TEST BITTI ==="
