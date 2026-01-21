const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (in reverse order of dependencies)
  await prisma.gpsLocation.deleteMany();
  await prisma.orderAttempt.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.vehicleAllocation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.location.deleteMany();
  await prisma.product.deleteMany();

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Diesel', unit: 'gallons' } }),
    prisma.product.create({ data: { name: 'Petrol', unit: 'gallons' } }),
    prisma.product.create({ data: { name: 'Premium Petrol', unit: 'gallons' } }),
  ]);
  console.log(`✅ Created ${products.length} products`);
  products.forEach(p => console.log(`   - [${p.id}] ${p.name}`));

  // ============================================================================
  // LOCATIONS (Hubs and Terminals)
  // ============================================================================
  const locations = await Promise.all([
    // Hubs (distribution centers)
    prisma.location.create({
      data: {
        name: 'Central Distribution Hub',
        type: 'hub',
        address: '100 Industrial Blvd, Houston, TX 77001',
        latitude: 29.7604,
        longitude: -95.3698,
      },
    }),
    prisma.location.create({
      data: {
        name: 'North Hub',
        type: 'hub',
        address: '500 North Freeway, Houston, TX 77022',
        latitude: 29.8168,
        longitude: -95.3599,
      },
    }),
    // Terminals (delivery destinations)
    prisma.location.create({
      data: {
        name: 'Terminal A - Downtown',
        type: 'terminal',
        address: '200 Main Street, Houston, TX 77002',
        latitude: 29.7589,
        longitude: -95.3677,
      },
    }),
    prisma.location.create({
      data: {
        name: 'Terminal B - Airport',
        type: 'terminal',
        address: '300 Airport Blvd, Houston, TX 77032',
        latitude: 29.9902,
        longitude: -95.3368,
      },
    }),
    prisma.location.create({
      data: {
        name: 'Terminal C - Port',
        type: 'terminal',
        address: '400 Port Road, Houston, TX 77015',
        latitude: 29.7355,
        longitude: -95.2855,
      },
    }),
  ]);
  console.log(`\n✅ Created ${locations.length} locations`);
  locations.forEach(l => console.log(`   - [${l.id}] ${l.name} (${l.type})`));

  // ============================================================================
  // DRIVERS
  // ============================================================================
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: 'John Smith',
        phone: '555-0101',
        email: 'john.smith@fuelpanda.com',
        licenseNumber: 'TX-CDL-001',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'Maria Garcia',
        phone: '555-0102',
        email: 'maria.garcia@fuelpanda.com',
        licenseNumber: 'TX-CDL-002',
      },
    }),
    prisma.driver.create({
      data: {
        name: 'James Wilson',
        phone: '555-0103',
        email: 'james.wilson@fuelpanda.com',
        licenseNumber: 'TX-CDL-003',
      },
    }),
  ]);
  console.log(`\n✅ Created ${drivers.length} drivers`);
  drivers.forEach(d => console.log(`   - [${d.id}] ${d.name}`));

  // ============================================================================
  // VEHICLES
  // ============================================================================
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TX-FP-001',
        fuelType: 'diesel',
        capacityGallons: 8000,
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TX-FP-002',
        fuelType: 'diesel',
        capacityGallons: 8000,
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TX-FP-003',
        fuelType: 'diesel',
        capacityGallons: 5000,
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'TX-FP-004',
        fuelType: 'diesel',
        capacityGallons: 10000,
      },
    }),
  ]);
  console.log(`\n✅ Created ${vehicles.length} vehicles`);
  vehicles.forEach(v => console.log(`   - [${v.id}] ${v.registrationNumber} (${v.capacityGallons} gal)`));

  // ============================================================================
  // INVENTORY (Initial stock at hubs)
  // ============================================================================
  const inventories = await Promise.all([
    // Central Hub inventory
    prisma.inventory.create({
      data: { locationId: locations[0].id, productId: products[0].id, quantityGallons: 50000 },
    }),
    prisma.inventory.create({
      data: { locationId: locations[0].id, productId: products[1].id, quantityGallons: 30000 },
    }),
    prisma.inventory.create({
      data: { locationId: locations[0].id, productId: products[2].id, quantityGallons: 15000 },
    }),
    // North Hub inventory
    prisma.inventory.create({
      data: { locationId: locations[1].id, productId: products[0].id, quantityGallons: 40000 },
    }),
    prisma.inventory.create({
      data: { locationId: locations[1].id, productId: products[1].id, quantityGallons: 25000 },
    }),
    // Terminal A - some existing inventory
    prisma.inventory.create({
      data: { locationId: locations[2].id, productId: products[0].id, quantityGallons: 5000 },
    }),
  ]);
  console.log(`\n✅ Created ${inventories.length} inventory records`);

  // ============================================================================
  // SAMPLE ALLOCATION FOR TODAY
  // ============================================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allocation = await prisma.vehicleAllocation.create({
    data: {
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      allocationDate: today,
    },
  });
  console.log(`\n✅ Created sample allocation for today`);
  console.log(`   - Vehicle ${vehicles[0].registrationNumber} → Driver ${drivers[0].name}`);

  // ============================================================================
  // SAMPLE ORDER
  // ============================================================================
  const order = await prisma.order.create({
    data: {
      destinationId: locations[2].id, // Terminal A
      productId: products[0].id, // Diesel
      quantityGallons: 5000,
      status: 'assigned',
      assignedDriverId: drivers[0].id,
      assignedDate: today,
    },
  });
  console.log(`\n✅ Created sample order`);
  console.log(`   - [${order.id}] ${order.quantityGallons} gal to ${locations[2].name}`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Database seeded successfully!');
  console.log('='.repeat(60));
  console.log('\nQuick Start:');
  console.log(`  1. Allocation exists for Driver ${drivers[0].id} (${drivers[0].name}) today`);
  console.log(`  2. Order ${order.id} is assigned to this driver`);
  console.log(`  3. Start shift: POST /api/shifts/start {"driverId": ${drivers[0].id}}`);
  console.log(`  4. Start order: POST /api/orders/${order.id}/start {"driverId": ${drivers[0].id}}`);
  console.log(`  5. Complete:    POST /api/orders/${order.id}/complete {"driverId": ${drivers[0].id}}`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
