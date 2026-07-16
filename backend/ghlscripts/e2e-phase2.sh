#!/usr/bin/env bash
# Phase 2 ticket-engine E2E: roles, assignment, stage gate, comments, review.
set -u
cd "$(dirname "$0")/.."

node --import=tsx src/index.ts > e2e-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:8080/ && break; sleep 1; done

API=http://localhost:8080/api
JSON="Content-Type: application/json"
PASS=0; FAIL=0
check () { if [ "$2" = "1" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ FAIL: $1"; fi }
tok () { echo "$1" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; }

echo "=== Setup: owner login + create a fresh team member ==="
OWNER=$(tok "$(curl -s -X POST $API/auth/login -H "$JSON" -d '{"email":"admin@demo.com","password":"password123"}')")
[ -n "$OWNER" ] && A=1 || A=0; check "owner logged in" $A

TM_EMAIL="e2e-$(date +%s)@demo.com"
TM=$(curl -s -X POST $API/users/team -H "$JSON" -H "Authorization: Bearer $OWNER" -d "{\"name\":\"E2E Tester\",\"email\":\"$TM_EMAIL\",\"skills\":[\"api\"]}")
TM_ID=$(echo "$TM" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
TM_PASS=$(echo "$TM" | sed -n 's/.*"tempPassword":"\([^"]*\)".*/\1/p')
[ -n "$TM_PASS" ] && A=1 || A=0; check "team member created, temp password returned once" $A

TEAM=$(tok "$(curl -s -X POST $API/auth/login -H "$JSON" -d "{\"email\":\"$TM_EMAIL\",\"password\":\"$TM_PASS\"}")")
[ -n "$TEAM" ] && A=1 || A=0; check "team member can log in with temp password" $A

SUB=$(tok "$(curl -s -X POST $API/portal/enter -H "$JSON" -d '{"locationId":"loc-northwind-001"}')")
[ -n "$SUB" ] && A=1 || A=0; check "sub-account session via portal" $A

echo "=== Ticket creation + auto-assignment ==="
T1=$(curl -s -X POST $API/tickets -H "$JSON" -H "Authorization: Bearer $SUB" -d '{"subject":"E2E: API webhook failing","description":"Webhook returns 500 since yesterday.","category":"api","priority":"HIGH"}')
T1_ID=$(echo "$T1" | sed -n 's/^{"success":true,"data":{"id":"\([^"]*\)".*/\1/p')
echo "$T1" | grep -q '"stage":"ACCEPTED"' && A=1 || A=0
check "sub-account created ticket, auto-assigned (ACCEPTED)" $A
echo "$T1" | grep -q '"assignee":{"id"' && A=1 || A=0
check "assignee present on created ticket" $A

echo "=== Role boundaries ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $API/tickets/$T1_ID/stage -H "$JSON" -H "Authorization: Bearer $SUB" -d '{"stage":"RESOLVED"}')
[ "$CODE" = "403" ] && A=1 || A=0; check "sub-account cannot move stages (403)" $A

# Put the ticket in our test member's hands explicitly
curl -s -X PATCH $API/tickets/$T1_ID/assign -H "$JSON" -H "Authorization: Bearer $OWNER" -d "{\"assigneeId\":\"$TM_ID\"}" > /dev/null
MOVE_OTHER=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $API/tickets/$T1_ID/stage -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"stage":"WORKING"}')
[ "$MOVE_OTHER" = "200" ] && A=1 || A=0; check "assigned team member moves ACCEPTED→WORKING" $A

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $API/tickets/$T1_ID/stage -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"stage":"RESOLVED"}')
[ "$CODE" = "403" ] && A=1 || A=0; check "team member blocked from RESOLVED (403)" $A

echo "=== Sub-account reply rules ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API/tickets/$T1_ID/comment -H "$JSON" -H "Authorization: Bearer $SUB" -d '{"comment":"any update?"}')
[ "$CODE" = "403" ] && A=1 || A=0; check "client cannot reply while WORKING (403)" $A

curl -s -X PATCH $API/tickets/$T1_ID/stage -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"stage":"PENDING","comment":"Which webhook URL are you using?"}' > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API/tickets/$T1_ID/comment -H "$JSON" -H "Authorization: Bearer $SUB" -d '{"comment":"We use /hooks/orders — details attached."}')
[ "$CODE" = "201" ] && A=1 || A=0; check "client CAN reply in PENDING (201)" $A

echo "=== Internal notes hidden from client ==="
curl -s -X POST $API/tickets/$T1_ID/comment -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"comment":"SECRET-INTERNAL-NOTE root cause is nginx","isInternalNote":true}' > /dev/null
CLIENT_VIEW=$(curl -s $API/tickets/$T1_ID -H "Authorization: Bearer $SUB")
echo "$CLIENT_VIEW" | grep -q "SECRET-INTERNAL-NOTE" && A=0 || A=1
check "internal note invisible to sub-account" $A
TEAM_VIEW=$(curl -s $API/tickets/$T1_ID -H "Authorization: Bearer $TEAM")
echo "$TEAM_VIEW" | grep -q "SECRET-INTERNAL-NOTE" && A=1 || A=0
check "internal note visible to staff" $A

echo "=== Review gate: approve ==="
curl -s -X PATCH $API/tickets/$T1_ID/stage -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"stage":"REVIEW","comment":"Fixed the nginx timeout, verified webhook delivers."}' > /dev/null
RQ=$(curl -s $API/tickets/review -H "Authorization: Bearer $OWNER")
echo "$RQ" | grep -q "$T1_ID" && A=1 || A=0; check "ticket appears in owner review queue" $A
AP=$(curl -s -X POST $API/tickets/$T1_ID/approve -H "$JSON" -H "Authorization: Bearer $OWNER" -d '{"note":"Verified, closing."}')
echo "$AP" | grep -q '"stage":"RESOLVED"' && A=1 || A=0; check "owner approve → RESOLVED" $A

echo "=== Review gate: reject path ==="
T2=$(curl -s -X POST $API/tickets -H "$JSON" -H "Authorization: Bearer $OWNER" -d "{\"subject\":\"E2E: reject flow\",\"description\":\"x\",\"category\":\"api\",\"priority\":\"LOW\",\"subAccountId\":\"$(echo "$T1" | sed -n 's/.*"subAccount":{"id":"\([^"]*\)".*/\1/p')\"}")
T2_ID=$(echo "$T2" | sed -n 's/^{"success":true,"data":{"id":"\([^"]*\)".*/\1/p')
curl -s -X PATCH $API/tickets/$T2_ID/assign -H "$JSON" -H "Authorization: Bearer $OWNER" -d "{\"assigneeId\":\"$TM_ID\"}" > /dev/null
curl -s -X PATCH $API/tickets/$T2_ID/stage -H "$JSON" -H "Authorization: Bearer $TEAM" -d '{"stage":"REVIEW"}' > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API/tickets/$T2_ID/reject -H "$JSON" -H "Authorization: Bearer $OWNER" -d '{}')
[ "$CODE" = "400" ] && A=1 || A=0; check "reject without note refused (400)" $A
RJ=$(curl -s -X POST $API/tickets/$T2_ID/reject -H "$JSON" -H "Authorization: Bearer $OWNER" -d '{"note":"Needs a regression test first."}')
echo "$RJ" | grep -q '"stage":"WORKING"' && A=1 || A=0; check "reject with note → back to WORKING" $A

echo "=== Team member isolation ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" $API/tickets/$T2_ID -H "Authorization: Bearer $TEAM")
[ "$CODE" = "200" ] && A=1 || A=0; check "member sees own ticket" $A
curl -s -X PATCH $API/tickets/$T2_ID/assign -H "$JSON" -H "Authorization: Bearer $OWNER" -d '{"assigneeId":null}' > /dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" $API/tickets/$T2_ID -H "Authorization: Bearer $TEAM")
[ "$CODE" = "403" ] && A=1 || A=0; check "member loses access after unassign (403)" $A
UQ=$(curl -s $API/tickets/unassigned -H "Authorization: Bearer $OWNER")
echo "$UQ" | grep -q "$T2_ID" && A=1 || A=0; check "unassigned ticket lands in owner queue" $A

echo "=== Notifications ==="
N=$(curl -s "$API/notifications" -H "Authorization: Bearer $TEAM")
echo "$N" | grep -q "assigned" && A=1 || A=0; check "team member has assignment notifications" $A

echo "=== Cleanup: remove E2E team member (open tickets → queue) ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $API/users/team/$TM_ID -H "Authorization: Bearer $OWNER")
[ "$CODE" = "200" ] && A=1 || A=0; check "team member removed" $A

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
