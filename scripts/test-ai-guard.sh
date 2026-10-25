#!/bin/bash
# AI onay engelleme + gerçek dosya yükleme — uçtan uca API testi
BASE="http://localhost:3000"
JDIR=/tmp/bimy-jars
mkdir -p $JDIR

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; }

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$2" 2>/dev/null; }

echo "=== 1) LOGİN ==="
curl -s -c $JDIR/elif.txt   -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"elif@gmail.com","password":"user123"}'   | json - "d['user']['walletBalance']" > /tmp/elif_bal.txt && echo "elif login OK, bakiye: $(cat /tmp/elif_bal.txt)"
curl -s -c $JDIR/mehmet.txt -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"mehmet@gmail.com","password":"user123"}' | json - "d['user']['walletBalance']" > /tmp/mehmet_bal.txt && echo "mehmet login OK, bakiye: $(cat /tmp/mehmet_bal.txt)"
curl -s -c $JDIR/admin.txt  -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"hakan_varlik24@hotmail.com","password":"Hakan_1251"}' | json - "d['user']['role']" > /tmp/admin_role.txt && echo "admin login OK, rol: $(cat /tmp/admin_role.txt)"

echo ""
echo "=== 2) UPLOAD DOĞRULAMALARI ==="
# 2a) Metin dosyası .jpg olarak → 415 beklenir
echo "bu bir fotoğraf değildir" > /tmp/fake.jpg
CODE=$(curl -s -o /tmp/up1.json -w "%{http_code}" -b $JDIR/mehmet.txt -X POST $BASE/api/upload/proof -F "file=@/tmp/fake.jpg;type=image/jpeg")
MSG=$(json - "d['message']" < /tmp/up1.json)
[ "$CODE" = "415" ] && pass "Sahte JPEG reddedildi (415): $MSG" || fail "Sahte JPEG kod=$CODE: $MSG"

# 2b) 11MB şişirilmiş dosya → 413 beklenir
dd if=/dev/zero of=/tmp/big.jpg bs=1M count=11 2>/dev/null; printf '\xff\xd8\xff\xe0' | dd of=/tmp/big.jpg bs=1 seek=0 conv=notrunc 2>/dev/null
CODE=$(curl -s -o /tmp/up2.json -w "%{http_code}" -b $JDIR/mehmet.txt -X POST $BASE/api/upload/proof -F "file=@/tmp/big.jpg;type=image/jpeg")
MSG=$(json - "d['message']" < /tmp/up2.json)
[ "$CODE" = "413" ] && pass "Boyut limiti (413): $MSG" || fail "Boyut limiti kod=$CODE: $MSG"

# 2c) Kimliksiz yükleme → 401
CODE=$(curl -s -o /tmp/up3.json -w "%{http_code}" -X POST $BASE/api/upload/proof -F "file=@/home/z/my-project/public/proof/human-proof.jpg;type=image/jpeg")
[ "$CODE" = "401" ] && pass "Oturumsuz yükleme reddedildi (401)" || fail "Oturumsuz yükleme kod=$CODE"

# 2d) Gerçek EXIF'li JPEG yükleme → 200
RESP=$(curl -s -b $JDIR/mehmet.txt -X POST $BASE/api/upload/proof -F "file=@/home/z/my-project/public/proof/human-proof.jpg;type=image/jpeg")
HUMAN_URL=$(echo "$RESP" | json - "d['url']")
SIZE=$(echo "$RESP" | json - "d['size']")
[ -n "$HUMAN_URL" ] && pass "EXIF'li JPEG yüklendi: $HUMAN_URL ($SIZE bayt)" || fail "JPEG yükleme başarısız: $RESP"

# 2e) C2PA/AI imzalı PNG yükleme → 200
RESP=$(curl -s -b $JDIR/mehmet.txt -X POST $BASE/api/upload/proof -F "file=@/home/z/my-project/public/proof/ai-proof-c2pa.png;type=image/png")
AI_URL=$(echo "$RESP" | json - "d['url']")
[ -n "$AI_URL" ] && pass "AI imzalı PNG yüklendi: $AI_URL" || fail "PNG yükleme başarısız: $RESP"

# Yüklenen dosya HTTP üzerinden erişilebilir mi?
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$HUMAN_URL")
[ "$CODE" = "200" ] && pass "Yüklenen dosya statik olarak servis ediliyor (200)" || fail "Statik servis kod=$CODE"

create_task() { # $1=jar $2=fee $3=title
  curl -s -b $1 -X POST $BASE/api/tasks -H 'Content-Type: application/json' -d "{
    \"title\": \"$3\", \"description\": \"Saha görevi: konumda fiziksel kontrol yapılacak, fotoğraflı kanıt gereklidir.\",
    \"city\": \"Antalya\", \"category\": \"Diğer\", \"fee\": $2, \"dueDate\": \"2026-11-05\"
  }" | json - "d['task']['id']"
}

bid() { # $1=jar $2=taskId $3=amount $4=name
  curl -s -b $1 -X POST $BASE/api/bids -H 'Content-Type: application/json' -d "{
    \"taskId\": \"$2\", \"taskerName\": \"$4\", \"taskerRating\": 4.7, \"amount\": $3, \"proposalText\": \"Hemen üstlenebilirim.\"
  }" | json - "d['bid']['id']"
}

accept() { # $1=jar $2=taskId $3=amount
  curl -s -b $1 -X PATCH $BASE/api/tasks/$2 -H 'Content-Type: application/json' -d "{
    \"status\": \"assigned\", \"assignedToId\": \"user-mehmet\", \"assignedToName\": \"Mehmet Yılmaz\", \"fee\": $3
  }" | json - "d['success']"
}

deliver() { # $1=jar $2=taskId $3=photoUrl $4=text
  curl -s -b $1 -X PATCH $BASE/api/tasks/$2 -H 'Content-Type: application/json' -d "{
    \"status\": \"delivered\", \"evidencePhoto\": \"$3\", \"evidenceDescription\": \"$4\", \"evidenceLocation\": \"36.8841, 30.7056\"
  }" | json - "d['success']"
}

aiinfo() { # $1=jar $2=taskId
  curl -s -b $1 $BASE/api/tasks/$2 | json - "(d['task']['aiCheckVerdict'], round(d['task']['aiCheckScore'] or 0), d['aiGuard']['blocked'], d['aiGuard']['threshold'])"
}

echo ""
echo "=== 3) GÖREV A — AI-ŞÜPHELİ TESLİMDE ONAY ENGELLENMELİ ==="
TASK_A=$(create_task $JDIR/elif.txt 600 "Merkez Faaliyet Kontrolü — Kilitli Teslimat Denemesi")
pass "Görev A oluşturuldu: $TASK_A"
bid $JDIR/mehmet.txt $TASK_A 600 "Mehmet Yılmaz" > /dev/null && pass "Mehmet 600₺ teklif verdi"
R=$(accept $JDIR/elif.txt $TASK_A 600); [ "$R" = "True" ] && pass "Elif teklifi kabul etti (escrow 600₺)" || fail "Kabul başarısız: $R"
deliver $JDIR/mehmet.txt $TASK_A $AI_URL "Islem tamamlandi. Tum prosedurler uygulandi ve ciktilar uretildi. Basariyla sonuclandi." > /dev/null && pass "Mehmet AI-imzalı PNG ile teslim etti (AI taraması otomatik başladı)"
sleep 6
INFO=$(aiinfo $JDIR/elif.txt $TASK_A)
pass "AI taraması: $INFO (verdict, skor, blocked, eşik)"

echo "--- İşveren (elif) onay denemesi → 403 bekleniyor ---"
CODE=$(curl -s -o /tmp/approve_a.json -w "%{http_code}" -b $JDIR/elif.txt -X PATCH $BASE/api/tasks/$TASK_A -H 'Content-Type: application/json' -d '{"status":"completed"}')
MSG=$(json - "d['message']" < /tmp/approve_a.json)
BLOCKED=$(json - "d.get('blocked')" < /tmp/approve_a.json)
[ "$CODE" = "403" ] && [ "$BLOCKED" = "True" ] && pass "ONAY ENGELLENDİ (403): $MSG" || fail "Beklenen 403 gelmedi kod=$CODE: $(cat /tmp/approve_a.json)"

echo "--- Yönetici override denemesi (admin requester değil ama hakem) → başarılı bekleniyor ---"
R=$(curl -s -b $JDIR/admin.txt -X PATCH $BASE/api/tasks/$TASK_A -H 'Content-Type: application/json' -d '{"status":"completed"}' | json - "d['success']")
[ "$R" = "True" ] && pass "Admin override ile tamamlandı (hakem yetkisi çalışıyor)" || fail "Admin override başarısız: $R"

echo ""
echo "=== 4) GÖREV B — GERÇEK EXIF'li FOTOĞRAF İLE ONAY SERBEST ==="
TASK_B=$(create_task $JDIR/elif.txt 500 "Vadi Bölgesi Yerinde Görsel Denetim")
pass "Görev B oluşturuldu: $TASK_B"
bid $JDIR/mehmet.txt $TASK_B 500 "Mehmet Yılmaz" > /dev/null
accept $JDIR/elif.txt $TASK_B 500 > /dev/null && pass "Teklif kabul edildi (escrow 500₺)"
deliver $JDIR/mehmet.txt $TASK_B $HUMAN_URL "Vadi park girişindeydim, tabelayı ve zemini kontrol ettim. Sabah saatlerinde gerçek çekim yaptım, dükkan sahibiyle konuştum." > /dev/null && pass "Mehmet EXIF'li gerçek fotoğrafla teslim etti"
sleep 6
INFO=$(aiinfo $JDIR/elif.txt $TASK_B)
pass "AI taraması: $INFO (verdict, skor, blocked, eşik)"

echo "--- İşveren (elif) onay denemesi → 200 bekleniyor ---"
CODE=$(curl -s -o /tmp/approve_b.json -w "%{http_code}" -b $JDIR/elif.txt -X PATCH $BASE/api/tasks/$TASK_B -H 'Content-Type: application/json' -d '{"status":"completed"}')
R=$(json - "d['success']" < /tmp/approve_b.json)
[ "$CODE" = "200" ] && [ "$R" = "True" ] && pass "Yüksek skorlu teslim ONAYLANDI (ödeme serbest bırakıldı)" || fail "Onay beklenmedik şekilde engellendi kod=$CODE: $(cat /tmp/approve_b.json)"

echo ""
echo "=== 5) GÖREV C — UI DEMO İÇİN ENGELLİ DURUMDA BIRAKILIYOR ==="
TASK_C=$(create_task $JDIR/elif.txt 300 "Depo Çevre Güvenlik Gezintisi")
bid $JDIR/mehmet.txt $TASK_C 300 "Mehmet Yılmaz" > /dev/null
accept $JDIR/elif.txt $TASK_C 300 > /dev/null
deliver $JDIR/mehmet.txt $TASK_C "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600" "Teslim edildi. Her sey tamam gorunuyor." > /dev/null
sleep 6
INFO=$(aiinfo $JDIR/elif.txt $TASK_C)
pass "Görev C (delivered, engelli demo): $INFO"
echo "TASK_A=$TASK_A"
echo "TASK_B=$TASK_B"
echo "TASK_C=$TASK_C"
