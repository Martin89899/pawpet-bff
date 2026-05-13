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
  // Ensure request body is preserved for POST/PUT/PATCH requests
  onProxyReq: (proxyReq, req, res) => {
    // Log the request for debugging
    logger.info(`Proxying ${req.method} ${req.path} to ${SERVICES.auth}${req.path}`);
    
    // Preserve content-type and body
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.info(`Auth service response: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
  },
  onError: (err, req, res) => {
    logger.error('Auth service proxy error:', err);
    
    let message = 'Authentication service temporarily unavailable';
    let statusCode = 503;
    
    if (err.code === 'ECONNREFUSED') {
      message = 'Authentication service is not responding. Please try again later.';
    } else if (err.code === 'ETIMEDOUT') {
      message = 'Authentication service request timed out. Please try again.';
      statusCode = 504;
    } else if (err.code === 'ENOTFOUND') {
      message = 'Authentication service not found. Please contact support.';
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      service: 'authentication'
    });
  }
});

// Middleware to protect specific routes
const protectRoute = (req, res, next) => {
  // Skip auth for public auth routes
  const publicAuthRoutes = ['/register', '/login', '/refresh'];
  const pathSegments = req.path.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];
  
  if (req.path.startsWith('/api/auth/') && publicAuthRoutes.includes('/' + lastSegment)) {
    logger.info(`Skipping auth for public route: ${req.path}`);
    return next();
  }
  
  logger.info(`Applying auth middleware to: ${req.path}`);
  return globalAuthMiddleware(req, res, next);
};

const patientProxy = createProxyMiddleware({
  target: SERVICES.patient,
  changeOrigin: true,
  pathRewrite: {
    '^/api/patients': '/api/patients'
  },
  onError: (err, req, res) => {
    logger.error('Patient service proxy error:', err);
    
    let message = 'Patient service temporarily unavailable';
    let statusCode = 503;
    
    if (err.code === 'ECONNREFUSED') {
      message = 'Patient service is not responding. Please try again later.';
    } else if (err.code === 'ETIMEDOUT') {
      message = 'Patient service request timed out. Please try again.';
      statusCode = 504;
    } else if (err.code === 'ENOTFOUND') {
      message = 'Patient service not found. Please contact support.';
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      service: 'patients'
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
    
    let message = 'Medical history service temporarily unavailable';
    let statusCode = 503;
    
    if (err.code === 'ECONNREFUSED') {
      message = 'Medical history service is not responding. Please try again later.';
    } else if (err.code === 'ETIMEDOUT') {
      message = 'Medical history service request timed out. Please try again.';
      statusCode = 504;
    } else if (err.code === 'ENOTFOUND') {
      message = 'Medical history service not found. Please contact support.';
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      service: 'medical-history'
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
    
    let message = 'Inventory service temporarily unavailable';
    let statusCode = 503;
    
    if (err.code === 'ECONNREFUSED') {
      message = 'Inventory service is not responding. Please try again later.';
    } else if (err.code === 'ETIMEDOUT') {
      message = 'Inventory service request timed out. Please try again.';
      statusCode = 504;
    } else if (err.code === 'ENOTFOUND') {
      message = 'Inventory service not found. Please contact support.';
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      service: 'inventory'
    });
  }
});

// Route proxies
app.use('/api/auth', authProxy);
app.use('/api/patients', protectRoute, patientProxy);
app.use('/api/historial', protectRoute, historialProxy);
app.use('/api/inventory', protectRoute, inventoryProxy);

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
