const pool = require('../database/connection');

/**
 * Log audit events to the audit_log table
 */
async function logAudit(userId, action, entityType, entityId, oldValues = null, newValues = null, req = null) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req ? req.ip : null,
        req ? req.get('user-agent') : null,
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

/**
 * Log user activity
 */
async function logActivity(userId, activity, module, details = null, req = null) {
  try {
    await pool.query(
      `INSERT INTO activity_log (user_id, activity, module, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, activity, module, details, req ? req.ip : null]
    );
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
}

module.exports = { logAudit, logActivity };
