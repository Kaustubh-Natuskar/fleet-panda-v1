const express = require('express');
const gpsController = require('../controllers/gps.controller');
const validate = require('../middleware/validate.middleware');
const { parseIds } = require('../middleware/parseId.middleware');
const gpsValidator = require('../validators/gps.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GpsLocation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         vehicleId:
 *           type: integer
 *           example: 1
 *         shiftId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         latitude:
 *           type: number
 *           example: 29.7604
 *         longitude:
 *           type: number
 *           example: -95.3698
 *         recordedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         vehicle:
 *           $ref: '#/components/schemas/Vehicle'
 *         shift:
 *           $ref: '#/components/schemas/Shift'
 */

/**
 * @swagger
 * /api/gps:
 *   post:
 *     summary: Record GPS location for a vehicle
 *     description: |
 *       Records a GPS ping from a vehicle.
 *       - **Requires**: Vehicle must have an active shift
 *       - Automatically links to the current shift
 *       - Optional `recordedAt` timestamp (defaults to now)
 *     tags: [GPS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - latitude
 *               - longitude
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 example: 1
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 29.7604
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -95.3698
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional - defaults to current time
 *     responses:
 *       201:
 *         description: GPS location recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GpsLocation'
 *       400:
 *         description: Vehicle does not have an active shift
 *       404:
 *         description: Vehicle not found
 */
router.post('/', validate(gpsValidator.create), gpsController.create);

/**
 * @swagger
 * /api/gps/vehicle/{vehicleId}:
 *   get:
 *     summary: Get GPS history for a vehicle
 *     tags: [GPS]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of time range
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of time range
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Max records to return
 *     responses:
 *       200:
 *         description: GPS location history
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
 *                     $ref: '#/components/schemas/GpsLocation'
 *       404:
 *         description: Vehicle not found
 */
router.get('/vehicle/:vehicleId', parseIds('vehicleId'), validate(gpsValidator.getByVehicle), gpsController.getByVehicle);

/**
 * @swagger
 * /api/gps/driver/{driverId}:
 *   get:
 *     summary: Get GPS history for a driver
 *     description: Returns GPS updates from all shifts this driver has worked
 *     tags: [GPS]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *     responses:
 *       200:
 *         description: GPS location history for driver's shifts
 *       404:
 *         description: Driver not found
 */
router.get('/driver/:driverId', parseIds('driverId'), validate(gpsValidator.getByDriver), gpsController.getByDriver);

module.exports = router;
