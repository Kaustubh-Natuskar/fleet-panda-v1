const prisma = require('../utils/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Vehicle Service
 * Handles all business logic for vehicle operations
 */

const getAll = async () => {
  return prisma.vehicle.findMany({
    orderBy: { registrationNumber: 'asc' },
  });
};

const getById = async (id) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    throw new NotFoundError(`Vehicle with ID ${id} not found`);
  }

  return vehicle;
};

const create = async (data) => {
  try {
    return await prisma.vehicle.create({ data });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(
        `Vehicle with registration '${data.registrationNumber}' already exists`
      );
    }
    throw error;
  }
};

const update = async (id, data) => {
  await getById(id);

  try {
    return await prisma.vehicle.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictError(
        `Vehicle with registration '${data.registrationNumber}' already exists`
      );
    }
    throw error;
  }
};

const remove = async (id) => {
  await getById(id);

  // Check if vehicle has allocations
  const allocationCount = await prisma.vehicleAllocation.count({
    where: { vehicleId: id },
  });

  if (allocationCount > 0) {
    throw new ConflictError(
      `Cannot delete vehicle: it has ${allocationCount} allocation records`
    );
  }

  await prisma.vehicle.delete({ where: { id } });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
