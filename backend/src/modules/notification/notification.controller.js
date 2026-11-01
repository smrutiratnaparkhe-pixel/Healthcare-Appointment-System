const pool = require('../../database/connection');
const ApiResponse = require('../../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

exports.getNotifications = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
    const [countRes] = await pool.query('SELECT COUNT(*) as total FROM notification WHERE user_id = ?', [req.user.id]);
    const [notifications] = await pool.query(
      'SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );
    return ApiResponse.paginated(res, notifications, getPaginationMeta(countRes[0].total, page, limit));
  } catch (error) { next(error); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM notification WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    return ApiResponse.success(res, { count: result[0].count });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notification SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return ApiResponse.success(res, null, 'Notification marked as read');
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notification SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    return ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) { next(error); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM notification WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return ApiResponse.success(res, null, 'Notification deleted');
  } catch (error) { next(error); }
};
