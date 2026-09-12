/**
 * Authentication Service
 * 
 * Handles user authentication, JWT tokens, and session management
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'AuthService' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class AuthService {
  constructor(config = {}) {
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET || '';
if (!this.jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
if (!this.jwtSecret) {
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable for production use.');
  this.jwtSecret = 'dev-only-secret-do-not-use-in-production';
}
    this.jwtExpiry = config.jwtExpiry || '8h';
    this.sessions = new Map(); // In-memory session store (use Redis in production)
    
    // Default users (in production, these would come from ERPNext or database)
    this.users = new Map([
      ['admin', {
        id: 'user-001',
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        email: 'admin@battery-recycling.com',
        role: 'admin',
        permissions: ['*'],
        fullName: 'System Administrator',
        createdAt: new Date()
      }],
      ['operator', {
        id: 'user-002',
        username: 'operator',
        password: bcrypt.hashSync('operator123', 10),
        email: 'operator@battery-recycling.com',
        role: 'operator',
        permissions: ['work_orders:*', 'battery_receipt:*', 'quality_check:*', 'material_recovery:*'],
        fullName: 'Shop Floor Operator',
        createdAt: new Date()
      }],
      ['supervisor', {
        id: 'user-003',
        username: 'supervisor',
        password: bcrypt.hashSync('supervisor123', 10),
        email: 'supervisor@battery-recycling.com',
        role: 'supervisor',
        permissions: ['*'],
        fullName: 'Production Supervisor',
        createdAt: new Date()
      }],
      ['quality', {
        id: 'user-004',
        username: 'quality',
        password: bcrypt.hashSync('quality123', 10),
        email: 'quality@battery-recycling.com',
        role: 'quality_inspector',
        permissions: ['quality_check:*', 'traceability:view', 'reports:view'],
        fullName: 'Quality Inspector',
        createdAt: new Date()
      }]
    ]);
  }

  /**
   * Authenticate user with username and password
   */
  async login(username, password) {
    try {
      const user = this.users.get(username);
      
      if (!user) {
        logger.warn('Login attempt for unknown user', { username });
        throw new Error('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        logger.warn('Invalid password for user', { username });
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      // Create session
      const sessionId = uuidv4();
      this.sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        role: user.role,
        createdAt: new Date(),
        lastActivity: new Date(),
        token
      });

      logger.info('User logged in successfully', { username, sessionId });

      return {
        token,
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          permissions: user.permissions
        },
        expiresAt: new Date(Date.now() + (8 * 60 * 60 * 1000)).toISOString() // 8 hours
      };
    } catch (error) {
      logger.error('Login failed', { username, error: error.message });
      throw error;
    }
  }

  /**
   * Logout user and invalidate session
   */
  logout(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      logger.info('User logged out', { sessionId, username: session.username });
      return { success: true };
    }
    throw new Error('Invalid session');
  }

  /**
   * Verify JWT token and return user info
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      logger.warn('Token verification failed', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity
   */
  touchSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user, permission) {
    if (!user || !user.permissions) return false;
    
    // Wildcard permission
    if (user.permissions.includes('*')) return true;
    
    // Check specific permission
    return user.permissions.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        return permission.startsWith(prefix);
      }
      return false;
    });
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        const { password, ...safeUser } = user;
        return safeUser;
      }
    }
    return null;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers() {
    return Array.from(this.users.values()).map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData, createdBy) {
    const { username, password, email, role, fullName } = userData;
    
    if (this.users.has(username)) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user-${uuidv4()}`;
    
    const newUser = {
      id: userId,
      username,
      password: hashedPassword,
      email,
      role,
      permissions: this.getDefaultPermissionsForRole(role),
      fullName,
      createdAt: new Date(),
      createdBy
    };

    this.users.set(username, newUser);
    
    logger.info('New user created', { username, createdBy, role });
    
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * Update user (admin only)
   */
  async updateUser(username, updates, updatedBy) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (updates.role && updates.role !== user.role) {
      updates.permissions = this.getDefaultPermissionsForRole(updates.role);
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date(), updatedBy };
    this.users.set(username, updatedUser);

    logger.info('User updated', { username, updatedBy });

    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(username, deletedBy) {
    if (username === 'admin') {
      throw new Error('Cannot delete admin user');
    }

    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }

    this.users.delete(username);
    logger.info('User deleted', { username, deletedBy });

    return { success: true };
  }

  /**
   * Get default permissions for role
   */
  getDefaultPermissionsForRole(role) {
    const permissions = {
      admin: ['*'],
      supervisor: ['*'],
      operator: ['work_orders:*', 'battery_receipt:*', 'quality_check:*', 'material_recovery:*', 'traceability:view'],
      quality_inspector: ['quality_check:*', 'traceability:view', 'reports:view'],
      viewer: ['*:view']
    };
    return permissions[role] || permissions.viewer;
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        logger.debug('Cleaned up expired session', { sessionId });
      }
    }
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount() {
    return this.sessions.size;
  }

  /**
   * Get session stats
   */
  getSessionStats() {
    const now = Date.now();
    const recent = Array.from(this.sessions.values())
      .filter(s => now - s.lastActivity.getTime() < 5 * 60 * 1000) // 5 min
      .length;

    return {
      total: this.sessions.size,
      activeRecently: recent
    };
  }
}

module.exports = AuthService;
