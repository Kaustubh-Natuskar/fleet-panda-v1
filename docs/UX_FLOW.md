# UX Flow Documentation

This document describes the user experience flows for different actors in the system.

## Actors

1. **Admin**: Manages fleet, drivers, locations, inventory, allocations, and orders
2. **Driver**: Works shifts, completes deliveries, reports GPS

---

## Admin Flows

### 1. Initial Setup Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIAL SETUP                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Create Products                                                  │
│     POST /api/products                                               │
│     {"name": "Diesel", "unit": "gallons"}                           │
│                                                                      │
│  2. Create Locations (Hubs & Terminals)                              │
│     POST /api/locations                                              │
│     {"name": "Central Hub", "type": "hub", ...}                     │
│     {"name": "Terminal A", "type": "terminal", ...}                 │
│                                                                      │
│  3. Set Initial Inventory at Hubs                                    │
│     POST /api/inventory                                              │
│     {"locationId": 1, "productId": 1, "quantity": 50000}     │
│                                                                      │
│  4. Create Drivers                                                   │
│     POST /api/drivers                                                │
│     {"name": "John Smith", "phone": "555-0101", ...}                │
│                                                                      │
│  5. Create Vehicles                                                  │
│     POST /api/vehicles                                               │
│     {"registrationNumber": "TX-FP-001", "capacityGallons": 8000}    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Daily Operations Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DAILY OPERATIONS (Admin)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Morning: Allocate Vehicles                                          │
│  ─────────────────────────                                           │
│                                                                      │
│  1. Check available vehicles for today                               │
│     GET /api/allocations/available-vehicles?date=2026-01-21         │
│     Response: [{id: 2, registrationNumber: "TX-FP-002"}, ...]       │
│                                                                      │
│  2. Allocate vehicle to driver                                       │
│     POST /api/allocations                                            │
│     {"vehicleId": 2, "driverId": 1, "allocationDate": "2026-01-21"} │
│                                                                      │
│     ⚠️ Will fail (409) if:                                          │
│        - Vehicle already allocated today                             │
│        - Driver already has vehicle today                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Create & Assign Orders                                              │
│  ─────────────────────────                                           │
│                                                                      │
│  3. Create delivery order                                            │
│     POST /api/orders                                                 │
│     {                                                                │
│       "destinationId": 3,         // Terminal ID                    │
│       "productId": 1,             // Diesel                         │
│       "quantity": 5000,                                      │
│       "assignedDriverId": 1,      // Optional: assign immediately   │
│       "assignedDate": "2026-01-21"                                  │
│     }                                                                │
│                                                                      │
│  OR create unassigned, then assign later:                           │
│     POST /api/orders/{id}/assign                                    │
│     {"driverId": 1, "assignedDate": "2026-01-21"}                   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Monitor Fleet                                                       │
│  ─────────────────────────                                           │
│                                                                      │
│  4. View real-time fleet status                                      │
│     GET /api/fleet/status                                           │
│     Response: Active vehicles with GPS, drivers, current orders     │
│                                                                      │
│  5. View dashboard summary                                           │
│     GET /api/fleet/summary                                          │
│     Response: {                                                      │
│       totalVehicles: 4,                                             │
│       activeShifts: 2,                                              │
│       todayOrders: 5,                                               │
│       completedToday: 3,                                            │
│       vehicleUtilization: 50                                        │
│     }                                                                │
│                                                                      │
│  6. View inventory levels                                            │
│     GET /api/inventory                                              │
│     GET /api/inventory/location/{locationId}                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Driver Flows

### 3. Shift Scheduling Flow (Optional)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SHIFT SCHEDULING (Driver)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Driver can pre-schedule availability for future dates              │
│  (Admin will then allocate vehicle)                                 │
│                                                                      │
│  1. Schedule shift for future date                                   │
│     POST /api/shifts/schedule                                       │
│     {"driverId": 1, "shiftDate": "2026-01-25"}                      │
│                                                                      │
│     Creates shift with status: "scheduled"                          │
│     vehicleAllocationId: null (assigned later by admin)             │
│                                                                      │
│  2. View upcoming shifts                                             │
│     GET /api/drivers/1/shifts?status=scheduled                      │
│                                                                      │
│     Response shows:                                                  │
│     - shiftDate                                                     │
│     - vehicle: null (not yet allocated) or {...} (allocated)        │
│     - orders: [] (not yet assigned) or [...] (assigned)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Working Shift Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       WORKING SHIFT (Driver)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Prerequisites:                                                      │
│  ✓ Admin has allocated vehicle to driver for today                  │
│  ✓ Orders may or may not be assigned yet                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  START SHIFT                                                         │
│  ───────────                                                         │
│                                                                      │
│  1. Driver starts shift (clock in)                                   │
│     POST /api/shifts/start                                          │
│     {"driverId": 1}                                                 │
│                                                                      │
│     ✅ Success: Returns shift with vehicle info                     │
│     ❌ Fails if: No allocation for today                            │
│     ❌ Fails if: Already has active shift                           │
│                                                                      │
│     Response:                                                        │
│     {                                                                │
│       "id": 1,                                                      │
│       "status": "active",                                           │
│       "startTime": "2026-01-21T06:00:00Z",                         │
│       "vehicle": {                                                  │
│         "registrationNumber": "TX-FP-001",                         │
│         "capacityGallons": 8000                                    │
│       }                                                             │
│     }                                                                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GPS TRACKING                                                        │
│  ────────────                                                        │
│                                                                      │
│  2. Send GPS updates (periodic, e.g., every 30 seconds)              │
│     POST /api/gps                                                   │
│     {                                                                │
│       "vehicleId": 1,                                               │
│       "latitude": 29.7604,                                          │
│       "longitude": -95.3698,                                        │
│       "recordedAt": "2026-01-21T06:05:00Z"  // optional            │
│     }                                                                │
│                                                                      │
│     ⚠️ REJECTED (400) if vehicle has no active shift               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WORK ON ORDERS                                                      │
│  ──────────────                                                      │
│                                                                      │
│  3. View assigned orders                                             │
│     GET /api/drivers/1/orders?status=assigned                       │
│                                                                      │
│  4. Start a delivery                                                 │
│     POST /api/orders/{orderId}/start                                │
│     {"driverId": 1}                                                 │
│                                                                      │
│     Order status: assigned → in_progress                            │
│                                                                      │
│  5a. Complete delivery (SUCCESS)                                     │
│      POST /api/orders/{orderId}/complete                            │
│      {"driverId": 1}                                                │
│                                                                      │
│      Order status: in_progress → completed                          │
│      ✨ Inventory automatically increased at destination            │
│                                                                      │
│  5b. Fail delivery (FAILURE)                                         │
│      POST /api/orders/{orderId}/fail                                │
│      {"driverId": 1, "reason": "Pump malfunction at site"}          │
│                                                                      │
│      Order status: in_progress → failed                             │
│      ⚠️ Inventory NOT affected                                      │
│      📝 Reason recorded for admin review                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  END SHIFT                                                           │
│  ─────────                                                           │
│                                                                      │
│  6. End shift (clock out)                                            │
│     POST /api/shifts/{shiftId}/end                                  │
│     {"driverId": 1}                                                 │
│                                                                      │
│     ⛔ BLOCKED if incomplete orders exist!                          │
│                                                                      │
│     Error Response:                                                  │
│     {                                                                │
│       "success": false,                                             │
│       "error": {                                                    │
│         "code": "BAD_REQUEST",                                      │
│         "message": "Cannot end shift: 2 incomplete order(s)         │
│                    (IDs: 5, 7). Mark them as completed or           │
│                    failed first."                                   │
│       }                                                             │
│     }                                                                │
│                                                                      │
│     ✅ Success when all orders resolved:                            │
│     {                                                                │
│       "id": 1,                                                      │
│       "status": "completed",                                        │
│       "endTime": "2026-01-21T14:00:00Z"                            │
│     }                                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. View History Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VIEW HISTORY (Driver)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  View all shifts (past, present, future)                            │
│  GET /api/drivers/1/shifts                                          │
│                                                                      │
│  Response:                                                           │
│  [                                                                   │
│    {                                                                 │
│      "shiftDate": "2026-01-20",                                     │
│      "status": "completed",                                         │
│      "startTime": "2026-01-20T06:00:00Z",                          │
│      "endTime": "2026-01-20T14:00:00Z",                            │
│      "vehicle": {                                                   │
│        "id": 1,                                                     │
│        "registrationNumber": "TX-FP-001"                           │
│      },                                                             │
│      "orders": [                                                    │
│        {                                                            │
│          "id": 5,                                                   │
│          "destination": {"name": "Terminal A"},                    │
│          "product": {"name": "Diesel"},                            │
│          "quantity": 5000,                                  │
│          "status": "completed",                                    │
│          "failureReason": null                                     │
│        },                                                           │
│        {                                                            │
│          "id": 6,                                                   │
│          "status": "failed",                                       │
│          "failureReason": "Pump malfunction"                       │
│        }                                                            │
│      ]                                                              │
│    },                                                                │
│    {                                                                 │
│      "shiftDate": "2026-01-25",                                     │
│      "status": "scheduled",                                         │
│      "vehicle": null,    // Not allocated yet                       │
│      "orders": []        // No orders yet                           │
│    }                                                                 │
│  ]                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## State Diagrams

### Order Status Flow

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │ assign()
                         ▼
                    ┌──────────┐
                    │ assigned │◄────────────┐
                    └────┬─────┘             │
                         │ start()           │ (re-assign)
                         ▼                   │
                    ┌────────────┐           │
                    │in_progress │           │
                    └─────┬──────┘           │
                         │                   │
              ┌──────────┼──────────┐        │
              │ complete()         │ fail()  │
              ▼                    ▼         │
        ┌───────────┐        ┌────────┐      │
        │ completed │        │ failed │──────┘
        └───────────┘        └────────┘
              │                   │
              │   (inventory      │   (no inventory
              │    increased)     │    change)
              ▼                   ▼
           [END]               [END or Re-assign]
```

### Shift Status Flow

```
        ┌─────────────────┐
        │   (no shift)    │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │ schedule()              │ start()
    ▼                         │ (ad-hoc)
┌───────────┐                 │
│ scheduled │                 │
└─────┬─────┘                 │
      │ start()               │
      │ (when allocation      │
      │  exists)              │
      ▼                       │
┌───────────┐◄────────────────┘
│  active   │
└─────┬─────┘
      │ end()
      │ (all orders resolved)
      ▼
┌───────────┐
│ completed │
└───────────┘
```

---

## Error Scenarios

| Action | Error Condition | HTTP Status | Message |
|--------|-----------------|-------------|---------|
| Allocate vehicle | Vehicle already allocated | 409 | "Vehicle 'TX-FP-001' is already allocated for 2026-01-21" |
| Allocate vehicle | Driver already has vehicle | 409 | "Driver 'John Smith' already has a vehicle allocated for 2026-01-21" |
| Start shift | No allocation | 400 | "No vehicle allocated for driver John Smith today" |
| Start shift | Already active | 409 | "Driver already has an active shift" |
| Record GPS | No active shift | 400 | "Cannot record GPS: vehicle 'TX-FP-001' does not have an active shift" |
| Start order | No active shift | 400 | "Cannot start order: you do not have an active shift" |
| Complete order | Not in_progress | 409 | "Cannot complete order: status is 'assigned'" |
| End shift | Incomplete orders | 400 | "Cannot end shift: 2 incomplete order(s) (IDs: 5, 7)" |
