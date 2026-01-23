# Architectural Decisions

This document records key design decisions and trade-offs made during development.

## Table of Contents

1. [Authentication](#authentication)
2. [Concurrent Operations](#concurrent-operations)
3. [Pagination](#pagination)
4. [GPS Data Scaling](#gps-data-scaling)
5. [Shift Scheduling Model](#shift-scheduling-model)
6. [Incomplete Orders at Shift End](#incomplete-orders-at-shift-end)

---

## Authentication

### Decision: Stub Authentication

**Status**: Intentionally deferred per requirements

**Context**: The requirements document explicitly states "Authentication/Authorization - you can stub this".

**Decision**: Authentication is not implemented in this version. All endpoints are open.

**Rationale**:
- Out of scope for take-home assignment
- Time better spent on core fleet management features
- Current design already implies roles (drivers table = driver role)

**Production Recommendation**: If implementing auth, use a simple enum-based approach rather than full RBAC:

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  password String // bcrypt hashed
  role     Role   @default(driver)
  driverId Int?   @unique
  driver   Driver? @relation(fields: [driverId], references: [id])
}

enum Role {
  admin
  driver
  dispatcher
}
```

Use JWT tokens with role claims. Middleware checks role before allowing access to admin endpoints.

---

## Concurrent Operations

### Decision: Optimistic Concurrency with Database Constraints

**Status**: Implemented

**Context**: Two admins might try to allocate the same vehicle simultaneously.

**Decision**: Use database UNIQUE constraints to enforce business rules, handle conflicts gracefully.

**Implementation**:
```prisma
model VehicleAllocation {
  @@unique([vehicleId, allocationDate])  // Vehicle can't be double-booked
  @@unique([driverId, allocationDate])   // Driver can't have two vehicles
}
```

**Error Handling**:
- Prisma error P2002 (unique constraint violation) → 409 Conflict
- Service layer provides descriptive error messages

**Rationale**:
- Simple to implement
- Database guarantees consistency
- Conflicts are rare in practice
- No need for pessimistic locking or distributed locks

---

## Pagination

### Decision: Not Implemented

**Status**: Intentionally deferred

**Context**: Large datasets typically require pagination.

**Decision**: Full lists are returned for all endpoints.

**Rationale**:
- Fleet operations typically have manageable sizes:
  - ~10-50 drivers
  - ~20-50 vehicles
  - ~100-500 daily orders
- Full lists are acceptable for this scale
- Simplifies implementation

**Production Recommendation**: Add `?limit=20&offset=0` query parameters with metadata:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

---

## GPS Data Scaling

### Decision: Simple MySQL Storage

**Status**: Implemented (with scaling notes)

**Context**: GPS data can grow rapidly (updates every few seconds per vehicle).

**Decision**: Store in MySQL with indexed timestamps. Adequate for prototype.

**Current Schema**:
```prisma
model GpsLocation {
  @@index([vehicleId, recordedAt])
  @@index([shiftId])
}
```

**Production Recommendations**:

1. **Table Partitioning** (MySQL 8.0+):
   - Partition by date/month
   - Automatic archival of old partitions

2. **Time-Series Database**:
   - TimescaleDB (PostgreSQL extension)
   - InfluxDB
   - Better for high-frequency writes

3. **Data Retention Policy**:
   - Hot data: Last 30 days in primary table
   - Cold data: Archive to S3/blob storage
   - Aggregated data: Keep hourly summaries long-term

4. **Geo-Spatial Indexing**:
   - Elasticsearch with geo_point fields
   - PostGIS for PostgreSQL
   - Enables efficient "vehicles in area" queries

---

## Shift Scheduling Model

### Decision: Two-Phase Scheduling (Optional Pre-Schedule + Required Allocation)

**Status**: Implemented

**Context**: How do shifts get created? Who initiates?

**Decision**: Support two flows:

**Flow 1: Planned (Driver-Initiated)**
```
Driver schedules availability (POST /api/shifts/schedule)
    ↓
Admin allocates vehicle (POST /api/allocations)
    ↓
Driver starts shift on the day
```

**Flow 2: Ad-hoc (Admin-Initiated)**
```
Admin allocates vehicle
    ↓
Driver starts shift (creates shift automatically)
```

**Key Rules**:
1. Shift CANNOT start without allocation
2. One shift per driver per day (`@@unique([driverId, shiftDate])`)
3. Pre-scheduling is optional but allows drivers to declare availability

**Rationale**:
- Supports both planned operations and ad-hoc dispatching
- Simple mental model
- Allocation is the source of truth for "who drives what"

---

## Incomplete Orders at Shift End

### Decision: Block Shift End Until All Orders Resolved

**Status**: Implemented

**Context**: What happens if driver tries to end shift with in_progress orders?

**Decision**: **Strictly block**. Driver must mark ALL orders as completed or failed before ending shift.

**Implementation**:
```javascript
// In shift.service.js end()
const incompleteOrders = await prisma.order.findMany({
  where: {
    assignedDriverId: driverId,
    assignedDate: shift.shiftDate,
    status: { in: ['assigned', 'in_progress'] },
  },
});

if (incompleteOrders.length > 0) {
  throw new BadRequestError(
    `Cannot end shift: ${incompleteOrders.length} incomplete order(s). Mark them as completed or failed first.`
  );
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot end shift: 2 incomplete order(s) (IDs: 5, 7). Mark them as completed or failed first."
  }
}
```

**Rationale**:
- Ensures complete audit trail
- Forces accountability
- No "orphaned" orders in limbo
- Admin can see failed orders and reason on dashboard

**Alternative Considered**: Auto-fail incomplete orders on shift end
- Rejected: Loses failure reason, removes driver accountability

---

## ID Strategy

### Decision: Auto-Increment Integers

**Status**: Implemented

**Context**: UUIDs vs auto-increment for primary keys.

**Decision**: Use `@id @default(autoincrement())` for all models.

**Rationale**:
- Better MySQL performance (clustered index)
- Smaller storage footprint
- Easier debugging (predictable IDs)
- No need for distributed ID generation in single-database setup

**Trade-off**: IDs are guessable (security concern in some contexts)
- Mitigated by: Authorization checks in production

---

## Inventory Updates

### Decision: Transactional Updates on Order Completion

**Status**: Implemented

**Context**: When does inventory change?

**Decision**: 
- **Completed orders**: Atomically increase destination inventory
- **Failed orders**: No inventory change

**Implementation**: Single Prisma transaction ensures consistency:

```javascript
return prisma.$transaction(async (tx) => {
  // Update order status
  const updatedOrder = await tx.order.update({ ... });
  
  // Update attempt record
  await tx.orderAttempt.update({ ... });
  
  // Increase inventory
  await tx.inventory.upsert({
    where: { locationId_productId: { ... } },
    update: { quantity: { increment: order.quantity } },
    create: { ... },
  });

  return updatedOrder;
});
```

**Rationale**:
- All-or-nothing updates
- No partial state if something fails
- Inventory always consistent with order status
