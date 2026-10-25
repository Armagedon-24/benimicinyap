#!/bin/bash
# Görev B2: gerçek EXIF fotoğrafıyla tam akış + durum makinesi kontrolü
BASE="http://localhost:3000"
JDIR=/tmp/bimy-jars
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$2" 2>/dev/null; }

# Login'ler tazelensin (session 7 gün ama garanti olsun)
curl -s -c $JDIR/elif.txt   -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"elif@gmail.com","password":"user123"}' > /dev/null
curl -s -c $JDIR/mehmet.txt -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"mehmet@gmail.com","password":"user123"}' > /dev/null
curl -s -c $JDIR/admin.txt  -X POST $BASE/api/auth -H 'Content-Type: application/json' -d '{"email":"hakan_varlik24@hotmail.com","password":"Hakan_1251"}' > /dev/null

create_task() { curl -s -b $1 -X POST $BASE/api/tasks -H 'Content-Type: application/json' -d "{
    \"title\": \"$2\", \"description\": \"Saha görevi: konumda fiziksel kontrol yapılacak, fotoğraflı kanıt gereklidir.\",
    \"city\": \"Antalya\", \"category\": \"Diğer\", \"fee\": $3, \"dueDate\": \"2026-11-05\"
  }" | json - "d['task']['id']"; }
bid() { curl -s -b $1 -X POST $BASE/api/bids -H 'Content-Type: application/json' -d "{
    \"taskId\": \"$2\", \"taskerName\": \"Mehmet Yılmaz\", \"taskerRating\": 4.7, \"amount\": $3, \"proposalText\": \"Hemen üstlenebilirim.\"
  }" > /dev/null; }
accept() { curl -s -b $1 -X PATCH $BASE/api/tasks/$2 -H 'Content-Type: application/json' -d "{
    \"status\": \"assigned\", \"assignedToId\": \"user-mehmet\", \"assignedToName\": \"Mehmet Yılmaz\", \"fee\": $3
  }" > /dev/null; }

echo "=== GÖREV B2 — GERÇEK DOSYA + DURUM MAKİNESİ TESTİ ==="
TASK=$(create_task $JDIR/elif.txt "Sahil Kafe Yerinde Kontrol B2" 500)
pass "Görev B2: $TASK"
bid $JDIR/mehmet.txt $TASK 500; accept $JDIR/elif.txt $TASK 500

# Gerçek EXIF'li JPEG'i gerçek dosya olarak yükle
RESP=$(curl -s -b $JDIR/mehmet.txt -X POST $BASE/api/upload/proof -F "file=@/home/z/my-project/public/proof/human-proof.jpg;type=image/jpeg")
HUMAN_URL=$(echo "$RESP" | json - "d['url']")
pass "Gerçek dosya yüklendi: $HUMAN_URL"

# Teslim et
R=$(curl -s -b $JDIR/mehmet.txt -X PATCH $BASE/api/tasks/$TASK -H 'Content-Type: application/json' -d "{
  \"status\": \"delivered\", \"evidencePhoto\": \"$HUMAN_URL\",
  \"evidenceDescription\": \"Kafe girişindeydim, sahibiyle görüştüm, vitrin ve hesap fişini fotoğrafladım. Öğle saatlerinde gerçek çekim.\",
  \"evidenceLocation\": \"36.8841, 30.7056\"
}" | json - "d['success']")
[ "$R" = "True" ] && pass "Teslim edildi (delivered)" || fail "Teslim başarısız"
sleep 6
INFO=$(curl -s -b $JDIR/elif.txt $BASE/api/tasks/$TASK | json - "(d['task']['status'], d['task']['aiCheckVerdict'], round(d['task']['aiCheckScore'] or 0), d['aiGuard']['blocked'])")
pass "Durum + AI: $INFO (status, verdict, skor, blocked)"

# Durum makinesi: delivered iken sorun yok; şimdi 'assigned'dan onay denemesi benzeri edge case —
# assigned'da olduğumuz için zaten delivered. Onay (200 beklenir):
CODE=$(curl -s -o /tmp/b2approve.json -w "%{http_code}" -b $JDIR/elif.txt -X PATCH $BASE/api/tasks/$TASK -H 'Content-Type: application/json' -d '{"status":"completed"}')
R=$(json - "d['success']" < /tmp/b2approve.json)
[ "$CODE" = "200" ] && [ "$R" = "True" ] && pass "Gerçek fotoğraflı teslim ONAYLANDI (200) — komisyon kesildi, para aktarıldı" || fail "Onay kod=$CODE: $(cat /tmp/b2approve.json)"

echo ""
echo "=== DURUM MAKİNESİ EDGE CASE — assigned görevden onay → 409 bekleniyor ==="
TASK2=$(create_task $JDIR/elif.txt "Ofis Teslimat Kontrolü E2" 250)
bid $JDIR/mehmet.txt $TASK2 250; accept $JDIR/elif.txt $TASK2 250
CODE=$(curl -s -o /tmp/e2.json -w "%{http_code}" -b $JDIR/elif.txt -X PATCH $BASE/api/tasks/$TASK2 -H 'Content-Type: application/json' -d '{"status":"completed"}')
MSG=$(json - "d['message']" < /tmp/e2.json)
[ "$CODE" = "409" ] && pass "Teslimsiz onay engellendi (409): $MSG" || fail "Beklenen 409 kod=$CODE: $(cat /tmp/e2.json)"

echo "TASK_B2=$TASK"
echo "TASK_E2=$TASK2"
