'use strict';

const prisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Inventory Service
 * Handles all business logic for inventory operations
 */

const getAll = async () => {
  return prisma.inventory.findMany({
    include: {
      location: true,
      product: true,
    },
    orderBy: [{ locationId: 'asc' }, { productId: 'asc' }],
  });
};

const getById = async (id) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      location: true,
      product: true,
    },
  });

  if (!inventory) {
    throw new NotFoundError(`Inventory record with ID ${id} not found`);
  }

  return inventory;
};

const getByLocation = async (locationId) => {
  locationId = parseInt(locationId);
  // Verify location exists
  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });

  if (!location) {
    throw new NotFoundError(`Location with ID ${locationId} not found`);
  }

  return prisma.inventory.findMany({
    where: { locationId },
    include: {
      product: true,
    },
  });
};

/**
 * Create or update inventory (upsert)
 * If inventory exists for location+product, update quantity
 * Otherwise, create new record
 */
const upsert = async ({ locationId, productId, quantity }) => {
  locationId = parseInt(locationId, 10);
  productId = parseInt(productId, 10);
  // Verify location and product exist
  const [location, product] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);

  if (!location) {
    throw new NotFoundError(`Location with ID ${locationId} not found`);
  }
  if (!product) {
    throw new NotFoundError(`Product with ID ${productId} not found`);
  }

  return prisma.inventory.upsert({
    where: {
      locationId_productId: { locationId, productId },
    },
    update: { quantity },
    create: { locationId, productId, quantity },
    include: {
      location: true,
      product: true,
    },
  });
};

/**
 * Adjust inventory quantity (add or subtract)
 */
const adjust = async (id, adjustment, reason = null) => {
  const inventory = await getById(id);

  const newQuantity = inventory.quantity + adjustment;
  if (newQuantity < 0) {
    throw new ValidationError(
      `Cannot adjust: would result in negative quantity (${newQuantity})`
    );
  }

  // Log adjustment for audit trail (in production, use a separate audit table)
  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `Inventory adjustment: ID=${id}, change=${adjustment}, reason=${reason || 'N/A'}`
    );
  }

  return prisma.inventory.update({
    where: { id },
    data: { quantity: newQuantity },
    include: {
      location: true,
      product: true,
    },
  });
};

/**
 * Internal function to increase inventory (used by order completion)
 */
const increaseByLocationAndProduct = async (locationId, productId, quantity) => {
  return prisma.inventory.upsert({
    where: {
      locationId_productId: { locationId, productId },
    },
    update: {
      quantity: { increment: quantity },
    },
    create: {
      locationId,
      productId,
      quantity: quantity,
    },
  });
};

module.exports = {
  getAll,
  getById,
  getByLocation,
  upsert,
  adjust,
  increaseByLocationAndProduct,
};
