#!/bin/bash
# =============================================================================
# Test: Concurrent Allocation CREATE
# Fires N identical POST requests to create the same allocation simultaneously.
# Expected: exactly 1 succeeds (201), rest fail (409 conflict).
#
# Usage:
#   bash tests/bash-tests/concurrent-allocations.bash [VEHICLE_ID] [DRIVER_ID] [DATE]
#
# Example:
#   bash tests/bash-tests/concurrent-allocations.bash 1 1 2026-03-01
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
VEHICLE_ID="${1:-1}"
DRIVER_ID="${2:-1}"
DATE="${3:-2026-03-01}"
CONCURRENT=5

echo "============================================"
echo "  Concurrent Allocation CREATE Test"
echo "============================================"
echo "URL:        $BASE_URL/api/allocations"
echo "Vehicle:    $VEHICLE_ID"
echo "Driver:     $DRIVER_ID"
echo "Date:       $DATE"
echo "Concurrent: $CONCURRENT requests"
echo "--------------------------------------------"

TMPDIR=$(mktemp -d)

for i in $(seq 1 $CONCURRENT); do
  (
    HTTP_CODE=$(curl -s -o "$TMPDIR/body_$i.txt" -w "%{http_code}" \
      --location "$BASE_URL/api/allocations" \
      --header 'Content-Type: application/json' \
      --data "{\"vehicleId\": $VEHICLE_ID, \"driverId\": $DRIVER_ID, \"allocationDate\": \"$DATE\"}")
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
  if [ "$CODE" = "201" ]; then
    SUCCESS=$((SUCCESS + 1))
    echo "  Request $i: $CODE (created)"
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
echo "Summary: $SUCCESS created, $CONFLICT conflicts, $OTHER unexpected"
echo ""

if [ "$SUCCESS" -eq 1 ] && [ "$CONFLICT" -eq $((CONCURRENT - 1)) ] && [ "$OTHER" -eq 0 ]; then
  echo "PASS: Exactly 1 created, rest got 409"
else
  echo "FAIL: Expected 1 success + $((CONCURRENT - 1)) conflicts"
  exit 1
fi
