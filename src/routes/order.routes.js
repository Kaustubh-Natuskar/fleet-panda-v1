'use strict';

const express = require('express');
const orderController = require('../controllers/order.controller');
const validate = require('../middleware/validate.middleware');
const { parseId, parseIds } = require('../middleware/parseId.middleware');
const orderValidator = require('../validators/order.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         destinationId:
 *           type: integer
 *           example: 3
 *         productId:
 *           type: integer
 *           example: 1
 *         quantity:
 *           type: number
 *           example: 5000
 *         status:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, failed]
 *           example: assigned
 *         assignedDriverId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         assignedDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         destination:
 *           $ref: '#/components/schemas/Location'
 *         product:
 *           $ref: '#/components/schemas/Product'
 *         assignedDriver:
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
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, failed]
 *       - in: query
 *         name: driverId
 *         schema:
 *           type: integer
 *         description: Filter by assigned driver
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by assigned date
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', validate(orderValidator.getByStatus), orderController.getAll);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order found with attempt history
 *       404:
 *         description: Order not found
 */
router.get('/:id', parseId(), orderController.getById);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationId
 *               - productId
 *               - quantity
 *             properties:
 *               destinationId:
 *                 type: integer
 *                 description: Terminal location ID
 *                 example: 3
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 example: 5000
 *               assignedDriverId:
 *                 type: integer
 *                 description: Optional - assign driver immediately
 *               assignedDate:
 *                 type: string
 *                 format: date
 *                 description: Required if assigning driver
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Destination or product not found
 */
router.post('/', validate(orderValidator.create), orderController.create);

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
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
 *               destinationId:
 *                 type: integer
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, in_progress, completed, failed]
 *     responses:
 *       200:
 *         description: Order updated
 *       404:
 *         description: Order not found
 */
router.put('/:id', parseId(), validate(orderValidator.update), orderController.update);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     description: Only pending orders can be deleted
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order is not pending
 */
router.delete('/:id', parseId(), orderController.remove);

/**
 * @swagger
 * /api/orders/{id}/assign:
 *   post:
 *     summary: Assign order to a driver
 *     tags: [Orders]
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
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *               assignedDate:
 *                 type: string
 *                 format: date
 *                 description: Defaults to today
 *     responses:
 *       200:
 *         description: Order assigned
 *       404:
 *         description: Order or driver not found
 *       409:
 *         description: Order already in progress or completed
 */
router.post('/:id/assign', parseId(), validate(orderValidator.assign), orderController.assign);

/**
 * @swagger
 * /api/orders/{id}/start:
 *   post:
 *     summary: Start an order (driver begins delivery)
 *     description: |
 *       Driver starts working on the delivery.
 *       - Requires: active shift for the driver
 *       - Order must be in 'assigned' status
 *       - Creates an order attempt record
 *     tags: [Orders]
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
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Order started
 *       400:
 *         description: No active shift or order not assigned to driver
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order not in assigned status
 */
router.post('/:id/start', parseId(), validate(orderValidator.startOrder), orderController.startOrder);

/**
 * @swagger
 * /api/orders/{id}/complete:
 *   post:
 *     summary: Complete an order (delivery successful)
 *     description: |
 *       Driver marks delivery as completed.
 *       - Requires: active shift
 *       - Order must be in 'in_progress' status
 *       - **Automatically increases destination inventory** by the order quantity
 *     tags: [Orders]
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
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Order completed, inventory updated
 *       400:
 *         description: No active shift or order not assigned to driver
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order not in in_progress status
 */
router.post('/:id/complete', parseId(), validate(orderValidator.completeOrder), orderController.completeOrder);

/**
 * @swagger
 * /api/orders/{id}/fail:
 *   post:
 *     summary: Fail an order (delivery unsuccessful)
 *     description: |
 *       Driver marks delivery as failed with a reason.
 *       - Requires: active shift
 *       - Order must be in 'assigned' or 'in_progress' status
 *       - **Does NOT update inventory**
 *       - Reason is required (e.g., "Pump malfunction", "Customer refused")
 *     tags: [Orders]
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
 *             required:
 *               - driverId
 *               - reason
 *             properties:
 *               driverId:
 *                 type: integer
 *                 example: 1
 *               reason:
 *                 type: string
 *                 example: Customer site closed unexpectedly
 *     responses:
 *       200:
 *         description: Order marked as failed
 *       400:
 *         description: No active shift, order not assigned to driver, or missing reason
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order not in valid status for failing
 */
router.post('/:id/fail', parseId(), validate(orderValidator.failOrder), orderController.failOrder);

module.exports = router;
