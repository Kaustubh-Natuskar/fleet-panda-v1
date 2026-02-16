#!/bin/bash
# =============================================================================
# Test: Concurrent Allocation UPDATE (Optimistic Locking)
# Fires N PUT requests with the SAME version number simultaneously.
# Expected: exactly 1 succeeds (200), rest fail (409 version conflict).
#
# Precondition:
#   An allocation must exist. Note its ID and current version.
#   No active shift should be using this allocation.
#
# Usage:
#   bash tests/bash-tests/concurrent-allocation-update.bash ALLOCATION_ID VERSION [NEW_DRIVER_ID]
#
# Example:
#   bash tests/bash-tests/concurrent-allocation-update.bash 1 0 2
# =============================================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
ALLOCATION_ID="${1:?Usage: $0 ALLOCATION_ID VERSION [NEW_DRIVER_ID]}"
VERSION="${2:?Usage: $0 ALLOCATION_ID VERSION [NEW_DRIVER_ID]}"
NEW_DRIVER_ID="${3:-2}"
CONCURRENT=5

echo "============================================"
echo "  Concurrent Allocation UPDATE Test"
echo "  (Optimistic Locking)"
echo "============================================"
echo "URL:        $BASE_URL/api/allocations/$ALLOCATION_ID"
echo "Version:    $VERSION"
echo "New Driver: $NEW_DRIVER_ID"
echo "Concurrent: $CONCURRENT requests"
echo "--------------------------------------------"

TMPDIR=$(mktemp -d)

for i in $(seq 1 $CONCURRENT); do
  (
    HTTP_CODE=$(curl -s -o "$TMPDIR/body_$i.txt" -w "%{http_code}" \
      --location --request PUT "$BASE_URL/api/allocations/$ALLOCATION_ID" \
      --header 'Content-Type: application/json' \
      --data "{\"driverId\": $NEW_DRIVER_ID, \"version\": $VERSION}")
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
    echo "  Request $i: $CODE (updated)"
  elif [ "$CODE" = "409" ]; then
    CONFLICT=$((CONFLICT + 1))
    echo "  Request $i: $CODE (version conflict)"
  else
    OTHER=$((OTHER + 1))
    BODY=$(cat "$TMPDIR/body_$i.txt")
    echo "  Request $i: $CODE (unexpected) - $BODY"
  fi
done

rm -rf "$TMPDIR"

echo ""
echo "--------------------------------------------"
echo "Summary: $SUCCESS updated, $CONFLICT conflicts, $OTHER unexpected"
echo ""

if [ "$SUCCESS" -eq 1 ] && [ "$CONFLICT" -eq $((CONCURRENT - 1)) ] && [ "$OTHER" -eq 0 ]; then
  echo "PASS: Exactly 1 update succeeded, rest got 409 (version mismatch)"
else
  echo "FAIL: Expected 1 success + $((CONCURRENT - 1)) conflicts"
  exit 1
fi
