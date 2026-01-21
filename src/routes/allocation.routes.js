const express = require('express');
const allocationController = require('../controllers/allocation.controller');
const validate = require('../middleware/validate.middleware');
const { parseId } = require('../middleware/parseId.middleware');
const allocationValidator = require('../validators/allocation.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Allocation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         vehicleId:
 *           type: integer
 *           example: 1
 *         driverId:
 *           type: integer
 *           example: 1
 *         allocationDate:
 *           type: string
 *           format: date
 *           example: '2026-01-21'
 *         vehicle:
 *           $ref: '#/components/schemas/Vehicle'
 *         driver:
 *           $ref: '#/components/schemas/Driver'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/allocations:
 *   get:
 *     summary: Get all vehicle allocations
 *     tags: [Allocations]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by allocation date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of allocations
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
 *                     $ref: '#/components/schemas/Allocation'
 */
router.get('/', validate(allocationValidator.getByDate), allocationController.getAll);

/**
 * @swagger
 * /api/allocations/available-vehicles:
 *   get:
 *     summary: Get vehicles available for allocation on a date
 *     description: Returns vehicles that are NOT already allocated on the specified date
 *     tags: [Allocations]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of available vehicles
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
 *                     $ref: '#/components/schemas/Vehicle'
 */
router.get(
  '/available-vehicles',
  validate(allocationValidator.getAvailableVehicles),
  allocationController.getAvailableVehicles
);

/**
 * @swagger
 * /api/allocations/{id}:
 *   get:
 *     summary: Get allocation by ID
 *     tags: [Allocations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Allocation found
 *       404:
 *         description: Allocation not found
 */
router.get('/:id', parseId(), allocationController.getById);

/**
 * @swagger
 * /api/allocations:
 *   post:
 *     summary: Allocate a vehicle to a driver for a day
 *     description: |
 *       Assigns a vehicle to a driver for a specific date.
 *       - Vehicle can only be allocated once per day (blocking mechanism)
 *       - Date must be today or in the future
 *       - Concurrent requests for same vehicle/date will fail with 409 Conflict
 *     tags: [Allocations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - driverId
 *               - allocationDate
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 example: 1
 *               driverId:
 *                 type: integer
 *                 example: 1
 *               allocationDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-01-21'
 *     responses:
 *       201:
 *         description: Allocation created
 *       400:
 *         description: Validation error or past date
 *       404:
 *         description: Vehicle or driver not found
 *       409:
 *         description: Vehicle already allocated for this date
 */
router.post('/', validate(allocationValidator.create), allocationController.create);

/**
 * @swagger
 * /api/allocations/{id}:
 *   put:
 *     summary: Update an allocation
 *     description: Cannot update if there's an active shift using this allocation
 *     tags: [Allocations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleId:
 *                 type: integer
 *               driverId:
 *                 type: integer
 *               allocationDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Allocation updated
 *       404:
 *         description: Allocation not found
 *       409:
 *         description: Active shift exists or vehicle already allocated
 */
router.put('/:id', parseId(), validate(allocationValidator.update), allocationController.update);

/**
 * @swagger
 * /api/allocations/{id}:
 *   delete:
 *     summary: Delete an allocation
 *     description: Cannot delete if shifts exist for this allocation
 *     tags: [Allocations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Allocation deleted
 *       404:
 *         description: Allocation not found
 *       409:
 *         description: Allocation has associated shifts
 */
router.delete('/:id', parseId(), allocationController.remove);

module.exports = router;
