const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const { globalAuthMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { specs, swaggerUi } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  historial: process.env.HISTORIAL_SERVICE_URL || 'http://localhost:3003',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Global auth middleware (except for auth endpoints)
app.use('/api', (req, res, next) => {
  // Skip auth for auth endpoints (register, login, etc.)
  if (req.path.startsWith('/api/auth/') && 
      (req.path.includes('/register') || req.path.includes('/login') || req.path.includes('/refresh'))) {
    return next();
  }
  return globalAuthMiddleware(req, res, next);
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'bff',
    timestamp: new Date().toISOString(),
    services: {
      auth: SERVICES.auth,
      patient: SERVICES.patient,
      historial: SERVICES.historial,
      inventory: SERVICES.inventory
    }
  });
});

// Proxy middleware for microservices
const authProxy = createProxyMiddleware({
  target: SERVICES.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    logger.error('Auth service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Auth service unavailable'
    });
  }
});

const patientProxy = createProxyMiddleware({
  target: SERVICES.patient,
  changeOrigin: true,
  pathRewrite: {
    '^/api/patients': '/api/patients'
  },
  onError: (err, req, res) => {
    logger.error('Patient service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Patient service unavailable'
    });
  }
});

const historialProxy = createProxyMiddleware({
  target: SERVICES.historial,
  changeOrigin: true,
  pathRewrite: {
    '^/api/historial': '/api/historial'
  },
  onError: (err, req, res) => {
    logger.error('Historial service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Historial service unavailable'
    });
  }
});

const inventoryProxy = createProxyMiddleware({
  target: SERVICES.inventory,
  changeOrigin: true,
  pathRewrite: {
    '^/api/inventory': '/api/inventory'
  },
  onError: (err, req, res) => {
    logger.error('Inventory service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Inventory service unavailable'
    });
  }
});

// Route proxies
app.use('/api/auth', authProxy);
app.use('/api/patients', patientProxy);
app.use('/api/historial', historialProxy);
app.use('/api/inventory', inventoryProxy);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  logger.info(`BFF service running on port ${PORT}`);
  logger.info('Proxy routes configured:');
  logger.info(`  /api/auth -> ${SERVICES.auth}`);
  logger.info(`  /api/patients -> ${SERVICES.patient}`);
  logger.info(`  /api/historial -> ${SERVICES.historial}`);
  logger.info(`  /api/inventory -> ${SERVICES.inventory}`);
});

module.exports = app;
