const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fleet Tracking API',
      version: '1.0.0',
      description: `
## FuelPanda Fleet Tracking Platform

Real-time fleet, driver, and delivery tracking API for fuel logistics operations.

### Key Features
- **Vehicle Management**: Track and manage fuel tanker fleet
- **Driver Management**: Manage drivers and their assignments
- **Vehicle Allocation**: Assign vehicles to drivers with blocking mechanism
- **Shift Management**: Track driver shifts with start/end times
- **Order Management**: Full delivery lifecycle (create → assign → start → complete/fail)
- **GPS Tracking**: Real-time vehicle location updates
- **Inventory Management**: Track fuel inventory at hubs and terminals

### Business Rules
1. **Vehicle Blocking**: A vehicle can only be allocated to ONE driver per day
2. **Driver Allocation**: A driver can only have ONE vehicle per day
3. **Shift Requirements**: Driver must have vehicle allocated to start shift
4. **GPS Requirements**: Vehicle must have active shift to record GPS
5. **Order Completion**: Automatically updates destination inventory
6. **Shift End Blocking**: Cannot end shift with incomplete orders

### Typical Workflow
1. Admin creates locations (hubs/terminals), products, drivers, vehicles
2. Admin sets up inventory at hubs
3. Admin allocates vehicle to driver for a date
4. Admin creates orders and assigns to drivers
5. Driver starts shift (requires allocation)
6. Driver starts order → completes/fails order
7. Driver marks all orders complete/failed → ends shift

      `,
      contact: {
        name: 'FuelPanda Engineering',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Products', description: 'Fuel products (Diesel, Petrol, etc.)' },
      { name: 'Locations', description: 'Hubs and terminals' },
      { name: 'Drivers', description: 'Driver management' },
      { name: 'Vehicles', description: 'Fleet vehicles' },
      { name: 'Inventory', description: 'Fuel inventory at locations' },
      { name: 'Allocations', description: 'Vehicle-to-driver assignments' },
      { name: 'Shifts', description: 'Driver shift management' },
      { name: 'Orders', description: 'Delivery orders' },
      { name: 'GPS', description: 'Vehicle location tracking' },
      { name: 'Fleet', description: 'Real-time fleet status' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
