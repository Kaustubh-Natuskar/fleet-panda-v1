# Fleet Tracking API

Real-time fleet, driver, and delivery tracking platform for FuelPanda fuel logistics operations.

## Live Demo (AWS Lightsail)

[http://65.2.172.118:3000/](http://65.2.172.118:3000/)

## Features

- **Vehicle Management**: Track and manage fuel tanker fleet
- **Driver Management**: Manage drivers and their assignments
- **Vehicle Allocation**: Assign vehicles to drivers with blocking mechanism (one vehicle per driver per day)
- **Shift Management**: Track driver shifts with start/end times and order completion requirements
- **Order Management**: Full delivery lifecycle (create → assign → start → complete/fail)
- **GPS Tracking**: Real-time vehicle location updates (requires active shift)
- **Inventory Management**: Automatic inventory updates on delivery completion
- **Real-time Dashboard**: Fleet status API for monitoring

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### One-Command Setup

```bash
# Clone and start
docker-compose up -d

# Wait for MySQL to be healthy (~30 seconds), then run migrations
docker-compose exec app npx prisma db push

# Seed sample data
docker-compose exec app npx prisma db seed

# View logs
docker-compose logs -f app
```

### Access Points

| Service            | URL                           |
| ------------------ | ----------------------------- |
| API                | http://base-url:3000          |
| API Docs (Swagger) | http://base-url:3000/api-docs |
| Health Check       | http://base-url:3000/health   |

## API Overview

### Master Data (Admin)

- `GET/POST /api/products` - Fuel products
- `GET/POST /api/locations` - Hubs & terminals
- `GET/POST /api/drivers` - Driver management
- `GET/POST /api/vehicles` - Fleet vehicles
- `GET/POST /api/inventory` - Fuel inventory

### Operations (Admin)

- `GET/POST /api/allocations` - Vehicle-driver assignments
- `GET /api/allocations/available-vehicles?date=YYYY-MM-DD` - Available vehicles
- `GET/POST /api/orders` - Delivery orders
- `POST /api/orders/:id/assign` - Assign order to driver

### Driver Operations

- `POST /api/shifts/schedule` - Schedule future availability
- `POST /api/shifts/start` - Start shift (requires allocation)
- `POST /api/shifts/:id/end` - End shift (requires all orders completed/failed)
- `POST /api/orders/:id/start` - Start delivery
- `POST /api/orders/:id/complete` - Complete delivery (updates inventory)
- `POST /api/orders/:id/fail` - Fail delivery with reason
- `GET /api/drivers/:id/shifts` - View shifts with orders

### Tracking

- `POST /api/gps` - Record vehicle location (requires active shift)
- `GET /api/gps/vehicle/:id` - Vehicle location history
- `GET /api/fleet/status` - Real-time fleet status
- `GET /api/fleet/summary` - Fleet statistics

## Business Rules

### Vehicle Allocation

- A vehicle can only be allocated to **one driver per day**
- A driver can only have **one vehicle per day**
- Concurrent allocation attempts are handled with 409 Conflict response

### Shift Lifecycle

```
Driver schedules shift (optional)
        ↓
Admin allocates vehicle to driver
        ↓
Driver starts shift (requires allocation)
        ↓
Driver works on orders
        ↓
Driver completes/fails ALL orders
        ↓
Driver ends shift
```

### Order Lifecycle

```
pending → assigned → in_progress → completed
                               ↘→ failed
```

- **Complete**: Automatically increases destination inventory
- **Failed**: Does NOT affect inventory, requires failure reason

### GPS Tracking

- GPS updates are **rejected** if vehicle has no active shift
- Ensures location data is meaningful and tied to operational activity

## Typical Workflow

```bash
# 1. Admin allocates vehicle to driver for today
curl -X POST http://base-url:3000/api/allocations \
  -H "Content-Type: application/json" \
  -d '{"vehicleId": 1, "driverId": 1, "allocationDate": "2026-01-21"}'

# 2. Admin creates order and assigns to driver
curl -X POST http://base-url:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"destinationId": 3, "productId": 1, "quantity": 5000, "assignedDriverId": 1, "assignedDate": "2026-01-21"}'

# 3. Driver starts shift
curl -X POST http://base-url:3000/api/shifts/start \
  -H "Content-Type: application/json" \
  -d '{"driverId": 1}'

# 4. Driver starts order
curl -X POST http://base-url:3000/api/orders/1/start \
  -H "Content-Type: application/json" \
  -d '{"driverId": 1}'

# 5. Driver completes order
curl -X POST http://base-url:3000/api/orders/1/complete \
  -H "Content-Type: application/json" \
  -d '{"driverId": 1}'

# 6. Driver ends shift
curl -X POST http://base-url:3000/api/shifts/1/end \
  -H "Content-Type: application/json" \
  -d '{"driverId": 1}'
```

## Development

### Local Setup (without Docker)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Run migrations
npx prisma migrate dev

# Seed data
npx prisma db seed

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm test -- --coverage
```

### Project Structure

```
├── src/
│   ├── config/         # Swagger config
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Error handling, validation
│   ├── routes/         # API routes with Swagger docs
│   ├── services/       # Business logic
│   ├── utils/          # Prisma client, errors, response helpers
│   ├── validators/     # Joi schemas
│   ├── app.js          # Express app
│   └── server.js       # Server entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.js         # Sample data
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── init-db/            # MySQL init scripts
├── docs/               # Additional documentation
└── docker-compose.yml
```

## API Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

## Status Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 200  | Success                                    |
| 201  | Created                                    |
| 204  | Deleted (no content)                       |
| 400  | Validation error / Bad request             |
| 404  | Not found                                  |
| 409  | Conflict (duplicate, constraint violation) |
| 500  | Server error                               |
