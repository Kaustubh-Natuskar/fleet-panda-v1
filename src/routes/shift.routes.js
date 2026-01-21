const express = require('express');
const shiftController = require('../controllers/shift.controller');
const validate = require('../middleware/validate.middleware');
const { parseId, parseIds } = require('../middleware/parseId.middleware');
const shiftValidator = require('../validators/shift.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Shift:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         driverId:
 *           type: integer
 *           example: 1
 *         vehicleAllocationId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         shiftDate:
 *           type: string
 *           format: date
 *           example: '2026-01-21'
 *         status:
 *           type: string
 *           enum: [scheduled, active, completed]
 *           example: active
 *         startTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         endTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         driver:
 *           $ref: '#/components/schemas/Driver'
 *         vehicleAllocation:
 *           $ref: '#/components/schemas/Allocation'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: Get all shifts
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, completed]
 *         description: Filter by shift status
 *     responses:
 *       200:
 *         description: List of shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shift'
 */
router.get('/', shiftController.getAll);

/**
 * @swagger
 * /api/shifts/{id}:
 *   get:
 *     summary: Get shift by ID
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Shift found with order details
 *       404:
 *         description: Shift not found
 */
router.get('/:id', parseId(), shiftController.getById);

/**
 * @swagger
 * /api/shifts/driver/{driverId}:
 *   get:
 *     summary: Get shifts for a specific driver
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, completed]
 *     responses:
 *       200:
 *         description: List of driver's shifts
 *       404:
 *         description: Driver not found
 */
router.get('/driver/:driverId', parseIds('driverId'), shiftController.getByDriver);

/**
 * @swagger
 * /api/shifts/schedule:
 *   post:
 *     summary: Schedule a future shift (driver declares availability)
 *     description: |
 *       Driver schedules themselves for a future date.
 *       - Does NOT require vehicle allocation (admin allocates later)
 *       - One shift per driver per day
 *       - Date must be today or future
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - shiftDate
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *               shiftDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-01-25'
 *     responses:
 *       201:
 *         description: Shift scheduled
 *       400:
 *         description: Validation error or past date
 *       404:
 *         description: Driver not found
 *       409:
 *         description: Driver already has shift on this date
 */
router.post('/schedule', validate(shiftValidator.schedule), shiftController.schedule);

/**
 * @swagger
 * /api/shifts/start:
 *   post:
 *     summary: Start a shift (driver clocks in)
 *     description: |
 *       Driver starts their shift for today.
 *       - Requires: vehicle allocated to driver for today
 *       - If pre-scheduled shift exists: activates it
 *       - If no shift exists: creates ad-hoc shift
 *       - Driver can only have one active shift at a time
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Shift started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Shift'
 *       400:
 *         description: No vehicle allocated for today
 *       404:
 *         description: Driver not found
 *       409:
 *         description: Driver already has active shift
 */
router.post('/start', validate(shiftValidator.start), shiftController.start);

/**
 * @swagger
 * /api/shifts/{id}/end:
 *   post:
 *     summary: End a shift (driver clocks out)
 *     description: |
 *       Driver ends their active shift.
 *       - **BLOCKED** if there are incomplete orders (assigned or in_progress)
 *       - Driver must complete or fail all orders before ending shift
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Shift ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Shift ended
 *       400:
 *         description: |
 *           Cannot end shift because:
 *           - Shift is not active
 *           - Driver has incomplete orders (must complete/fail them first)
 *       404:
 *         description: Shift not found
 */
router.post('/:id/end', parseId(), validate(shiftValidator.end), shiftController.end);

module.exports = router;
