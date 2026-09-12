/**
 * Authentication Middleware
 * 
 * Protects routes with JWT authentication and role-based access control
 */

const AuthService = require('../services/auth');

const authService = new AuthService();

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    if (!roles.includes(req.user.role) && !req.user.permissions.includes('*')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 * Checks if user has required permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    if (!authService.hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        required: permission,
        role: req.user.role
      });
    }

    next();
  };
}

/**
 * Optional authentication
 * Attaches user if token is present, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = authService.verifyToken(token);
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions
      };
    }

    next();
  } catch (error) {
    // Token invalid, but continue without user
    next();
  }
}

/**
 * Get current user from request
 * Use this in route handlers after authenticate middleware
 */
function getCurrentUser(req) {
  return req.user;
}

/**
 * Check if current user has permission
 */
function can(req, permission) {
  if (!req.user) return false;
  return authService.hasPermission(req.user, permission);
}

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth,
  getCurrentUser,
  can,
  authService
};
