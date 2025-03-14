#!/usr/bin/env bash
#
# test_loads_endpoints.sh
# ========================
# 1) Logga in (hämta token)
# 2) Testa /api/loads/ => kolla om token funkar
# 3) Testa /api/loads/ballistics => skicka parametrar via `--data-urlencode`
#    => slipper bråk med '#' och mellanslag i bash.

BASE_URL="http://localhost:8000"
USERNAME="admin_user"
PASSWORD="secret_admin_password"

echo "== [1] Loggar in (första anrop) =="
# En första inloggning (observera att vi inte läser något men vi triggar en login)
curl -s -o /dev/null -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD"

echo ""
echo "== [2] Hämtar token i JSON =="
LOGIN_JSON=$(curl -s \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

echo "[DEBUG] LOGIN_JSON=$LOGIN_JSON"

TOKEN=$(echo "$LOGIN_JSON" | grep -oE '"access_token":"[^"]+' | cut -d':' -f2 | tr -d '"')
if [[ -z "$TOKEN" ]]; then
  echo "[FEL] Kunde inte extrahera 'access_token' från $LOGIN_JSON"
  exit 1
fi
echo "[INFO] Token = $TOKEN"

##########################################
# Test 1: GET /api/loads/ (OBS: med slash)
##########################################
echo ""
echo "== Test 1: /api/loads/ =="
curl -i -s \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/loads/" \
  -w "\nHTTP_CODE=%{http_code}\n"

##########################################
# Test 2: /api/loads/ballistics
# Använder -G + --data-urlencode för parametrar
##########################################

function test_ballistics() {
  local muzzleVal="$1"
  local shotSizeVal="$2"
  local shotTypeVal="$3"
  local tempVal="$4"
  local altVal="$5"

  echo ""
  echo "== Testar: muzzle=$muzzleVal, shotSize=$shotSizeVal, shotType=$shotTypeVal, temp=$tempVal, alt=$altVal =="
  curl -i -s -G \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "muzzle=$muzzleVal" \
    --data-urlencode "shotSize=$shotSizeVal" \
    --data-urlencode "shotType=$shotTypeVal" \
    --data-urlencode "temp=$tempVal" \
    --data-urlencode "alt=$altVal" \
    "$BASE_URL/api/loads/ballistics" \
    -w "\nHTTP_CODE=%{http_code}\n"
}

# Exempel:
test_ballistics "1000" "11" "Steel" "70" "Sea Lvl"
test_ballistics "1200" "BB" "Steel" "70" "Sea Lvl"
test_ballistics "1200" "#7.5" "lead" "70" "Sea Lvl"

echo ""
echo "==== [KLART] ===="
echo "Kolla 'HTTP_CODE=...' + svar. Om 500 => se uvicorn-logg, om HTML => proxyproblem, etc."
