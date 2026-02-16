# Project Introduction

- What is FuelPanda: fleet tracking for fuel logistics
- Daily flow: allocate vehicle → start shift → deliver orders → track GPS
- Tech stack

# Data model, Schema & Vehicle allocation

- Master data Vs Operational data
- Vehicle allocation: one vehicle per driver per day, one driver per vehicle per day

# Order Lifecycle

- State machine statuses
- completeOrder validations:
- Transaction explaination
- Why transaction? All succeed or all fail → no inconsistent state
- Why upsert? First delivery to location → create record
- MySQL isolation: REPEATABLE READ (default) → consistent snapshot
- failOrder: does NOT update inventory, requires failure reason
- OrderAttempt table: audit trail, supports retry/reassignment

# SHIFT MANAGEMENT

- Cannot START shift without allocation for today
- Cannot END shift with incomplete orders
- Query orders with status IN ('assigned', 'in_progress')
- Why not auto-fail? Loses failure reason, loses accountability
- Limitation: phone dies → need another device
- Production fix: admin override, auto-timeout with system reason

# CODE QUALITY / LIMITATIONS

- DRY violation: try-catch in every controller → asyncHandler wrapper
- Hardcoded statuses → extract to constants/enums
- No pagination → will break with large datasets
- No rate limiting → especially for GPS endpoint
- No soft deletes → audit compliance issue

# Future scope

- GPS at scale: Kafka for ingestion → buffer, backpressure, replay
- Order/Inventory split: event-driven, eventual consistency
- Why not split now? Distributed monolith is worse
- Read replicas: fleet dashboard reads → replica, writes → primary
- Principle: simple until there's a reason to add complexity
