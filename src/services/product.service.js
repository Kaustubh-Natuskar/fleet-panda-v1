'use strict';

const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Product Service
 * Handles all business logic for product operations
 */

const getAll = async () => {
  return prisma.product.findMany({
    orderBy: { name: 'asc' },
  });
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new NotFoundError(`Product with ID ${id} not found`);
  }

  return product;
};

const create = async (data) => {
  try {
    return await prisma.product.create({ data });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(`Product with name '${data.name}' already exists`);
    }
    throw error;
  }
};

const update = async (id, data) => {
  // Check if product exists
  await getById(id);

  try {
    return await prisma.product.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(`Product with name '${data.name}' already exists`);
    }
    throw error;
  }
};

const remove = async (id) => {
  // Check if product exists
  await getById(id);

  // Check if product is in use
  const [inventoryCount, orderCount] = await Promise.all([
    prisma.inventory.count({ where: { productId: id } }),
    prisma.order.count({ where: { productId: id } }),
  ]);

  if (inventoryCount > 0 || orderCount > 0) {
    throw new ConflictError(
      `Cannot delete product: it has ${inventoryCount} inventory records and ${orderCount} orders`
    );
  }

  await prisma.product.delete({ where: { id } });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
