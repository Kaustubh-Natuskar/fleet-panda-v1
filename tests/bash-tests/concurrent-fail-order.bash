#!/bin/bash
# =============================================================================
# Test: Concurrent Order FAIL
# Fires N POST requests to fail the same order simultaneously.
# Expected: exactly 1 succeeds (200), rest fail (409 conflict).
#
# Precondition:
#   - An order must exist in 'assigned' or 'in_progress' status
#   - The driver must have an active shift
#
# Usage:
#   bash tests/bash-tests/concurrent-fail-order.bash ORDER_ID DRIVER_ID [REASON]
#
# Example:
#   bash tests/bash-tests/concurrent-fail-order.bash 1 1 "Pump malfunction"
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
ORDER_ID="${1:?Usage: $0 ORDER_ID DRIVER_ID [REASON]}"
DRIVER_ID="${2:?Usage: $0 ORDER_ID DRIVER_ID [REASON]}"
REASON="${3:-Equipment failure}"
CONCURRENT=5

echo "============================================"
echo "  Concurrent Order FAIL Test"
echo "============================================"
echo "URL:        $BASE_URL/api/orders/$ORDER_ID/fail"
echo "Driver:     $DRIVER_ID"
echo "Reason:     $REASON"
echo "Concurrent: $CONCURRENT requests"
echo "--------------------------------------------"

TMPDIR=$(mktemp -d)

for i in $(seq 1 $CONCURRENT); do
  (
    HTTP_CODE=$(curl -s -o "$TMPDIR/body_$i.txt" -w "%{http_code}" \
      --location "$BASE_URL/api/orders/$ORDER_ID/fail" \
      --header 'Content-Type: application/json' \
      --data "{\"driverId\": $DRIVER_ID, \"reason\": \"$REASON\"}")
    echo "$HTTP_CODE" > "$TMPDIR/status_$i.txt"
  ) &
done
wait

# Collect results
SUCCESS=0
CONFLICT=0
OTHER=0

echo ""
echo "Results:"
for i in $(seq 1 $CONCURRENT); do
  CODE=$(cat "$TMPDIR/status_$i.txt")
  if [ "$CODE" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))
    echo "  Request $i: $CODE (failed)"
  elif [ "$CODE" = "409" ]; then
    CONFLICT=$((CONFLICT + 1))
    echo "  Request $i: $CODE (conflict)"
  else
    OTHER=$((OTHER + 1))
    BODY=$(cat "$TMPDIR/body_$i.txt")
    echo "  Request $i: $CODE (unexpected) - $BODY"
  fi
done

rm -rf "$TMPDIR"

echo ""
echo "--------------------------------------------"
echo "Summary: $SUCCESS failed, $CONFLICT conflicts, $OTHER unexpected"
echo ""

if [ "$SUCCESS" -eq 1 ] && [ "$CONFLICT" -eq $((CONCURRENT - 1)) ] && [ "$OTHER" -eq 0 ]; then
  echo "PASS: Exactly 1 fail succeeded, rest got 409"
else
  echo "FAIL: Expected 1 success + $((CONCURRENT - 1)) conflicts"
  exit 1
fi
