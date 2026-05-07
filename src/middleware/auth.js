const jwt = require('jsonwebtoken');
const axios = require('axios');
const { logger } = require('../utils/logger');

const globalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token by calling auth service
    const authResponse = await axios.get(
      `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/auth/verify`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000 // 5 seconds timeout
      }
    );

    if (!authResponse.data.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Add user info to request for downstream services
    req.user = authResponse.data.data.user;
    
    // Forward the authorization header to downstream services
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-email'] = req.user.email;
    req.headers['x-user-role'] = req.user.role;
    
    logger.info(`User authenticated: ${req.user.email} (${req.user.role})`);
    next();
  } catch (error) {
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    if (error.code === 'ECONNABORTED') {
      logger.error('Auth service timeout');
      return res.status(503).json({
        success: false,
        message: 'Authentication service timeout'
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service unavailable'
    });
  }
};

// Middleware to add user context to proxy requests
const addUserContext = (proxyReq, req, res) => {
  if (req.user) {
    proxyReq.setHeader('X-User-ID', req.user.id);
    proxyReq.setHeader('X-User-Email', req.user.email);
    proxyReq.setHeader('X-User-Role', req.user.role);
  }
};

module.exports = { globalAuthMiddleware, addUserContext };
