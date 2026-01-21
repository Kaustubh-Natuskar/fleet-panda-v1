const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const validate = require('../middleware/validate.middleware');
const { parseId, parseIds } = require('../middleware/parseId.middleware');
const inventoryValidator = require('../validators/inventory.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         locationId:
 *           type: integer
 *           example: 1
 *         productId:
 *           type: integer
 *           example: 1
 *         quantityGallons:
 *           type: number
 *           example: 50000
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         product:
 *           $ref: '#/components/schemas/Product'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory records
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: List of all inventory records with location and product details
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
 *                     $ref: '#/components/schemas/Inventory'
 */
router.get('/', inventoryController.getAll);

/**
 * @swagger
 * /api/inventory/location/{locationId}:
 *   get:
 *     summary: Get inventory for a specific location
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Inventory at the location
 *       404:
 *         description: Location not found
 */
router.get('/location/:locationId', parseIds('locationId'), inventoryController.getByLocation);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get inventory record by ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventory record found
 *       404:
 *         description: Inventory record not found
 */
router.get('/:id', parseId(), inventoryController.getById);

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Set inventory (create or update)
 *     description: If inventory exists for the location+product combination, updates the quantity. Otherwise creates a new record.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - productId
 *               - quantityGallons
 *             properties:
 *               locationId:
 *                 type: integer
 *                 example: 1
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantityGallons:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       200:
 *         description: Inventory updated/created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Location or product not found
 */
router.post('/', validate(inventoryValidator.upsert), inventoryController.upsert);

/**
 * @swagger
 * /api/inventory/{id}/adjust:
 *   patch:
 *     summary: Adjust inventory quantity
 *     description: Add or subtract from current quantity. Useful for corrections.
 *     tags: [Inventory]
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
 *               - adjustment
 *             properties:
 *               adjustment:
 *                 type: number
 *                 description: Amount to add (positive) or subtract (negative)
 *                 example: -500
 *               reason:
 *                 type: string
 *                 example: Spillage during transfer
 *     responses:
 *       200:
 *         description: Inventory adjusted
 *       400:
 *         description: Would result in negative quantity
 *       404:
 *         description: Inventory record not found
 */
router.patch('/:id/adjust', parseId(), validate(inventoryValidator.adjust), inventoryController.adjust);

module.exports = router;
