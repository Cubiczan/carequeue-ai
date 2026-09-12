/**
 * Battery ERP Integration API Gateway
 * 
 * Central hub for all integrations:
 * - ERPNext ↔ Carbon sync
 * - Xero ↔ ERPNext accounting sync
 * - Precoro ↔ ERPNext procurement sync
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createClient } = require('redis');
const winston = require('winston');
const cookieParser = require('cookie-parser');
const { applySecurityMiddleware } = require('./middleware/security');

// Import routes
const healthRoutes = require('./routes/health');
const xeroRoutes = require('./routes/xero');
const precoroRoutes = require('./routes/precoro');
const carbonRoutes = require('./routes/carbon');
const syncRoutes = require('./routes/sync');
const webhookRoutes = require('./routes/webhooks');
const astraRoutes = require('./routes/astra');
const authRoutes = require('./routes/auth');
const barcodeRoutes = require('./routes/barcode');
const hazmatRoutes = require('./routes/hazmat');
const inventoryRoutes = require('./routes/inventory');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Redis connection
let redisClient;
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    await redisClient.connect();
    logger.info('Connected to Redis');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    // Continue without Redis for development
    return null;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'battery-erp-integrations',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/hazmat', hazmatRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/xero', xeroRoutes);
app.use('/api/precoro', precoroRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/astra', astraRoutes);

// Session cleanup interval (every hour)
setInterval(() => {
  const AuthService = require('./services/auth');
  const authService = new AuthService();
  authService.cleanupSessions();
}, 60 * 60 * 1000);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectRedis();
    
    // Initialize Astra DB
    const AstraDBClient = require('./clients/astradb');
    const astraDB = new AstraDBClient({
      keyspace: process.env.ASTRA_KEYSPACE || 'battery_erp',
      contactPoint: process.env.ASTRA_CONTACT_POINT,
      datacenter: process.env.ASTRA_DATACENTER || 'us-east-2',
      username: process.env.ASTRA_USERNAME,
      password: process.env.ASTRA_PASSWORD
    });
    
    if (process.env.ASTRA_DB_ID) {
      try {
        await astraDB.connect();
        logger.info('Astra DB connected successfully');
        // Make astraDB available globally
        app.set('astraDB', astraDB);
      } catch (error) {
        logger.warn('Astra DB connection failed, continuing without it', error.message);
      }
    } else {
      logger.warn('Astra DB not configured, skipping connection');
    }
    
    app.listen(PORT, () => {
      logger.info(`Integration API Gateway running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API endpoints:`);
      logger.info(`  - /api/xero/* - Xero integration`);
      logger.info(`  - /api/precoro/* - Precoro integration`);
      logger.info(`  - /api/carbon/* - Carbon integration`);
      logger.info(`  - /api/sync/* - Sync status & controls`);
      logger.info(`  - /api/webhooks/* - Webhook receivers`);
      logger.info(`  - /api/astra/* - Astra DB queries`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
