const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const validate = require('../middleware/validate.middleware');
const { parseId } = require('../middleware/parseId.middleware');
const vehicleValidator = require('../validators/vehicle.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         registrationNumber:
 *           type: string
 *           example: TX-FP-001
 *         capacityGallons:
 *           type: integer
 *           example: 8000
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: List of all vehicles
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
router.get('/', vehicleController.getAll);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vehicle found
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', parseId(), vehicleController.getById);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registrationNumber
 *             properties:
 *               registrationNumber:
 *                 type: string
 *                 example: TX-FP-005
 *               capacityGallons:
 *                 type: integer
 *                 example: 10000
 *     responses:
 *       201:
 *         description: Vehicle created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Registration number already exists
 */
router.post('/', validate(vehicleValidator.create), vehicleController.create);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update a vehicle
 *     tags: [Vehicles]
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
 *               registrationNumber:
 *                 type: string
 *               capacityGallons:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Vehicle updated
 *       404:
 *         description: Vehicle not found
 */
router.put('/:id', parseId(), validate(vehicleValidator.update), vehicleController.update);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Vehicle deleted
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Vehicle has allocations
 */
router.delete('/:id', parseId(), vehicleController.remove);

module.exports = router;
