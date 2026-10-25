#!/bin/bash
# Deployment durumunu poll et (uid parametreden alınır)
TOKEN="$1"
UID="$2"
for i in $(seq 1 40); do
  sleep 15
  STATE=$(curl -s --max-time 20 -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v13/deployments/$UID?teamId=hakans-projects-2ef29a32" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('readyState') or d.get('state'))" 2>/dev/null)
  echo "$(date +%H:%M:%S) durum: $STATE"
  if [ "$STATE" = "READY" ]; then echo "=== READY ==="; exit 0; fi
  if [ "$STATE" = "ERROR" ] || [ "$STATE" = "CANCELED" ]; then echo "=== HATA: $STATE ==="; exit 1; fi
done
echo "=== TIMEOUT ==="
exit 1
