const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authService } = require('../middleware/auth');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Authenticate
    const result = await authService.login(username, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authenticate, (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    authService.logout(sessionId);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      session: authService.getSession(req.headers['x-session-id'])
    }
  });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticate, (req, res) => {
  try {
    const user = authService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new token with same user info
    const token = authService.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    });

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get('/users', authenticate, requireRole('admin', 'supervisor'), (req, res) => {
  try {
    const users = authService.getAllUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/users
 * Create new user (admin only)
 */
router.post('/users', authenticate, requireRole('admin'), [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'supervisor', 'operator', 'quality_inspector', 'viewer']).withMessage('Invalid role'),
  body('fullName').trim().notEmpty().withMessage('Full name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await authService.createUser(req.body, req.user.username);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/users/:username
 * Update user (admin only)
 */
router.put('/users/:username', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;

    const user = await authService.updateUser(username, updates, req.user.username);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/auth/users/:username
 * Delete user (admin only)
 */
router.delete('/users/:username', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { username } = req.params;
    
    authService.deleteUser(username, req.user.username);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/stats
 * Get authentication stats (admin only)
 */
router.get('/stats', authenticate, requireRole('admin'), (req, res) => {
  res.json({
    success: true,
    data: {
      sessions: authService.getSessionStats(),
      users: authService.getAllUsers().length
    }
  });
});

module.exports = router;
