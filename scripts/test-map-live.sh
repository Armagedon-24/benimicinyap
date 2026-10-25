#!/bin/bash
# Canlı sitede harita "Türkiye'ye Dön" düzeltme testi (React uyumlu form doldurma ile)
B="agent-browser"
URL="https://benimicinyap-two.vercel.app/"

counter() {
  $B eval "document.body.innerText.match(/[0-9]+ görev bulundu/)?.[0] || 'SAYAC_YOK'"
}

echo "=== 1) Site + login (native setter ile) ==="
$B open "$URL" --timeout 60000
$B wait --load networkidle --timeout 30000 2>/dev/null || true
$B wait 3000
$B eval "(() => { const setVal = (sel, val) => { const el = document.querySelector(sel); if (!el) return 'YOK:'+sel; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return 'OK'; }; return setVal('#login-email','hakan_varlik24@hotmail.com') + ' | ' + setVal('#login-password','Hakan_1251'); })()"
$B eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Güvenli Giriş')); if (!b) return 'BUTON_YOK'; b.click(); return 'SUBMIT_TIKLANDI'; })()"
$B wait 6000

echo "=== 2) Giris sonrasi sayfa durumu ==="
$B eval "document.body.innerText.slice(0, 400)"
echo "--- network (api) ---"
$B network requests --filter auth 2>/dev/null | tail -5

echo "=== 3) Ilk sayaç (beklenen: 6 görev) ==="
counter

echo "=== 4) İl dropdown aciliyor ==="
$B eval "(() => { const t = [...document.querySelectorAll('[role=combobox], button')].find(x => x.textContent.includes('Tüm İller')); if (!t) return 'DROPDOWN_YOK'; t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); t.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); t.click(); return 'ACILDI'; })()"
$B wait 1500

echo "=== 5) İzmir seciliyor ==="
$B eval "(() => { const o = [...document.querySelectorAll('[role=option]')].find(x => x.textContent.trim().includes('İzmir')); if (!o) return 'OPTION_YOK'; o.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); o.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); o.click(); return 'SECILDI'; })()"
$B wait 5000

echo "=== 6) Sehir seciliyken sayaç (beklenen: 2 görev) ==="
counter

echo "=== 7) 'Türkiye'ye Dön' butonuna basiliyor ==="
$B eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Türkiye')); if (!b) return 'BUTTON_YOK'; b.click(); return 'TIKLANDI'; })()"
$B wait 6000

echo "=== 8) Donus sonrasi sayaç (6 = FIX CANLIDA / 2 = ESKI KOD) ==="
counter

$B close 2>/dev/null || true
echo "=== TEST BITTI ==="
