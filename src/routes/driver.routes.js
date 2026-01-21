const express = require('express');
const driverController = require('../controllers/driver.controller');
const validate = require('../middleware/validate.middleware');
const { parseId } = require('../middleware/parseId.middleware');
const driverValidator = require('../validators/driver.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Driver:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: John Smith
 *         phone:
 *           type: string
 *           example: 555-0101
 *         email:
 *           type: string
 *           example: john.smith@fuelpanda.com
 *         licenseNumber:
 *           type: string
 *           example: TX-CDL-001
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Drivers]
 *     responses:
 *       200:
 *         description: List of all drivers
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
 *                     $ref: '#/components/schemas/Driver'
 */
router.get('/', driverController.getAll);

/**
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Driver found
 *       404:
 *         description: Driver not found
 */
router.get('/:id', parseId(), driverController.getById);

/**
 * @swagger
 * /api/drivers/{id}/shifts:
 *   get:
 *     summary: Get all shifts for a driver (past, present, future)
 *     description: Returns shifts with vehicle and order details. Useful for driver's calendar view.
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Driver ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, completed]
 *         description: Filter by shift status
 *     responses:
 *       200:
 *         description: List of shifts with vehicle and order details
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       shiftDate:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       vehicle:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           registrationNumber:
 *                             type: string
 *                           capacityGallons:
 *                             type: integer
 *                       orders:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             destination:
 *                               type: object
 *                             product:
 *                               type: object
 *                             quantityGallons:
 *                               type: number
 *                             status:
 *                               type: string
 *                             failureReason:
 *                               type: string
 *       404:
 *         description: Driver not found
 */
router.get('/:id/shifts', parseId(), driverController.getShifts);

/**
 * @swagger
 * /api/drivers/{id}/orders:
 *   get:
 *     summary: Get orders assigned to a driver
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, failed]
 *     responses:
 *       200:
 *         description: List of orders
 *       404:
 *         description: Driver not found
 */
router.get('/:id/orders', parseId(), driverController.getOrders);

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Create a new driver
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               phone:
 *                 type: string
 *                 example: 555-0199
 *               email:
 *                 type: string
 *                 example: jane.doe@fuelpanda.com
 *               licenseNumber:
 *                 type: string
 *                 example: TX-CDL-099
 *     responses:
 *       201:
 *         description: Driver created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/', validate(driverValidator.create), driverController.create);

/**
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     summary: Update a driver
 *     tags: [Drivers]
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
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver updated
 *       404:
 *         description: Driver not found
 */
router.put('/:id', parseId(), validate(driverValidator.update), driverController.update);

/**
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     summary: Delete a driver
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Driver deleted
 *       404:
 *         description: Driver not found
 *       409:
 *         description: Driver has allocations or orders
 */
router.delete('/:id', parseId(), driverController.remove);

module.exports = router;
