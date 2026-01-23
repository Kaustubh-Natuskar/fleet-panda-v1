# Entity Relationship Diagram

## Visual Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      products       │       │      locations      │
├─────────────────────┤       ├─────────────────────┤
│ PK id            INT│       │ PK id            INT│
│    name    VARCHAR  │       │    name    VARCHAR  │
│    createdAt    DT  │       │    type       ENUM  │
│    updatedAt    DT  │       │    address VARCHAR  │
└─────────┬───────────┘       │    latitude  FLOAT  │
          │                   │    longitude FLOAT  │
          │                   │    createdAt    DT  │
          │                   │    updatedAt    DT  │
          │                   └─────────┬───────────┘
          │                             │
          │    ┌────────────────────────┤
          │    │                        │
          ▼    ▼                        ▼
┌─────────────────────┐       ┌─────────────────────┐
│    inventories      │       │       orders        │
├─────────────────────┤       ├─────────────────────┤
│ PK id            INT│       │ PK id            INT│
│ FK locationId    INT│───┐   │ FK destinationId INT│───┐
│ FK productId     INT│─┐ │   │ FK productId     INT│─┐ │
│    quantity    FLOAT│ │ │   │    quantity    FLOAT│ │ │
│    createdAt     DT │ │ │   │    status       ENUM│ │ │
│    updatedAt     DT │ │ │   │ FK assignedDriverId │ │ │
├─────────────────────┤ │ │   │    assignedDate DATE│ │ │
│ UQ(locationId,      │ │ │   │    createdAt     DT │ │ │
│    productId)       │ │ │   │    updatedAt     DT │ │ │
└─────────────────────┘ │ │   ├─────────────────────┤ │ │
          ▲             │ │   │ IX(assignedDriverId,│ │ │
          │             │ │   │    status)          │ │ │
          │             │ │   │ IX(assignedDate)    │ │ │
          └─────────────┘ │   └──────────┬──────────┘ │ │
                          │              │            │ │
          ┌───────────────┘              │            │ │
          │                              │            │ │
          │   ┌──────────────────────────┘            │ │
          │   │   ┌───────────────────────────────────┘ │
          │   │   │                                     │
          │   │   │   ┌─────────────────────────────────┘
          │   │   │   │
          ▼   │   ▼   ▼
┌─────────────────────┐       ┌─────────────────────┐
│      drivers        │       │      vehicles       │
├─────────────────────┤       ├─────────────────────┤
│ PK id            INT│       │ PK id            INT│
│    name    VARCHAR  │       │    registrationNum  │
│    phone   VARCHAR  │       │           VARCHAR   │
│    email   VARCHAR  │       │    capacityGallons  │
│ UQ licenseNumber    │       │              INT    │
│           VARCHAR   │       │    createdAt    DT  │
│    createdAt    DT  │       │    updatedAt    DT  │
│    updatedAt    DT  │       └─────────┬───────────┘
└─────────┬───────────┘                 │
          │                             │
          │    ┌────────────────────────┘
          │    │
          ▼    ▼
┌─────────────────────────────┐
│    vehicle_allocations      │
├─────────────────────────────┤
│ PK id                    INT│
│ FK vehicleId             INT│
│ FK driverId              INT│
│    allocationDate       DATE│
│    createdAt              DT│
│    updatedAt              DT│
├─────────────────────────────┤
│ UQ(vehicleId, allocationDate)│
│ UQ(driverId, allocationDate) │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│          shifts             │
├─────────────────────────────┤
│ PK id                    INT│
│ FK driverId              INT│──────────────┐
│ FK vehicleAllocationId   INT│ (nullable)   │
│    shiftDate            DATE│              │
│    status               ENUM│              │
│    startTime              DT│ (nullable)   │
│    endTime                DT│ (nullable)   │
│    createdAt              DT│              │
│    updatedAt              DT│              │
├─────────────────────────────┤              │
│ UQ(driverId, shiftDate)     │              │
└─────────────┬───────────────┘              │
              │                              │
      ┌───────┴───────┐                      │
      │               │                      │
      ▼               ▼                      │
┌───────────────┐  ┌─────────────────────┐   │
│ order_attempts│  │    gps_locations    │   │
├───────────────┤  ├─────────────────────┤   │
│ PK id      INT│  │ PK id            INT│   │
│ FK orderId INT│  │ FK vehicleId     INT│───┼───┐
│ FK shiftId INT│  │ FK shiftId       INT│   │   │
│    status ENUM│  │    latitude    FLOAT│   │   │
│ failureReason │  │    longitude   FLOAT│   │   │
│       VARCHAR │  │    recordedAt     DT│   │   │
│ completedAt DT│  │    createdAt      DT│   │   │
│ createdAt   DT│  ├─────────────────────┤   │   │
└───────────────┘  │ IX(vehicleId,       │   │   │
                   │    recordedAt)      │   │   │
                   │ IX(shiftId)         │   │   │
                   └─────────────────────┘   │   │
                              ▲              │   │
                              │              │   │
                              └──────────────┘   │
                                                 │
                   To vehicles ──────────────────┘
```

---

## Table Definitions

### 1. products

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** PRIMARY KEY (id), UNIQUE (name)

**Referenced by:** inventories.productId, orders.productId

---

### 2. locations

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(200) | NOT NULL |
| type | ENUM('hub', 'terminal') | NOT NULL |
| address | VARCHAR(500) | NULL |
| latitude | DOUBLE | NULL |
| longitude | DOUBLE | NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** PRIMARY KEY (id)

**Referenced by:** inventories.locationId, orders.destinationId

---

### 3. drivers

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| name | VARCHAR(200) | NOT NULL |
| phone | VARCHAR(20) | NULL |
| email | VARCHAR(200) | NULL |
| licenseNumber | VARCHAR(50) | NULL, UNIQUE |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** PRIMARY KEY (id), UNIQUE (licenseNumber)

**Referenced by:** vehicle_allocations.driverId, shifts.driverId, orders.assignedDriverId

---

### 4. vehicles

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| registrationNumber | VARCHAR(50) | NOT NULL, UNIQUE |
| capacityGallons | INT | NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** PRIMARY KEY (id), UNIQUE (registrationNumber)

**Referenced by:** vehicle_allocations.vehicleId, gps_locations.vehicleId

---

### 5. inventories

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| locationId | INT | NOT NULL, FOREIGN KEY |
| productId | INT | NOT NULL, FOREIGN KEY |
| quantity | DOUBLE | DEFAULT 0 |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:** 
- PRIMARY KEY (id)
- UNIQUE (locationId, productId)

**Foreign Keys:**
- locationId → locations(id)
- productId → products(id)

---

### 6. vehicle_allocations

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| vehicleId | INT | NOT NULL, FOREIGN KEY |
| driverId | INT | NOT NULL, FOREIGN KEY |
| allocationDate | DATE | NOT NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (vehicleId, allocationDate) — *Vehicle can't be double-booked*
- UNIQUE (driverId, allocationDate) — *Driver can't have two vehicles*

**Foreign Keys:**
- vehicleId → vehicles(id)
- driverId → drivers(id)

**Referenced by:** shifts.vehicleAllocationId

---

### 7. shifts

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| driverId | INT | NOT NULL, FOREIGN KEY |
| vehicleAllocationId | INT | NULL, FOREIGN KEY |
| shiftDate | DATE | NOT NULL |
| status | ENUM('scheduled', 'active', 'completed') | DEFAULT 'scheduled' |
| startTime | DATETIME(3) | NULL |
| endTime | DATETIME(3) | NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (driverId, shiftDate) — *One shift per driver per day*

**Foreign Keys:**
- driverId → drivers(id)
- vehicleAllocationId → vehicle_allocations(id) — *nullable*

**Referenced by:** order_attempts.shiftId, gps_locations.shiftId

---

### 8. orders

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| destinationId | INT | NOT NULL, FOREIGN KEY |
| productId | INT | NOT NULL, FOREIGN KEY |
| quantity | DOUBLE | NOT NULL |
| status | ENUM('pending', 'assigned', 'in_progress', 'completed', 'failed') | DEFAULT 'pending' |
| assignedDriverId | INT | NULL, FOREIGN KEY |
| assignedDate | DATE | NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| updatedAt | DATETIME(3) | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (assignedDriverId, status)
- INDEX (assignedDate)

**Foreign Keys:**
- destinationId → locations(id)
- productId → products(id)
- assignedDriverId → drivers(id)

**Referenced by:** order_attempts.orderId

---

### 9. order_attempts

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| orderId | INT | NOT NULL, FOREIGN KEY |
| shiftId | INT | NOT NULL, FOREIGN KEY |
| status | ENUM('in_progress', 'completed', 'failed') | NOT NULL |
| failureReason | VARCHAR(500) | NULL |
| completedAt | DATETIME(3) | NULL |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |

**Indexes:** PRIMARY KEY (id)

**Foreign Keys:**
- orderId → orders(id)
- shiftId → shifts(id)

---

### 10. gps_locations

| Column | Data Type | Constraints |
|--------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT |
| vehicleId | INT | NOT NULL, FOREIGN KEY |
| shiftId | INT | NULL, FOREIGN KEY |
| latitude | DOUBLE | NOT NULL |
| longitude | DOUBLE | NOT NULL |
| recordedAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |
| createdAt | DATETIME(3) | DEFAULT CURRENT_TIMESTAMP |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (vehicleId, recordedAt)
- INDEX (shiftId)

**Foreign Keys:**
- vehicleId → vehicles(id)
- shiftId → shifts(id) — *nullable*

---

## Relationships Summary

| Parent Table | Child Table | FK Column | Cardinality | Nullable |
|-------------|-------------|-----------|-------------|----------|
| products | inventories | productId | 1:N | No |
| products | orders | productId | 1:N | No |
| locations | inventories | locationId | 1:N | No |
| locations | orders | destinationId | 1:N | No |
| drivers | vehicle_allocations | driverId | 1:N | No |
| drivers | shifts | driverId | 1:N | No |
| drivers | orders | assignedDriverId | 1:N | Yes |
| vehicles | vehicle_allocations | vehicleId | 1:N | No |
| vehicles | gps_locations | vehicleId | 1:N | No |
| vehicle_allocations | shifts | vehicleAllocationId | 1:N | Yes |
| shifts | order_attempts | shiftId | 1:N | No |
| shifts | gps_locations | shiftId | 1:N | Yes |
| orders | order_attempts | orderId | 1:N | No |

---

## Unique Constraints (Business Rules)

| Table | Constraint | Purpose |
|-------|------------|---------|
| products | UNIQUE(name) | No duplicate product names |
| drivers | UNIQUE(licenseNumber) | No duplicate licenses |
| vehicles | UNIQUE(registrationNumber) | No duplicate registrations |
| inventories | UNIQUE(locationId, productId) | One inventory record per location-product |
| vehicle_allocations | UNIQUE(vehicleId, allocationDate) | Vehicle allocated once per day |
| vehicle_allocations | UNIQUE(driverId, allocationDate) | Driver gets one vehicle per day |
| shifts | UNIQUE(driverId, shiftDate) | One shift per driver per day |
