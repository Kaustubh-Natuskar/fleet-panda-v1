# Technical Decisions & Trade-offs

This document captures the key technical decisions made during the design of the Fleet Tracking Platform, along with the reasoning and trade-offs considered.

---

## Table of Contents

1. [Architecture Decisions](#1-architecture-decisions)
2. [Database Design Decisions](#2-database-design-decisions)
3. [API Design Decisions](#3-api-design-decisions)
4. [Business Logic Decisions](#4-business-logic-decisions)
5. [Validation & Error Handling](#5-validation--error-handling)
6. [Simplifications & Assumptions](#6-simplifications--assumptions)
7. [Future Improvements](#7-future-improvements)

---

## 1. Architecture Decisions

### 1.1 Technology Stack

**Decision:** Express.js + Prisma + MySQL

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js | Non-blocking I/O for high concurrency |
| Framework | Express 5.1 | Lightweight, large ecosystem, simple middleware chain |
| ORM | Prisma 6.19 | Type-safe queries, auto-migrations, schema as documentation |
| Database | MySQL 8.0 | Reliable, ACID-compliant, well-suited for fleet data |
| API Docs | Swagger/OpenAPI 3.0 | Industry standard, interactive documentation |
| Security | Helmet | Security headers out of the box |

---

### 1.2 Project Structure: Layered Architecture

**Decision:** Route → Controller → Service → Prisma layered architecture

```
src/
├── server.js                    # Entry point with graceful shutdown
├── app.js                       # Express app setup & middleware
├── config/
│   └── swagger.js              # OpenAPI documentation config
├── middleware/
│   ├── error.middleware.js      # Global error handling
│   ├── validate.middleware.js   # Joi-based request validation
│   └── parseId.middleware.js    # ID parameter type coercion
├── routes/                      # 10 route modules (one per resource)
├── controllers/                 # Request handlers (10 modules)
├── services/                    # Business logic (10 modules)
├── validators/                  # Joi validation schemas (8 modules)
└── utils/
    ├── prisma.js               # Prisma singleton
    ├── errors.js               # Custom error classes
    └── response.js             # Standardized response helpers
```

**Benefits:**
- **Controllers:** Handle HTTP concerns only (request parsing, response formatting)
- **Services:** Contain all business logic, reusable and testable in isolation
- **Validators:** Declarative input validation schemas
- **Utils:** Shared helpers for errors, responses, and database access

---

### 1.3 Middleware Pipeline

**Decision:** Ordered middleware chain for security, logging, and validation

```
Request Flow:
helmet()                    → Security headers
cors()                      → Cross-origin support
morgan('dev')              → HTTP request logging
express.json()             → Body parsing
express.urlencoded()       → Form parsing
swagger + health routes    → Documentation & health checks
API routes                 → Route handlers
├── parseId()              → ID coercion (per-route)
├── validate()             → Joi validation (per-route)
└── Controller → Service
Error middleware           → Global error handler
```

---

### 1.4 Prisma Singleton Pattern

**Decision:** Single Prisma client instance shared across the application

```javascript
// utils/prisma.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

**Rationale:**
- Prevents connection pool exhaustion
- Enables proper connection lifecycle management
- Consistent database access throughout the application

---

## 2. Database Design Decisions

### 2.1 Entity Grouping Strategy

**Decision:** Separate entities into Master Data and Operational Data

| Category | Entities | Purpose |
|----------|----------|---------|
| **Master Data** | Product, Location, Driver, Vehicle | Relatively static reference data |
| **Operational Data** | Inventory, VehicleAllocation, Shift, Order, OrderAttempt, GpsLocation | Dynamic business operations |

---

### 2.2 Locations: Combined Table with Type Enum

**Decision:** Single `locations` table with `type` enum instead of separate tables

```prisma
model Location {
  id        Int          @id @default(autoincrement())
  name      String       @db.VarChar(200)
  type      LocationType
  address   String?      @db.VarChar(500)
  latitude  Decimal?     @db.Decimal(10, 8)
  longitude Decimal?     @db.Decimal(11, 8)
}

enum LocationType {
  hub
  terminal
}
```

**Reasoning:**
- Hubs and terminals share identical attributes
- Single table simplifies queries and foreign key relationships
- `type` enum provides sufficient differentiation
- Orders reference `destinationId` without needing to know the location type

---

### 2.3 Vehicle Allocation: Dual Unique Constraints

**Decision:** Enforce both vehicle and driver exclusivity per day at database level

```prisma
model VehicleAllocation {
  @@unique([vehicleId, allocationDate])  // Vehicle can't be double-booked
  @@unique([driverId, allocationDate])   // Driver can't have two vehicles
}
```

**Source:** Assignment requirement states "Vehicle should be blocked for that driver for that day"

**Implementation:**
- Database constraints prevent concurrent allocation conflicts atomically
- First request succeeds, second gets constraint violation
- Service converts P2002 error to 409 Conflict response

---

### 2.4 Orders: Independent Entity with Attempt Tracking

**Decision:** Orders exist independently; `orderAttempts` tracks delivery history

```prisma
model Order {
  id               Int       @id @default(autoincrement())
  status           OrderStatus
  assignedDriverId Int?
  assignedDate     DateTime? @db.Date
  // ...
}

model OrderAttempt {
  id          Int       @id @default(autoincrement())
  orderId     Int
  shiftId     Int
  status      OrderAttemptStatus
  failReason  String?
  attemptedAt DateTime  @default(now())
  completedAt DateTime?
}
```

**Reasoning:**
- Orders are "tasks that exist until fulfilled"
- Failed orders can be reassigned to different drivers
- Full audit trail: who attempted, when, outcome, failure reason
- Shift context preserved for each attempt

---

### 2.5 GPS Data: Shift Linkage

**Decision:** GPS records require an active shift

```prisma
model GpsLocation {
  id         Int      @id @default(autoincrement())
  vehicleId  Int
  shiftId    Int?
  latitude   Decimal  @db.Decimal(10, 8)
  longitude  Decimal  @db.Decimal(11, 8)
  recordedAt DateTime @default(now())

  @@index([vehicleId, recordedAt])
  @@index([shiftId])
}
```

**Reasoning:**
- GPS data without operational context is less valuable
- Prevents spurious location records when vehicles aren't in use
- Enables "route taken during this shift" queries
- Clear error message when attempting to log without active shift

---

### 2.6 Inventory: Upsert Pattern with Composite Key

**Decision:** Location-product inventory uses upsert pattern

```prisma
model Inventory {
  id         Int @id @default(autoincrement())
  locationId Int
  productId  Int
  quantity   Int @default(0)

  @@unique([locationId, productId])
}
```

**Implementation:**
- POST endpoint acts as "set/adjust inventory" not "add record"
- Prisma's `upsert` handles both create and update atomically
- Prevents negative quantities at service layer

---

### 2.7 ID Strategy: Auto-Increment Integers

**Decision:** Use `@id @default(autoincrement())` for all models

**Rationale:**
- Better MySQL performance (clustered index on primary key)
- Smaller storage footprint than UUIDs
- Easier debugging with predictable, sequential IDs
- Single-database setup doesn't need distributed ID generation

**Trade-off:** IDs are guessable
- Mitigated by: Authorization checks (when implemented)

---

### 2.8 Scalability Strategy for GPS Data

**Decision:** Start with MySQL for simplicity, with a clear, phased plan to scale GPS data storage as the system grows. This acknowledges the long-term limitations of using a relational database for high-volume time-series data.

**Phase 1: Initial Implementation (Current)**
- **Strategy:** Store GPS data in a standard MySQL table (`gps_locations`).
- **Rationale:** Simple to implement with Prisma, suitable for initial development and small-scale production. It allows the application to be functional without premature optimization.
- **Known Limitation:** Performance will degrade significantly as the table grows into millions or billions of rows, impacting both write throughput and query latency.

**Phase 2: Medium-Scale Optimization**
- **Strategy:** Implement **Table Partitioning** on the `gps_locations` table.
- **Partition Key:** `RANGE` partitioning on the `recordedAt` timestamp (e.g., a new partition per month).
- **Rationale:**
    - **Query Performance:** Queries for a vehicle's route within a specific time frame will only scan the relevant partitions, drastically reducing query time.
    - **Data Management:** Archiving or deleting old data becomes an instantaneous `DROP PARTITION` operation, instead of a slow, row-by-row `DELETE` query.
- **Limitation:** This optimizes a single database server but does not solve the problem of write-intensive loads eventually overwhelming a single instance (vertical scaling limit).

**Phase 3: Long-Term Horizontal Scaling**
- **Strategy:** Migrate GPS data storage to a purpose-built **Time-Series Database** or a horizontally-scalable **NoSQL Database**.
- **Rationale:** When write throughput or advanced time-series analysis becomes the primary concern, a specialized database is required. GPS data (high-volume, simple schema, time-ordered) is a perfect fit for these systems.
- **Recommended Candidates:**
    - **Time-Series DB (e.g., InfluxDB, TimescaleDB):** The best fit. Purpose-built for this data type, offering superior compression, ingestion rates, and time-based analytical functions.
    - **Wide-Column Store (e.g., Apache Cassandra):** Excellent for extreme write loads and linear scalability. A data model partitioned by `vehicleId` and clustered by `recordedAt` would be highly effective.

---

## 3. API Design Decisions

### 3.1 RESTful Resource Naming

**Decision:** Standard REST conventions with nested routes where appropriate

**Routes (10 Modules):**
- `/api/products` - Master product data
- `/api/locations` - Hubs and terminals
- `/api/drivers` - Driver management + shifts/orders views
- `/api/vehicles` - Fleet vehicle registry
- `/api/inventory` - Location inventory levels
- `/api/allocations` - Vehicle-driver daily assignments
- `/api/shifts` - Shift scheduling and state management
- `/api/orders` - Order lifecycle management
- `/api/gps` - Vehicle location tracking
- `/api/fleet` - Real-time fleet dashboard APIs

**Nested Resources:**
- `GET /api/drivers/:id/orders` - Get orders for a driver
- `GET /api/drivers/:id/shifts` - Get shifts for a driver

---

### 3.2 Standard Response Format

**Decision:** Consistent JSON structure for all responses

```javascript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "field: message; field2: message2"
  }
}
```

**Response Helpers:**
```javascript
success(res, data, statusCode)  // 200 by default
created(res, data)              // 201 with data
noContent(res)                  // 204 empty
error(res, message, code)       // Error response
```

---

### 3.3 Action Endpoints: POST for State Transitions

**Decision:** Use POST for actions like start/complete/fail

| Endpoint | Purpose |
|----------|---------|
| `POST /api/shifts/schedule` | Schedule a future shift |
| `POST /api/shifts/start` | Start a shift |
| `POST /api/shifts/:id/end` | End a shift |
| `POST /api/orders/:id/assign` | Assign order to driver |
| `POST /api/orders/:id/start` | Driver starts delivery |
| `POST /api/orders/:id/complete` | Mark delivery complete |
| `POST /api/orders/:id/fail` | Mark delivery failed |

**Reasoning:**
- These are state transitions, not resource updates
- POST is appropriate for "process this action"
- Clearer semantics than PUT with partial data

---

### 3.4 Query Parameters for Filtering

**Decision:** Use query params for list filtering

**Examples:**
- `GET /api/orders?status=assigned`
- `GET /api/orders?assignedDriverId=xxx`
- `GET /api/allocations?date=2025-01-20`
- `GET /api/shifts?status=active`

**Reasoning:**
- Standard REST practice
- Flexible, combinable filters
- Single endpoint handles multiple use cases

---

## 4. Business Logic Decisions

### 4.1 Shift Lifecycle: Two-Phase Model

**Decision:** Support both planned and ad-hoc shift flows

**Flow 1: Planned (Driver-Initiated)**
```
Driver schedules availability (POST /api/shifts/schedule)
    ↓
Admin allocates vehicle (POST /api/allocations)
    ↓
Driver starts shift on the day (POST /api/shifts/start)
```

**Flow 2: Ad-hoc (Admin-Initiated)**
```
Admin allocates vehicle
    ↓
Driver starts shift (creates shift automatically)
```

**Key Rules:**
1. Shift CANNOT start without vehicle allocation
2. One shift per driver per day (enforced by business logic)
3. Pre-scheduling is optional but supports planning

---

### 4.2 Order Lifecycle: State Machine

**Decision:** Strict state transitions with validation

```
pending → assigned → in_progress → completed
                              ↘ failed (with reason)
```

**Transition Rules:**
| From | To | Condition |
|------|-----|-----------|
| pending | assigned | Admin assigns driver |
| assigned | in_progress | Driver has active shift |
| in_progress | completed | Driver confirms delivery |
| assigned/in_progress | failed | Driver reports failure with reason |

**Validation Pattern:**
```javascript
if (order.status !== 'assigned') {
  throw new ConflictError(`Cannot start: status is '${order.status}'`);
}
```

---

### 4.3 Inventory Updates: Transactional on Completion

**Decision:** Inventory changes only when order completes, using atomic transaction

```javascript
return prisma.$transaction(async (tx) => {
  // Atomically: update order + update attempt + upsert inventory
  const updatedOrder = await tx.order.update({ ... });
  await tx.orderAttempt.update({ ... });
  await tx.inventory.upsert({
    where: { locationId_productId: { ... } },
    update: { quantity: { increment: order.quantity } },
    create: { locationId, productId, quantity: order.quantity },
  });
  return updatedOrder;
});
```

**Behavior:**
- Complete order → Destination inventory += quantity
- Fail order → No inventory change
- All-or-nothing: if any step fails, entire transaction rolls back

---

### 4.4 Shift End: Block Until Orders Resolved

**Decision:** Strictly block shift end if incomplete orders exist

```javascript
const incompleteOrders = await prisma.order.findMany({
  where: {
    assignedDriverId: driverId,
    assignedDate: shift.shiftDate,
    status: { in: ['assigned', 'in_progress'] },
  },
});

if (incompleteOrders.length > 0) {
  throw new BadRequestError(
    `Cannot end shift: ${incompleteOrders.length} incomplete order(s). ` +
    `Mark them as completed or failed first.`
  );
}
```

**Rationale:**
- Ensures complete audit trail
- Forces driver accountability
- No "orphaned" orders in limbo
- Admin can see failed orders and reasons on dashboard

**Alternative Rejected:** Auto-fail orders on shift end
- Loses failure reason, removes driver accountability

---

### 4.5 GPS Tracking: Requires Active Shift

**Decision:** Reject GPS updates when no active shift exists

**Validation in gps.service.js:**
```javascript
const activeShift = await prisma.shift.findFirst({
  where: {
    vehicleAllocation: { vehicleId },
    status: 'active'
  }
});

if (!activeShift) {
  throw new BadRequestError('No active shift for this vehicle');
}
```

**Reasoning:**
- Keeps data clean and meaningful
- Only tracks work hours
- GPS data always has operational context

---

### 4.6 Allocation Conflict Prevention

**Decision:** Prevent updates/deletes when allocation has active shift

```javascript
// Check for active shift before modification
const activeShift = await prisma.shift.findFirst({
  where: {
    vehicleAllocationId: allocation.id,
    status: 'active'
  }
});

if (activeShift) {
  throw new ConflictError('Cannot modify: allocation has active shift');
}
```

---

## 5. Validation & Error Handling

### 5.1 Validation Strategy: Joi + Middleware

**Decision:** Three-layer validation approach

| Layer | Purpose | Example |
|-------|---------|---------|
| **Route** | `validate(schema)` middleware | Request shape validation |
| **Schema** | Joi rules in validator modules | Field-level constraints |
| **Service** | Business logic validation | State transitions, conflicts |

**Validation Options:**
```javascript
{
  abortEarly: false,    // Collect ALL errors
  stripUnknown: true,   // Remove extra fields
  convert: true         // Coerce types
}
```

---

### 5.2 Custom Error Classes

**Decision:** Semantic error classes mapped to HTTP status codes

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(message) { super(message, 404, 'NOT_FOUND'); }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400, 'VALIDATION_ERROR'); }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409, 'CONFLICT'); }
}

class BadRequestError extends AppError {
  constructor(message) { super(message, 400, 'BAD_REQUEST'); }
}
```

---

### 5.3 Prisma Error Mapping

**Decision:** Map Prisma errors to appropriate HTTP responses

| Prisma Code | HTTP Status | Meaning |
|-------------|-------------|---------|
| P2002 | 409 Conflict | Unique constraint violation |
| P2025 | 404 Not Found | Record not found |
| P2003 | 400 Bad Request | Foreign key constraint failed |

---

### 5.4 ID Parameter Coercion

**Decision:** Middleware to parse and validate ID parameters

```javascript
// parseId middleware
const parsed = parseInt(req.params[paramName], 10);
if (isNaN(parsed) || parsed < 1) {
  throw new BadRequestError(`Invalid ${paramName}`);
}
req.params[paramName] = parsed;
```

**Rationale:** Express provides params as strings; explicit parsing ensures type safety and provides clear validation errors.

---

## 6. Simplifications & Assumptions

### 6.1 Documented Assumptions

| Assumption | Reasoning |
|------------|-----------|
| Admin assigns orders that can be completed within a shift | Simplifies shift-end handling |
| One product per order | Simplifies order model |
| No source inventory tracking | Focus on destination per requirements |
| Orders follow FCFS within a shift | No priority system needed |
| Single timezone operation | Simplifies date handling |

---

### 6.2 Out of Scope (Per Assignment)

| Feature | Status |
|---------|--------|
| Authentication/Authorization | Stubbed - design recommendation provided |
| Real-time WebSocket connections | Not implemented |
| Geospatial calculations (routing, geofencing) | Not implemented |
| Message queue implementation | Not implemented |
| Mobile app | APIs only |
| Pagination | Not implemented |
| Rate limiting | Not implemented |

---

### 6.3 Authentication Recommendation (If Implementing)

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

## 7. Future Improvements

### 7.1 Performance

| Improvement | Benefit |
|-------------|---------|
| **Redis Caching** | Cache fleet status, reduce DB queries |
| **GPS Data Partitioning** | Partition by date for large datasets |
| **Batch GPS Inserts** | Buffer and batch-insert GPS updates |
| **Connection Pool Tuning** | Optimize Prisma connection settings |
| **Pagination** | Add `?limit=20&offset=0` for large lists |

---

### 7.2 Features

| Feature | Description |
|---------|-------------|
| **Source Inventory** | Track where fuel comes from |
| **Order Scheduling** | Assign orders to specific dates/times |
| **Vehicle Capacity Validation** | Ensure orders fit vehicle capacity |
| **Partial Deliveries** | Mark order as partially completed |
| **Multi-product Orders** | Multiple products per order |

---

### 7.3 Reliability

| Improvement | Benefit |
|-------------|---------|
| **Retry Logic** | For inventory updates |
| **Audit Logging** | Track all changes with user ID |
| **Soft Deletes** | Preserve deleted records for history |

---

### 7.4 Monitoring & Observability

| Improvement | Benefit |
|-------------|---------|
| **Structured Logging** | Winston/Pino with correlation IDs |
| **Metrics** | Track API latency, error rates |
| **Health Checks** | Detailed health endpoints |
| **Alerts** | Notify on inventory thresholds |

---

### 7.5 Code Quality

| Improvement | Benefit |
|-------------|---------|
| **Async Error Wrapper** | Eliminate try/catch in controllers |
| **Request Validation Types** | TypeScript or JSDoc for type safety |
| **Integration Tests** | Full workflow test coverage |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Initial | Express + Prisma + MySQL | Lightweight stack with good DX |
| Initial | Layered architecture | Separation of concerns, testability |
| Initial | Single locations table | Hubs and terminals share attributes |
| Initial | Orders independent of shifts | Reassignment and audit trail requirements |
| Initial | Day-level vehicle allocation | Per assignment requirement |
| Initial | Dual allocation constraints | Prevent double-booking |
| Initial | Destination-only inventory | Scope management |
| Initial | GPS requires active shift | Data quality and context |
| Initial | Block shift end with incomplete orders | Accountability and audit trail |
| Initial | Transactional inventory updates | ACID guarantees on completion |
| Initial | Auto-increment integer IDs | Performance and simplicity |
| Initial | Joi validation + middleware | Declarative, reusable validation |
| Initial | Custom error classes | Semantic HTTP status codes |
