const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Location Service
 * Handles all business logic for hub and terminal operations
 */

const getAll = async (type = null) => {
  const where = type ? { type } : {};
  return prisma.location.findMany({
    where,
    orderBy: { name: 'asc' },
  });
};

const getById = async (id) => {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      inventories: {
        include: { product: true },
      },
    },
  });

  if (!location) {
    throw new NotFoundError(`Location with ID ${id} not found`);
  }

  return location;
};

const create = async (data) => {
  return prisma.location.create({ data });
};

const update = async (id, data) => {
  await getById(id);

  return prisma.location.update({
    where: { id },
    data,
  });
};

const remove = async (id) => {
  await getById(id);

  // Check if location is in use
  const [inventoryCount, orderCount] = await Promise.all([
    prisma.inventory.count({ where: { locationId: id } }),
    prisma.order.count({ where: { destinationId: id } }),
  ]);

  if (inventoryCount > 0 || orderCount > 0) {
    throw new ConflictError(
      `Cannot delete location: it has ${inventoryCount} inventory records and ${orderCount} orders`
    );
  }

  await prisma.location.delete({ where: { id } });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
