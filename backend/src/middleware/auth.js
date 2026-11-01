const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../database/connection');
const ApiResponse = require('../utils/apiResponse');

/**
 * Authenticate JWT token from cookies or Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check cookies first, then Authorization header
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.unauthorized(res, 'Authentication required. Please login.');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user exists and is active
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.is_verified
       FROM user u WHERE u.id = ? AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return ApiResponse.unauthorized(res, 'User not found or account deactivated.');
    }

    // Get user roles
    const [roles] = await pool.query(
      `SELECT r.id, r.name FROM role r
       INNER JOIN user_role ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [decoded.userId]
    );

    // Get user permissions
    const [permissions] = await pool.query(
      `SELECT DISTINCT p.name FROM permission p
       INNER JOIN role_permission rp ON p.id = rp.permission_id
       INNER JOIN user_role ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?`,
      [decoded.userId]
    );

    req.user = {
      id: users[0].id,
      email: users[0].email,
      firstName: users[0].first_name,
      lastName: users[0].last_name,
      isActive: users[0].is_active,
      isVerified: users[0].is_verified,
      roles: roles.map(r => r.name),
      roleIds: roles.map(r => r.id),
      permissions: permissions.map(p => p.name),
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token expired. Please refresh your token.');
    }
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid token.');
    }
    return ApiResponse.error(res, 'Authentication failed.');
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const [users] = await pool.query(
        'SELECT id, email, first_name, last_name FROM user WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );
      if (users.length > 0) {
        const [roles] = await pool.query(
          `SELECT r.name FROM role r INNER JOIN user_role ur ON r.id = ur.role_id WHERE ur.user_id = ?`,
          [decoded.userId]
        );
        req.user = {
          id: users[0].id,
          email: users[0].email,
          firstName: users[0].first_name,
          lastName: users[0].last_name,
          roles: roles.map(r => r.name),
        };
      }
    }
  } catch (error) {
    // Silently continue without auth
  }
  next();
};

module.exports = { authenticate, optionalAuth };
