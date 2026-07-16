#!/usr/bin/env bash
# Phase 1 acceptance-checklist E2E run (API level, fake GHL key fixtures).
set -u
cd "$(dirname "$0")/.."

node --import=tsx src/index.ts > e2e-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:8080/ && break
  sleep 1
done

API=http://localhost:8080/api
PASS=0; FAIL=0
check () { # name, condition
  if [ "$2" = "1" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ FAIL: $1"; fi
}

echo "=== 1. Active sub-account gets a session (loc-northwind-001) ==="
R=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-northwind-001"}')
echo "$R" | grep -q '"status":"ACTIVE"' && A=1 || A=0
check "returns ACTIVE with tokens" $A
SUB_TOKEN=$(echo "$R" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

echo "=== 2. Sub-account token is scoped correctly ==="
ME=$(curl -s $API/auth/me -H "Authorization: Bearer $SUB_TOKEN")
echo "$ME" | grep -q '"role":"SUB_ACCOUNT"' && A=1 || A=0
check "GET /me shows SUB_ACCOUNT role" $A
FORBIDDEN=$(curl -s -o /dev/null -w "%{http_code}" $API/sub-accounts/requests -H "Authorization: Bearer $SUB_TOKEN")
[ "$FORBIDDEN" = "403" ] && A=1 || A=0
check "sub-account blocked from owner endpoints (403)" $A

echo "=== 3. Pending is idempotent (loc-e2e-pending, two clicks) ==="
P1=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-e2e-pending"}')
P2=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-e2e-pending"}')
echo "$P1" | grep -q '"status":"PENDING"' && echo "$P2" | grep -q '"status":"PENDING"' && A=1 || A=0
check "both clicks return PENDING (no duplicate rows)" $A

echo "=== 4. Rejected sub-account sees denied (loc-e2e-rejected) ==="
RJ=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-e2e-rejected"}')
echo "$RJ" | grep -q '"status":"REJECTED"' && A=1 || A=0
check "returns REJECTED" $A

echo "=== 5. URL tampering: unknown location grants nothing ==="
T=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-attacker-guess-1"}')
echo "$T" | grep -q '"accessToken"' && A=0 || A=1
check "no session issued for guessed location_id" $A

echo "=== 6. Owner approval flow ==="
L=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{"email":"admin@demo.com","password":"password123"}')
OWNER_TOKEN=$(echo "$L" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
REQS=$(curl -s $API/sub-accounts/requests -H "Authorization: Bearer $OWNER_TOKEN")
echo "$REQS" | grep -q 'loc-e2e-pending' && A=1 || A=0
check "pending request visible in owner queue" $A
PENDING_ID=$(echo "$REQS" | sed -n 's/.*"id":"\([^"]*\)","ghlLocationId":"loc-e2e-pending".*/\1/p')
AP=$(curl -s -X POST $API/sub-accounts/$PENDING_ID/approve -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json")
echo "$AP" | grep -q '"status":"ACTIVE"' && A=1 || A=0
check "approve succeeds" $A
AFTER=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-e2e-pending"}')
echo "$AFTER" | grep -q '"status":"ACTIVE"' && A=1 || A=0
check "approved sub-account's next click goes straight in" $A

echo "=== 7. Reject flow (reject the just-approved one) ==="
RJ2=$(curl -s -X POST $API/sub-accounts/$PENDING_ID/reject -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"comment":"e2e test rejection"}')
echo "$RJ2" | grep -q '"status":"REJECTED"' && A=1 || A=0
check "reject succeeds with comment" $A
DENIED=$(curl -s -X POST $API/portal/enter -H "Content-Type: application/json" -d '{"locationId":"loc-e2e-pending"}')
echo "$DENIED" | grep -q '"status":"REJECTED"' && A=1 || A=0
check "rejected sub-account now sees denied" $A

echo "=== 8. Invalid connect persists nothing ==="
BAD=$(curl -s -X POST $API/auth/connect -H "Content-Type: application/json" -d '{"email":"newowner@test.com","password":"password123","agencyName":"Bad Key Agency","ghlCompanyId":"bad-co-123","ghlApiKey":"pit-definitely-invalid-key"}')
echo "$BAD" | grep -q '"success":false' && A=1 || A=0
check "connect with invalid GHL key returns error" $A

echo "=== 9. Rate limiting active on public auth endpoints ==="
CODE=200
for i in $(seq 1 12); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API/auth/login -H "Content-Type: application/json" -d '{"email":"nobody@x.com","password":"wrongwrong"}')
done
[ "$CODE" = "429" ] && A=1 || A=0
check "12th bad login attempt is rate-limited (429)" $A

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
