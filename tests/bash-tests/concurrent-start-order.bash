#!/bin/bash
# =============================================================================
# Test: Concurrent Order START
# Fires N POST requests to start the same order simultaneously.
# Expected: exactly 1 succeeds (200), rest fail (409 conflict).
#
# Precondition:
#   - An order must exist in 'assigned' status
#   - The driver must have an active shift
#
# Usage:
#   bash tests/bash-tests/concurrent-start-order.bash ORDER_ID DRIVER_ID
#
# Example:
#   bash tests/bash-tests/concurrent-start-order.bash 1 1
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
ORDER_ID="${1:?Usage: $0 ORDER_ID DRIVER_ID}"
DRIVER_ID="${2:?Usage: $0 ORDER_ID DRIVER_ID}"
CONCURRENT=5

echo "============================================"
echo "  Concurrent Order START Test"
echo "============================================"
echo "URL:        $BASE_URL/api/orders/$ORDER_ID/start"
echo "Driver:     $DRIVER_ID"
echo "Concurrent: $CONCURRENT requests"
echo "--------------------------------------------"

TMPDIR=$(mktemp -d)

for i in $(seq 1 $CONCURRENT); do
  (
    HTTP_CODE=$(curl -s -o "$TMPDIR/body_$i.txt" -w "%{http_code}" \
      --location "$BASE_URL/api/orders/$ORDER_ID/start" \
      --header 'Content-Type: application/json' \
      --data "{\"driverId\": $DRIVER_ID}")
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
    echo "  Request $i: $CODE (started)"
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
echo "Summary: $SUCCESS started, $CONFLICT conflicts, $OTHER unexpected"
echo ""

if [ "$SUCCESS" -eq 1 ] && [ "$CONFLICT" -eq $((CONCURRENT - 1)) ] && [ "$OTHER" -eq 0 ]; then
  echo "PASS: Exactly 1 start succeeded, rest got 409"
else
  echo "FAIL: Expected 1 success + $((CONCURRENT - 1)) conflicts"
  exit 1
fi
