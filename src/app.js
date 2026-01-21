const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorMiddleware = require('./middleware/error.middleware');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

// Import routes
const productRoutes = require('./routes/product.routes');
const locationRoutes = require('./routes/location.routes');
const driverRoutes = require('./routes/driver.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const allocationRoutes = require('./routes/allocation.routes');
const shiftRoutes = require('./routes/shift.routes');
const orderRoutes = require('./routes/order.routes');
const gpsRoutes = require('./routes/gps.routes');
const fleetRoutes = require('./routes/fleet.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Fleet Tracking API Docs',
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readme route
app.get('/readme', async (req, res, next) => {
  try {
    const readmePath = path.join(process.cwd(), 'README.md');
    const markdown = await fs.readFile(readmePath, 'utf8');
    const html = marked(`<body style="display: flex; justify-content: center; align-items: center; flex-direction: column;">${markdown}</body>`);
    res.send(html);
  } catch (error) {
    next(error);
  }
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/fleet', fleetRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;
