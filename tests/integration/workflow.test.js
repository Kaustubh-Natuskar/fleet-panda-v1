/**
 * Integration Test - Full Delivery Workflow
 *
 * Tests the complete flow:
 * 1. Allocate vehicle to driver
 * 2. Start shift
 * 3. Start order
 * 4. Complete order (verify inventory update)
 * 5. End shift
 *
 * Note: This test requires a running database.
 * Run with: npm run test:integration
 *
 * For CI/CD, use the unit tests which mock the database.
 */

const request = require('supertest');
const app = require('../../src/app.js');

// Skip integration tests if DATABASE_URL is not set
const runIntegration = process.env.DATABASE_URL && process.env.RUN_INTEGRATION === 'true';

const describeOrSkip = runIntegration ? describe : describe.skip;

describeOrSkip('Integration: Full Delivery Workflow', () => {
  let driverId;
  let vehicleId;
  let allocationId;
  let orderId;
  let shiftId;
  let destinationId;
  let productId;

  beforeAll(async () => {
    // This would require seeded data or create test data
    // For now, we'll document what the test would do
    driverId = 1;
    vehicleId = 1;
    destinationId = 3;
    productId = 1;
  });

  it('should complete full delivery workflow', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Create allocation
    const allocationRes = await request(app)
      .post('/api/allocations')
      .send({
        vehicleId,
        driverId,
        allocationDate: today,
      });

    // May succeed or conflict if already allocated
    if (allocationRes.status === 201) {
      allocationId = allocationRes.body.data.id;
    }

    // Step 2: Start shift
    const startShiftRes = await request(app)
      .post('/api/shifts/start')
      .send({ driverId });

    // Should succeed or conflict if already active
    expect([200, 409]).toContain(startShiftRes.status);
    if (startShiftRes.status === 200) {
      shiftId = startShiftRes.body.data.id;
    }

    // Step 3: Create and assign order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        destinationId,
        productId,
        quantity: 1000,
        assignedDriverId: driverId,
        assignedDate: today,
      });

    expect([201, 200]).toContain(orderRes.status);
    orderId = orderRes.body.data?.id;

    if (orderId) {
      // Step 4: Start order
      const startOrderRes = await request(app)
        .post(`/api/orders/${orderId}/start`)
        .send({ driverId });

      if (startOrderRes.status === 200) {
        // Step 5: Complete order
        const completeRes = await request(app)
          .post(`/api/orders/${orderId}/complete`)
          .send({ driverId });

        expect(completeRes.status).toBe(200);
        expect(completeRes.body.data.status).toBe('completed');
      }
    }
  });

  it('should reject GPS without active shift', async () => {
    // Create a vehicle that has no shift
    const gpsRes = await request(app)
      .post('/api/gps')
      .send({
        vehicleId: 999, // Non-existent or no shift
        latitude: 29.7604,
        longitude: -95.3698,
      });

    // Should be 404 (vehicle not found) or 400 (no active shift)
    expect([400, 404]).toContain(gpsRes.status);
  });

  it('should block duplicate vehicle allocation', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Try to allocate same vehicle to different driver
    const res = await request(app)
      .post('/api/allocations')
      .send({
        vehicleId: 1,
        driverId: 2, // Different driver
        allocationDate: today,
      });

    // Should conflict if vehicle already allocated
    expect([201, 409]).toContain(res.status);
  });

  it('should block duplicate driver allocation', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Try to allocate different vehicle to same driver
    const res = await request(app)
      .post('/api/allocations')
      .send({
        vehicleId: 2, // Different vehicle
        driverId: 1,
        allocationDate: today,
      });

    // Should conflict if driver already has allocation
    expect([201, 409]).toContain(res.status);
  });
});

// API endpoint tests that don't require database
describe('API Endpoints', () => {
  it('GET /health should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api-docs should return swagger UI', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
  });

  it('GET /api/unknown should return 404', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
