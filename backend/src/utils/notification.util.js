const pool = require('../database/connection');

/**
 * Creates a notification for a user
 * @param {number} userId - The ID of the user to receive the notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - 'appointment', 'report', 'system', 'reminder', 'access'
 * @param {string} referenceType - 'appointment', 'report', etc.
 * @param {number} referenceId - The ID of the referenced entity
 */
exports.createNotification = async (userId, title, message, type = 'system', referenceType = null, referenceId = null) => {
  try {
    const query = `
      INSERT INTO notification (user_id, title, message, type, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [userId, title, message, type, referenceType, referenceId]);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
