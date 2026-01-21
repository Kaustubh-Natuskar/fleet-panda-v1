const express = require('express');
const locationController = require('../controllers/location.controller');
const validate = require('../middleware/validate.middleware');
const { parseId } = require('../middleware/parseId.middleware');
const locationValidator = require('../validators/location.validator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Central Distribution Hub
 *         type:
 *           type: string
 *           enum: [hub, terminal]
 *           example: hub
 *         address:
 *           type: string
 *           example: 100 Industrial Blvd, Houston, TX
 *         latitude:
 *           type: number
 *           example: 29.7604
 *         longitude:
 *           type: number
 *           example: -95.3698
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations (hubs and terminals)
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [hub, terminal]
 *         description: Filter by location type
 *     responses:
 *       200:
 *         description: List of locations
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
 *                     $ref: '#/components/schemas/Location'
 */
router.get('/', validate(locationValidator.getByType), locationController.getAll);

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get location by ID (includes inventory)
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location with inventory details
 *       404:
 *         description: Location not found
 */
router.get('/:id', parseId(), locationController.getById);

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create a new location (hub or terminal)
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Terminal
 *               type:
 *                 type: string
 *                 enum: [hub, terminal]
 *                 example: terminal
 *               address:
 *                 type: string
 *                 example: 500 Port Road, Houston, TX
 *               latitude:
 *                 type: number
 *                 example: 29.7355
 *               longitude:
 *                 type: number
 *                 example: -95.2855
 *     responses:
 *       201:
 *         description: Location created
 *       400:
 *         description: Validation error
 */
router.post('/', validate(locationValidator.create), locationController.create);

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update a location
 *     tags: [Locations]
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
 *               type:
 *                 type: string
 *                 enum: [hub, terminal]
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated
 *       404:
 *         description: Location not found
 */
router.put('/:id', parseId(), validate(locationValidator.update), locationController.update);

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Delete a location
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Location deleted
 *       404:
 *         description: Location not found
 *       409:
 *         description: Location in use (has inventory or orders)
 */
router.delete('/:id', parseId(), locationController.remove);

module.exports = router;
