'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fleet Tracking API',
      version: '1.0.0',
      description: `
      `,
      contact: {
        name: 'FuelPanda Engineering',
      },
    },
    servers: [
      {
        url: '/',
        description: 'API Server',
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
