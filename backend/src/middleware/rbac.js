const ApiResponse = require('../utils/apiResponse');

/**
 * Require specific roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required.');
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return ApiResponse.forbidden(res, 'You do not have the required role to access this resource.');
    }

    next();
  };
};

/**
 * Require specific permissions
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required.');
    }

    const hasPermission = permissions.every(perm => req.user.permissions.includes(perm));
    if (!hasPermission) {
      return ApiResponse.forbidden(res, 'You do not have the required permissions.');
    }

    next();
  };
};

/**
 * Require any of the specified permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required.');
    }

    const hasAnyPermission = permissions.some(perm => req.user.permissions.includes(perm));
    if (!hasAnyPermission) {
      return ApiResponse.forbidden(res, 'You do not have the required permissions.');
    }

    next();
  };
};

module.exports = { requireRole, requirePermission, requireAnyPermission };
