'use strict';

const express = require('express');
const fleetController = require('../controllers/fleet.controller');

const router = express.Router();

/**
 * @swagger
 * /api/fleet/status:
 *   get:
 *     summary: Get real-time fleet status
 *     description: |
 *       Returns all active vehicles with:
 *       - Driver information
 *       - Latest GPS location
 *       - Current orders (assigned/in_progress)
 *       
 *       Perfect for admin dashboard real-time monitoring.
 *     tags: [Fleet]
 *     responses:
 *       200:
 *         description: Real-time fleet status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vehicle:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           registrationNumber:
 *                             type: string
 *                           capacityGallons:
 *                             type: integer
 *                       driver:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                       shift:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                       location:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           recordedAt:
 *                             type: string
 *                             format: date-time
 *                       currentOrders:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             destination:
 *                               type: string
 *                             product:
 *                               type: string
 *                             quantity:
 *                               type: number
 *                             status:
 *                               type: string
 */
router.get('/status', fleetController.getStatus);

/**
 * @swagger
 * /api/fleet/summary:
 *   get:
 *     summary: Get fleet summary statistics
 *     description: High-level metrics for dashboard cards
 *     tags: [Fleet]
 *     responses:
 *       200:
 *         description: Fleet summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalVehicles:
 *                       type: integer
 *                       example: 4
 *                     totalDrivers:
 *                       type: integer
 *                       example: 3
 *                     activeShifts:
 *                       type: integer
 *                       example: 2
 *                     todayOrders:
 *                       type: integer
 *                       example: 5
 *                     completedToday:
 *                       type: integer
 *                       example: 3
 *                     inProgressOrders:
 *                       type: integer
 *                       example: 1
 *                     vehicleUtilization:
 *                       type: integer
 *                       description: Percentage of vehicles in use
 *                       example: 50
 */
router.get('/summary', fleetController.getSummary);

module.exports = router;
