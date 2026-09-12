/**
 * Security Hardening Middleware
 * 
 * Production security enhancements for the Battery ERP API
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'Security' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' })
  ]
});

/**
 * Security audit logging middleware
 */
function securityAuditLog(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log suspicious activities
    if (res.statusCode >= 400) {
      logger.warn('Security Event', {
        type: 'failed_request',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration_ms: duration,
        ip: req.ip,
        user_agent: req.get('user-agent'),
        user: req.user?.username || 'anonymous'
      });
    }
    
    // Log authentication events
    if (req.url.includes('/auth/')) {
      logger.info('Auth Event', {
        type: 'authentication',
        action: req.url,
        method: req.method,
        status: res.statusCode,
        ip: req.ip,
        user: req.user?.username || 'anonymous'
      });
    }
  });
  
  next();
}

/**
 * Rate limiting configuration
 */
function createRateLimiter() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        user_agent: req.get('user-agent')
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
}

/**
 * Stricter rate limiter for auth endpoints
 */
function createAuthRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded - possible brute force', {
        ip: req.ip,
        url: req.url,
        user_agent: req.get('user-agent')
      });
      
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    }
  });
}

/**
 * Configure CORS for production
 */
function configureCORS() {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'];
  
  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  });
}

/**
 * Security headers and protections
 */
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  });
}

/**
 * Input validation and sanitization
 */
function inputProtection() {
  return [
    xss(), // Prevent XSS attacks
    hpp()  // Prevent HTTP Parameter Pollution
  ];
}

/**
 * Request ID middleware for tracing
 */
function requestIdMiddleware(req, res, next) {
  const crypto = require('crypto');
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * IP blocking middleware (for known bad actors)
 */
function ipBlocking() {
  const blockedIPs = new Set();
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (blockedIPs.has(clientIP)) {
      logger.warn('Blocked IP attempt', { ip: clientIP });
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    next();
  };
}

/**
 * Add security event emitter for dynamic blocking
 */
function setupSecurityEventEmitter(app) {
  const blockedIPs = new Map();
  
  app.on('security:block_ip', (ip, duration = 3600000) => {
    blockedIPs.set(ip, Date.now() + duration);
    logger.warn('IP blocked', { ip, duration_ms: duration });
  });
  
  // Cleanup expired blocks periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, expiry] of blockedIPs.entries()) {
      if (expiry < now) {
        blockedIPs.delete(ip);
      }
    }
  }, 60000); // Every minute
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (blockedIPs.has(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    next();
  };
}

/**
 * Apply all security middleware to app
 */
function applySecurityMiddleware(app) {
  // Basic security headers
  app.use(securityHeaders());
  
  // CORS configuration
  app.use(configureCORS());
  
  // Rate limiting (general)
  app.use('/api/', createRateLimiter());
  
  // Stricter rate limiting for auth
  app.use('/api/auth/', createAuthRateLimiter());
  
  // Input protection
  app.use(inputProtection());
  
  // Security audit logging
  app.use(securityAuditLog);
  
  // Request ID for tracing
  app.use(requestIdMiddleware);
  
  // IP blocking
  app.use(ipBlocking());
  
  // Setup security event emitter
  setupSecurityEventEmitter(app);
  
  logger.info('Security middleware applied successfully');
}

module.exports = {
  applySecurityMiddleware,
  createRateLimiter,
  createAuthRateLimiter,
  configureCORS,
  securityHeaders,
  securityAuditLog,
  inputProtection
};
